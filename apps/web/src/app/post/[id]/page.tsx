import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost } from "@/lib/data";
import { ReportViaXButton } from "@/components/ReportViaXButton";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { scoreColor, scoreLabel, formatDate } from "@/lib/utils";

export default async function PostPage({ params }: { params: { id: string } }) {
  let post;
  try {
    post = await getPost(params.id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/dashboard" className="text-sm text-accent hover:underline">
        ← Back to dashboard
      </Link>

      <article className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <Link href={`/account/${post.authorHandle}`} className="font-medium text-accent">
            @{post.authorHandle}
          </Link>
          <span className="text-gray-500">{formatDate(post.postedAt)}</span>
          <span className="rounded bg-border px-2 py-0.5 text-xs">{post.keywordMatched}</span>
        </div>

        <div className="mb-4 rounded bg-accent/10 border border-accent/20 p-3 text-xs text-gray-300">
          <strong>ℹ️ Routing Signal Notice:</strong> The matched keyword badge above indicates a routing signal only. It does not imply the post is toxic or represents automated activity. Review the Toxicity Score and Pattern Match Score breakdown below.
        </div>

        <p className="mb-6 text-lg leading-relaxed">{post.content}</p>

        <div className="mb-4 flex gap-4 text-sm">
          <div>
            <span className="text-gray-400">Pattern match score: </span>
            <span className={scoreColor(post.botScore)}>{scoreLabel(post.botScore)}</span>
          </div>
          <div>
            <span className="text-gray-400">Toxicity (separate): </span>
            <span>
              {post.toxicityScore != null
                ? `${Math.round(post.toxicityScore)}/100`
                : "unavailable"}
            </span>
          </div>
        </div>

        {post.toxicityBreakdown && (
          <details className="mb-6 rounded border border-border bg-border/20 p-3 text-xs">
            <summary className="cursor-pointer font-medium text-gray-300">
              View OpenAI Moderation category breakdown
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {Object.entries(post.toxicityBreakdown).map(([category, value]) => {
                const percentage = Math.round((value as number) * 100);
                return (
                  <div key={category} className="flex justify-between border-b border-border/50 py-1">
                    <span className="text-gray-400">{category}</span>
                    <span className={percentage > 50 ? "font-bold text-red-400" : "text-gray-300"}>
                      {percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          </details>
        )}

        <ScoreBreakdown breakdown={post.botScoreBreakdown} />

        <div className="mt-6 flex flex-wrap gap-3">
          <ReportViaXButton post={post} />
          {post.clusterId && (
            <Link
              href={`/clusters/${post.clusterId}`}
              className="rounded border border-border px-4 py-2 text-sm hover:border-accent"
            >
              View cluster
            </Link>
          )}
        </div>
      </article>
    </div>
  );
}
