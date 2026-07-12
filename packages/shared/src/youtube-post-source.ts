import type { PostSource, RawPost } from "./types";
import { IngestRateLimiter } from "./ingest-rate-limiter";
import { matchKeyword } from "./keywords";

export interface YouTubePostSourceOptions {
  keywords: string[];
  apiKey: string;
  prisma: any;
  maxQueueSize?: number;
  maxPerSecond?: number;
  batchSize?: number;
  dailyQuotaLimit?: number;
  searchIntervalHours?: number;
  commentPollIntervalMinutes?: number;
  pollReplies?: boolean;
  channels?: string[]; // list of target channel IDs to discover uploads from
}

export class YouTubePostSource implements PostSource {
  private readonly keywords: string[];
  private readonly apiKey: string;
  private readonly prisma: any;
  private readonly batchSize: number;
  private readonly dailyQuotaLimit: number;
  private readonly searchIntervalHours: number;
  private readonly commentPollIntervalMinutes: number;
  private readonly pollReplies: boolean;
  private readonly channels: string[];
  private readonly limiter: IngestRateLimiter<RawPost>;

  private stopped = false;
  private currentKeywordIndex = 0;
  private currentChannelIndex = 0;
  private deleteCallback?: (externalId: string) => void;
  private discoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: YouTubePostSourceOptions) {
    this.keywords = options.keywords;
    this.apiKey = options.apiKey;
    this.prisma = options.prisma;
    this.batchSize = options.batchSize ?? 10;
    this.dailyQuotaLimit = options.dailyQuotaLimit ?? 9000;
    this.searchIntervalHours = options.searchIntervalHours ?? 6;
    this.commentPollIntervalMinutes = options.commentPollIntervalMinutes ?? 10;
    this.pollReplies = options.pollReplies ?? false;
    this.channels = options.channels ?? [];

    this.limiter = new IngestRateLimiter<RawPost>(
      options.maxQueueSize ?? 500,
      options.maxPerSecond ?? 5,
      (post) => post.externalId,
    );

    this.startBackgroundLoops();
  }

  async fetchRecent(_keywords: string[], _sinceId?: string): Promise<RawPost[]> {
    return this.limiter.drain(this.batchSize);
  }

  getQueueDepth(): number {
    return this.limiter.pending;
  }

  onDelete(callback: (externalId: string) => void): void {
    this.deleteCallback = callback;
  }

  stop(): void {
    this.stopped = true;
    if (this.discoveryTimer) clearTimeout(this.discoveryTimer);
    if (this.pollTimer) clearTimeout(this.pollTimer);
  }

  private startBackgroundLoops(): void {
    // 1. Staggered Video Discovery Loop
    const totalDurationMs = this.searchIntervalHours * 3600 * 1000;
    const discoveryIntervalMs = Math.max(
      60 * 1000, // safety minimum: 1 minute
      totalDurationMs / Math.max(1, this.keywords.length),
    );

    const runDiscoveryTick = async () => {
      if (this.stopped) return;
      try {
        await this.runVideoDiscovery();
      } catch (err: any) {
        console.error("[YouTubePostSource] Discovery tick error:", err.message);
      } finally {
        this.discoveryTimer = setTimeout(runDiscoveryTick, discoveryIntervalMs);
      }
    };
    this.discoveryTimer = setTimeout(runDiscoveryTick, 5000); // start first check in 5s

    // 2. Comment Polling Loop
    const runPollTick = async () => {
      if (this.stopped) return;
      try {
        await this.pollNextVideos();
      } catch (err: any) {
        console.error("[YouTubePostSource] Polling tick error:", err.message);
      } finally {
        // Check every 30 seconds for next queue of due videos
        this.pollTimer = setTimeout(runPollTick, 30000);
      }
    };
    this.pollTimer = setTimeout(runPollTick, 10000); // start first poll in 10s
  }

  private async runVideoDiscovery(): Promise<void> {
    // We alternate discovery: if we have target channels, we query channels periodically;
    // otherwise we default to searching by keywords.
    const hasChannels = this.channels.length > 0;
    const shouldCheckChannel = hasChannels && (this.currentKeywordIndex % 2 === 0);

    if (shouldCheckChannel) {
      await this.runChannelVideoDiscovery();
    } else {
      await this.runKeywordVideoDiscovery();
    }
  }

  private async runChannelVideoDiscovery(): Promise<void> {
    if (this.channels.length === 0) return;

    const hasQuota = await this.checkAndAddQuota(100);
    if (!hasQuota) {
      console.warn("[YouTubePostSource] Quota limit reached/exceeded. Skipping channel video discovery.");
      return;
    }

    const channelId = this.channels[this.currentChannelIndex % this.channels.length]!;
    this.currentChannelIndex++;

    try {
      console.log(`[YouTubePostSource] Discovering recent videos for target channel: "${channelId}"`);
      const publishedAfter = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const url = new URL("https://www.googleapis.com/youtube/v3/search");
      url.searchParams.set("key", this.apiKey);
      url.searchParams.set("part", "snippet");
      url.searchParams.set("channelId", channelId);
      url.searchParams.set("type", "video");
      url.searchParams.set("order", "date");
      url.searchParams.set("publishedAfter", publishedAfter);
      url.searchParams.set("maxResults", "10");

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`YouTube API Channel Search returned status ${res.status}: ${res.statusText}`);
      }

      const data = (await res.json()) as any;
      const items = data.items || [];

      let added = 0;
      for (const item of items) {
        const videoId = item.id?.videoId;
        const titleRaw = item.snippet?.title;
        const publishedAtStr = item.snippet?.publishedAt;
        if (videoId && titleRaw) {
          const title = decodeEntities(titleRaw);
          await this.prisma.youtubeVideo.upsert({
            where: { id: videoId },
            update: { title },
            create: {
              id: videoId,
              title,
              publishedAt: publishedAtStr ? new Date(publishedAtStr) : new Date(),
            },
          });
          added++;
        }
      }
      console.log(`[YouTubePostSource] Discovered/updated ${added} videos for channel "${channelId}".`);
    } catch (err: any) {
      console.error(`[YouTubePostSource] Channel discovery failed for "${channelId}":`, err.message);
    }
  }

  private async runKeywordVideoDiscovery(): Promise<void> {
    if (this.keywords.length === 0) return;

    const hasQuota = await this.checkAndAddQuota(100);
    if (!hasQuota) {
      console.warn("[YouTubePostSource] Quota limit reached/exceeded. Skipping video discovery search.");
      return;
    }

    const kw = this.keywords[this.currentKeywordIndex % this.keywords.length]!;
    this.currentKeywordIndex++;

    try {
      console.log(`[YouTubePostSource] Discovering videos for keyword: "${kw}"`);
      const publishedAfter = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const url = new URL("https://www.googleapis.com/youtube/v3/search");
      url.searchParams.set("key", this.apiKey);
      url.searchParams.set("part", "snippet");
      url.searchParams.set("q", kw);
      url.searchParams.set("type", "video");
      url.searchParams.set("order", "relevance");
      url.searchParams.set("publishedAfter", publishedAfter);
      url.searchParams.set("maxResults", "10");

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`YouTube API Search returned status ${res.status}: ${res.statusText}`);
      }

      const data = (await res.json()) as any;
      const items = data.items || [];

      let added = 0;
      for (const item of items) {
        const videoId = item.id?.videoId;
        const titleRaw = item.snippet?.title;
        const publishedAtStr = item.snippet?.publishedAt;
        if (videoId && titleRaw) {
          const title = decodeEntities(titleRaw);
          await this.prisma.youtubeVideo.upsert({
            where: { id: videoId },
            update: { title },
            create: {
              id: videoId,
              title,
              publishedAt: publishedAtStr ? new Date(publishedAtStr) : new Date(),
            },
          });
          added++;
        }
      }
      console.log(`[YouTubePostSource] Discovered/updated ${added} videos for keyword "${kw}".`);
    } catch (err: any) {
      console.error(`[YouTubePostSource] Discovery failed for "${kw}":`, err.message);
    }
  }

  private async pollNextVideos(): Promise<void> {
    const dueTime = new Date(Date.now() - this.commentPollIntervalMinutes * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    // Get up to 5 active videos due for comment checking
    const videosToPoll = await this.prisma.youtubeVideo.findMany({
      where: {
        publishedAt: { gte: thirtyDaysAgo },
        OR: [
          { lastPolledAt: null },
          { lastPolledAt: { lte: dueTime } },
        ],
      },
      orderBy: { lastPolledAt: "asc" },
      take: 5,
    });

    for (const video of videosToPoll) {
      if (this.stopped) break;
      await this.pollVideoComments(video);
    }
  }

  private async pollVideoComments(video: { id: string; title: string }): Promise<void> {
    const hasQuota = await this.checkAndAddQuota(1);
    if (!hasQuota) {
      console.warn(`[YouTubePostSource] Quota limit reached/exceeded. Skipping comment poll for video: ${video.id}`);
      return;
    }

    try {
      console.log(`[YouTubePostSource] Polling comments for video: "${video.title}" (${video.id})`);

      await this.prisma.youtubeVideo.update({
        where: { id: video.id },
        data: { lastPolledAt: new Date() },
      });

      const url = new URL("https://www.googleapis.com/youtube/v3/commentThreads");
      url.searchParams.set("key", this.apiKey);
      url.searchParams.set("part", this.pollReplies ? "snippet,replies" : "snippet");
      url.searchParams.set("videoId", video.id);
      url.searchParams.set("order", "time");
      url.searchParams.set("maxResults", "50");

      const res = await fetch(url.toString());
      if (!res.ok) {
        if (res.status === 403 || res.status === 404) {
          console.warn(`[YouTubePostSource] Video ${video.id} comments unavailable (status ${res.status}). Skipping further polls.`);
          await this.prisma.youtubeVideo.update({
            where: { id: video.id },
            data: { lastPolledAt: new Date("9999-12-31") },
          });
          return;
        }
        throw new Error(`YouTube API CommentThreads returned status ${res.status}: ${res.statusText}`);
      }

      const data = (await res.json()) as any;
      const items = data.items || [];

      const currentIds: string[] = [];
      const commentsToProcess: Array<{
        id: string;
        authorHandle: string;
        authorId: string;
        content: string;
        postedAt: Date;
      }> = [];

      const extractCommentInfo = (commentNode: any, commentId: string) => {
        if (!commentNode) return;
        currentIds.push(commentId);
        commentsToProcess.push({
          id: commentId,
          authorHandle: commentNode.authorDisplayName || "anonymous",
          authorId: commentNode.authorChannelId?.value || commentNode.authorDisplayName || "anonymous",
          content: decodeEntities(commentNode.textDisplay || commentNode.textOriginal || ""),
          postedAt: commentNode.publishedAt ? new Date(commentNode.publishedAt) : new Date(),
        });
      };

      for (const item of items) {
        const topComment = item.snippet?.topLevelComment?.snippet;
        const topCommentId = item.snippet?.topLevelComment?.id;
        extractCommentInfo(topComment, topCommentId);

        // Include replies if configured
        if (this.pollReplies && item.replies?.comments) {
          for (const reply of item.replies.comments) {
            const replySnippet = reply.snippet;
            const replyId = reply.id;
            extractCommentInfo(replySnippet, replyId);
          }
        }
      }

      // Deletion Detection
      const storedPosts = await this.prisma.sourcePost.findMany({
        where: {
          platform: "youtube",
          youtubeVideoId: video.id,
        },
        select: {
          externalId: true,
          postedAt: true,
        },
      });

      if (storedPosts.length > 0 && commentsToProcess.length > 0) {
        const oldestTimestamp = Math.min(...commentsToProcess.map((c) => c.postedAt.getTime()));

        for (const stored of storedPosts) {
          if (stored.postedAt.getTime() >= oldestTimestamp) {
            if (!currentIds.includes(stored.externalId)) {
              console.log(`[YouTubePostSource] Detected deleted comment: ${stored.externalId}`);
              if (this.deleteCallback) {
                this.deleteCallback(stored.externalId);
              }
            }
          }
        }
      }

      // Keyword filtering and queueing
      let matchedCount = 0;
      for (const c of commentsToProcess) {
        const keywordMatched = matchKeyword(c.content, this.keywords);
        if (keywordMatched) {
          const rawPost: RawPost = {
            platform: "youtube",
            externalId: c.id,
            authorHandle: c.authorHandle,
            authorId: c.authorId,
            content: c.content,
            postedAt: c.postedAt,
            keywordMatched,
            youtubeVideoId: video.id,
            youtubeVideoTitle: video.title,
          };
          this.limiter.enqueue(rawPost);
          matchedCount++;
        }
      }

      const dateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Los_Angeles",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      const quotaRecord = await this.prisma.youtubeQuota.findUnique({
        where: { date: dateStr },
      });
      const spent = quotaRecord ? quotaRecord.unitsSpent : 0;

      console.log(
        `[YouTubePostSource] Polled ${commentsToProcess.length} comment(s) on video "${video.title}" ` +
        `(${matchedCount} match(es) enqueued). Daily Quota: ${spent}/${this.dailyQuotaLimit} units spent.`
      );
    } catch (err: any) {
      console.error(`[YouTubePostSource] Comment polling failed for video ${video.id}:`, err.message);
    }
  }

  private async checkAndAddQuota(cost: number): Promise<boolean> {
    const dateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    try {
      let quota = await this.prisma.youtubeQuota.findUnique({
        where: { date: dateStr },
      });

      if (!quota) {
        quota = await this.prisma.youtubeQuota.create({
          data: { date: dateStr, unitsSpent: 0 },
        });
      }

      if (quota.unitsSpent + cost > this.dailyQuotaLimit) {
        return false;
      }

      await this.prisma.youtubeQuota.update({
        where: { date: dateStr },
        data: { unitsSpent: quota.unitsSpent + cost },
      });

      return true;
    } catch (err: any) {
      console.error("[YouTubePostSource] Quota ledger write failed:", err.message);
      return true; // fail-open to not block ingestion completely
    }
  }
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
