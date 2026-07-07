import { prisma } from "@narrativewatch/database";
import {
  StubToxicityClassifier,
  computeBotScore,
  emitNewPost,
  emitClusterUpdate,
  CLUSTER_UPDATE_THRESHOLD,
  type RawPost,
  type SourcePostDTO,
} from "@narrativewatch/shared";
import { assignCluster } from "./clustering";
import { indexPost } from "./opensearch";

const toxicityClassifier = new StubToxicityClassifier();

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
  botScore: number | null;
  botScoreBreakdown: unknown;
  clusterId: string | null;
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
    botScore: post.botScore,
    botScoreBreakdown: post.botScoreBreakdown as SourcePostDTO["botScoreBreakdown"],
    clusterId: post.clusterId,
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

    const toxicityScore = await toxicityClassifier.classify(raw.content);
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
        botScore: breakdown.total,
        botScoreBreakdown: breakdown as object,
        clusterId,
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
