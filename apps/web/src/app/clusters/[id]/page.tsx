import Link from "next/link";
import { notFound } from "next/navigation";
import { getCluster } from "@/lib/data";
import { PostCard } from "@/components/PostCard";
import { ReportViaXButton } from "@/components/ReportViaXButton";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { formatDate } from "@/lib/utils";

export default async function ClusterPage({ params }: { params: { id: string } }) {
  let cluster;
  try {
    cluster = await getCluster(params.id);
  } catch {
    notFound();
  }

  const samplePost = cluster.posts[0];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-accent hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{cluster.label}</h1>
        <p className="mt-2 text-gray-400">{cluster.narrative}</p>
        <p className="mt-1 text-sm text-gray-500">
          First seen {formatDate(cluster.firstSeen)} · Last seen {formatDate(cluster.lastSeen)} ·{" "}
          {cluster.postCount} posts (suspected pattern match)
        </p>
        <div className="mt-4 rounded bg-accent/10 border border-accent/20 p-3 text-xs text-gray-300">
          <strong>ℹ️ Routing Signal Notice:</strong> Keyword matches are used purely as a routing net to collect posts. A match does not imply the content is toxic or represents coordinated behavior. Please refer to the Toxicity Score and Pattern Match (Bot) Score for actual content analysis.
        </div>
      </div>

      {samplePost && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">Score breakdown (sample post)</h2>
          <ScoreBreakdown breakdown={samplePost.botScoreBreakdown} />
          <div className="mt-4">
            <ReportViaXButton post={samplePost} />
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Sample posts in cluster</h2>
        {cluster.posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </section>
    </div>
  );
}
