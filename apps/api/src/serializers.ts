import type { SourcePost, PatternCluster } from "@narrativewatch/database";
import type {
  SourcePostDTO,
  PatternClusterDTO,
  BotScoreBreakdown,
} from "@narrativewatch/shared";

export function toPostDTO(post: SourcePost): SourcePostDTO {
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
    botScoreBreakdown: post.botScoreBreakdown as BotScoreBreakdown | null,
    clusterId: post.clusterId,
  };
}

export function toClusterDTO(cluster: PatternCluster): PatternClusterDTO {
  return {
    id: cluster.id,
    label: cluster.label,
    narrative: cluster.narrative,
    firstSeen: cluster.firstSeen.toISOString(),
    lastSeen: cluster.lastSeen.toISOString(),
    postCount: cluster.postCount,
  };
}
