import type { PostSource } from "@narrativewatch/shared";
import { MockPostSource, BlueskyPostSource, MastodonPostSource, CompositePostSource, YouTubePostSource } from "@narrativewatch/shared";
import { loadIngestionKeywords } from "./load-keywords";
import { prisma } from "@narrativewatch/database";

export type PostSourceKind = "mock" | "bluesky" | "mastodon" | "youtube";

export function resolvePostSourceKinds(): PostSourceKind[] {
  const value = (process.env.POST_SOURCE ?? "mock").toLowerCase();
  const parts = value.split(",").map((p) => p.trim());
  const kinds: PostSourceKind[] = [];
  for (const part of parts) {
    if (part === "bluesky" || part === "mastodon" || part === "mock" || part === "youtube") {
      kinds.push(part);
    }
  }
  if (kinds.length === 0) {
    kinds.push("mock");
  }
  return kinds;
}

export function resolvePostSourceKind(): string {
  return resolvePostSourceKinds().join(",");
}

export function createPostSource(keywords: string[]): PostSource {
  const kinds = resolvePostSourceKinds();

  const createSingleSource = (kind: PostSourceKind): PostSource => {
    if (kind === "bluesky") {
      return new BlueskyPostSource({
        keywords,
        jetstreamHost: process.env.BLUESKY_JETSTREAM_HOST,
        maxQueueSize: parseInt(process.env.INGEST_MAX_QUEUE_SIZE ?? "500", 10),
        maxPerSecond: parseInt(process.env.INGEST_MAX_PER_SECOND ?? "5", 10),
        batchSize: parseInt(process.env.INGEST_BATCH_SIZE ?? "10", 10),
      });
    }
    if (kind === "mastodon") {
      return new MastodonPostSource({
        keywords,
        instanceUrl: process.env.MASTODON_INSTANCE_URL,
        accessToken: process.env.MASTODON_ACCESS_TOKEN,
        maxQueueSize: parseInt(process.env.INGEST_MAX_QUEUE_SIZE ?? "500", 10),
        maxPerSecond: parseInt(process.env.INGEST_MAX_PER_SECOND ?? "5", 10),
        batchSize: parseInt(process.env.INGEST_BATCH_SIZE ?? "10", 10),
      });
    }
    if (kind === "youtube") {
      const channelsVal = process.env.YOUTUBE_CHANNELS ?? "";
      const channels = channelsVal
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      return new YouTubePostSource({
        keywords,
        apiKey: process.env.YOUTUBE_API_KEY ?? "",
        prisma,
        maxQueueSize: parseInt(process.env.INGEST_MAX_QUEUE_SIZE ?? "500", 10),
        maxPerSecond: parseInt(process.env.INGEST_MAX_PER_SECOND ?? "5", 10),
        batchSize: parseInt(process.env.INGEST_BATCH_SIZE ?? "10", 10),
        dailyQuotaLimit: parseInt(process.env.YOUTUBE_DAILY_QUOTA_LIMIT ?? "9000", 10),
        searchIntervalHours: parseInt(process.env.YOUTUBE_SEARCH_INTERVAL_HOURS ?? "6", 10),
        commentPollIntervalMinutes: parseInt(process.env.YOUTUBE_COMMENT_POLL_INTERVAL_MINUTES ?? "10", 10),
        pollReplies: process.env.YOUTUBE_POLL_REPLIES === "true",
        channels,
      });
    }
    return new MockPostSource();
  };

  if (kinds.length === 1) {
    return createSingleSource(kinds[0]!);
  }

  const sources = kinds.map((k) => createSingleSource(k));
  return new CompositePostSource(sources);
}

export function loadKeywordsForIngestion(): string[] {
  return loadIngestionKeywords();
}
