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
                ? `${Math.round(post.toxicityScore * 100)}/100`
                : "unavailable (Phase 2)"}
            </span>
          </div>
        </div>

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
