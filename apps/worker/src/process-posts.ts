import { prisma } from "@narrativewatch/database";
import {
  OpenAIToxicityClassifier,
  StubToxicityClassifier,
  computeBotScore,
  emitNewPost,
  emitClusterUpdate,
  CLUSTER_UPDATE_THRESHOLD,
  type RawPost,
  type SourcePostDTO,
} from "@narrativewatch/shared";
import { assignCluster } from "./clustering";
import { indexPost, deletePostFromIndex } from "./opensearch";

const toxicityClassifier = process.env.OPENAI_API_KEY
  ? new OpenAIToxicityClassifier()
  : new StubToxicityClassifier();

function toDTO(post: {
  id: string;
  platform: string;
  externalId: string;
  authorHandle: string;
  authorId: string;
  content: string;
  postedAt: Date;
  ingestedAt: Date;
  keywordMatched: string;
  toxicityScore: number | null;
  toxicityBreakdown: unknown;
  botScore: number | null;
  botScoreBreakdown: unknown;
  clusterId: string | null;
  youtubeVideoId: string | null;
  youtubeVideoTitle: string | null;
}): SourcePostDTO {
  return {
    id: post.id,
    platform: post.platform,
    externalId: post.externalId,
    authorHandle: post.authorHandle,
    authorId: post.authorId,
    content: post.content,
    postedAt: post.postedAt.toISOString(),
    ingestedAt: post.ingestedAt.toISOString(),
    keywordMatched: post.keywordMatched,
    toxicityScore: post.toxicityScore,
    toxicityBreakdown: post.toxicityBreakdown as Record<string, number> | null,
    botScore: post.botScore,
    botScoreBreakdown: post.botScoreBreakdown as SourcePostDTO["botScoreBreakdown"],
    clusterId: post.clusterId,
    youtubeVideoId: post.youtubeVideoId,
    youtubeVideoTitle: post.youtubeVideoTitle,
  };
}

export async function processRawPosts(rawPosts: RawPost[]): Promise<number> {
  if (rawPosts.length === 0) return 0;

  const oneHourAgo = new Date(Date.now() - 3600000);
  const recentPosts = await prisma.sourcePost.findMany({
    where: { postedAt: { gte: oneHourAgo } },
    select: {
      authorId: true,
      keywordMatched: true,
      content: true,
      postedAt: true,
    },
    take: 500,
  });

  let processed = 0;

  for (const raw of rawPosts) {
    const exists = await prisma.sourcePost.findUnique({
      where: { externalId: raw.externalId },
    });
    if (exists) continue;

    const toxicityRes = await toxicityClassifier.classify(raw.content);
    const toxicityScore = toxicityRes.score;
    const toxicityBreakdown = toxicityRes.breakdown;

    const breakdown = computeBotScore({
      post: raw,
      recentPosts,
      toxicityScore,
    });

    const clusterId = await assignCluster(
      prisma,
      raw.content,
      raw.keywordMatched,
      raw.postedAt,
    );

    const saved = await prisma.sourcePost.create({
      data: {
        platform: raw.platform,
        externalId: raw.externalId,
        authorHandle: raw.authorHandle,
        authorId: raw.authorId,
        content: raw.content,
        postedAt: raw.postedAt,
        keywordMatched: raw.keywordMatched,
        toxicityScore,
        toxicityBreakdown: toxicityBreakdown as object,
        botScore: breakdown.total,
        botScoreBreakdown: breakdown as object,
        clusterId,
        youtubeVideoId: raw.youtubeVideoId,
        youtubeVideoTitle: raw.youtubeVideoTitle,
      },
    });

    const dto = toDTO(saved);
    try {
      await indexPost(dto);
    } catch (err) {
      console.warn("OpenSearch index failed:", err);
    }

    await emitNewPost(dto);

    const cluster = await prisma.patternCluster.findUnique({ where: { id: clusterId } });
    if (cluster && cluster.postCount % CLUSTER_UPDATE_THRESHOLD === 0) {
      await emitClusterUpdate({
        id: cluster.id,
        label: cluster.label,
        narrative: cluster.narrative,
        firstSeen: cluster.firstSeen.toISOString(),
        lastSeen: cluster.lastSeen.toISOString(),
        postCount: cluster.postCount,
      });
    }

    recentPosts.push({
      authorId: raw.authorId,
      keywordMatched: raw.keywordMatched,
      content: raw.content,
      postedAt: raw.postedAt,
    });

    processed += 1;
  }

  return processed;
}

export async function handleDeletedPost(externalId: string): Promise<void> {
  const post = await prisma.sourcePost.findUnique({
    where: { externalId },
    select: { id: true, clusterId: true, platform: true },
  });

  if (!post) {
    return;
  }

  console.log(`[worker] Received delete event for post: ${externalId} (platform: ${post.platform})`);

  try {
    await deletePostFromIndex(post.id);
    console.log(`[worker] Removed post ${post.id} (${externalId}) from OpenSearch`);
  } catch (err) {
    console.warn(`[worker] Failed to delete post ${post.id} from OpenSearch:`, err);
  }

  try {
    const deletedLogs = await prisma.reportLog.deleteMany({
      where: { postId: post.id }
    });
    if (deletedLogs.count > 0) {
      console.log(`[worker] Purged ${deletedLogs.count} ReportLog(s) referencing post ${post.id}`);
    }
  } catch (err) {
    console.warn(`[worker] Failed to delete ReportLogs for post ${post.id}:`, err);
  }

  await prisma.sourcePost.delete({
    where: { id: post.id },
  });
  console.log(`[worker] Purged post ${post.id} (${externalId}) from PostgreSQL`);

  if (post.clusterId) {
    const cluster = await prisma.patternCluster.findUnique({
      where: { id: post.clusterId },
      select: { id: true, postCount: true, label: true, narrative: true, firstSeen: true, lastSeen: true },
    });

    if (cluster) {
      const newCount = cluster.postCount - 1;
      if (newCount <= 0) {
        await prisma.patternCluster.delete({
          where: { id: cluster.id },
        });
        console.log(`[worker] Deleted pattern cluster ${cluster.id} (drops to 0 members)`);
      } else {
        const updated = await prisma.patternCluster.update({
          where: { id: cluster.id },
          data: { postCount: newCount },
        });
        console.log(`[worker] Decremented pattern cluster ${cluster.id} count to ${newCount}`);
        if (updated.postCount % CLUSTER_UPDATE_THRESHOLD === 0) {
          await emitClusterUpdate({
            id: updated.id,
            label: updated.label,
            narrative: updated.narrative,
            firstSeen: updated.firstSeen.toISOString(),
            lastSeen: updated.lastSeen.toISOString(),
            postCount: updated.postCount,
          });
        }
      }
    }
  }
}

