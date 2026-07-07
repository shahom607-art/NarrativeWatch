export function scoreColor(score: number | null): string {
  if (score == null) return "text-gray-400";
  if (score >= 70) return "text-red-400";
  if (score >= 40) return "text-amber-400";
  return "text-green-400";
}

export function scoreLabel(score: number | null): string {
  if (score == null) return "N/A";
  return `${Math.round(score)}/100 suspected`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function buildReportText(post: {
  externalId: string;
  authorHandle: string;
  content: string;
  keywordMatched: string;
  botScore: number | null;
}): string {
  return [
    "Report context (user-submitted via NarrativeWatch — neutral summary):",
    "",
    `Post ID reference: ${post.externalId}`,
    `Author handle: @${post.authorHandle}`,
    `Keyword context: ${post.keywordMatched}`,
    `Pattern match score (automated, not verified): ${post.botScore ?? "N/A"}/100`,
    "",
    "Post content excerpt:",
    post.content.slice(0, 280),
    "",
    "I am reporting this because I believe it may violate platform rules. This description was prepared by a research tool and does not assert guilt or verified misconduct.",
  ].join("\n");
}

export function XReportUrl(externalId: string): string {
  const tweetId = externalId.replace(/^mock_/, "").split("_")[0] ?? externalId;
  return `https://twitter.com/i/safety/report_tweet?id=${encodeURIComponent(tweetId)}`;
}
