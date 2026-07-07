import type { RawPost, BotScoreBreakdown } from "./types";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s#@]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function termFreq(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) ?? 0) + 1);
  }
  return tf;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const [, v] of a) normA += v * v;
  for (const [, v] of b) normB += v * v;

  for (const [k, v] of a) {
    const bv = b.get(k);
    if (bv) dot += v * bv;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface RecentPostRef {
  authorId: string;
  keywordMatched: string;
  content: string;
  postedAt: Date;
}

export interface ScoreInput {
  post: RawPost;
  recentPosts: RecentPostRef[];
  toxicityScore: number | null;
}

export function computeBotScore(input: ScoreInput): BotScoreBreakdown {
  const { post, recentPosts, toxicityScore } = input;
  const oneHourAgo = new Date(Date.now() - 3600000);

  const sameAuthorKeyword = recentPosts.filter(
    (p) =>
      p.authorId === post.authorId &&
      p.keywordMatched === post.keywordMatched &&
      p.postedAt >= oneHourAgo,
  );
  const freqCount = sameAuthorKeyword.length + 1;
  const postingFrequency = Math.min(100, Math.max(0, (freqCount - 1) * 25));

  const postTokens = termFreq(tokenize(post.content));
  let maxSim = 0;
  for (const other of recentPosts) {
    if (other.content === post.content) {
      maxSim = 1;
      break;
    }
    const sim = cosineSimilarity(postTokens, termFreq(tokenize(other.content)));
    if (sim > maxSim) maxSim = sim;
  }
  const textDuplication = Math.min(100, Math.round(maxSim * 100));

  let accountAgeRatio: number | null = null;
  let accountAgeUnavailable = true;
  if (post.accountCreatedAt && post.accountPostCount != null) {
    accountAgeUnavailable = false;
    const ageDays = Math.max(
      1,
      (Date.now() - post.accountCreatedAt.getTime()) / 86400000,
    );
    const postsPerDay = post.accountPostCount / ageDays;
    if (ageDays < 30 && postsPerDay > 10) {
      accountAgeRatio = 80;
    } else if (ageDays < 90 && postsPerDay > 5) {
      accountAgeRatio = 50;
    } else {
      accountAgeRatio = Math.min(100, Math.round(postsPerDay * 5));
    }
  }

  const toxicityContribution =
    toxicityScore != null ? Math.min(100, Math.round(toxicityScore * 100)) : 0;

  const accountComponent = accountAgeRatio ?? 0;
  const total = Math.round(
    postingFrequency * 0.3 +
      textDuplication * 0.4 +
      accountComponent * 0.15 +
      toxicityContribution * 0.15,
  );

  return {
    postingFrequency,
    textDuplication,
    accountAgeRatio,
    accountAgeUnavailable,
    toxicityContribution,
    total: Math.min(100, total),
  };
}
