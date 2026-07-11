import Link from "next/link";
import { notFound } from "next/navigation";
import { getAccount } from "@/lib/data";
import { PostCard } from "@/components/PostCard";
import { scoreColor, scoreLabel } from "@/lib/utils";

export default async function AccountPage({ params }: { params: { handle: string } }) {
  let account;
  try {
    account = await getAccount(params.handle);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
        This reflects automated pattern analysis, not a verified conclusion. Individual accounts
        are shown only for aggregated context, not as confirmed bots or bad actors.
      </div>

      <div>
        <Link href="/dashboard" className="text-sm text-accent hover:underline">
          ← Back to dashboard
        </Link>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">@{account.handle}</h1>
        {account.handle.startsWith("did:") && (
          <a
            href={`https://bsky.app/profile/${account.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:underline"
          >
            View Profile on Bluesky ↗
          </a>
        )}
      </div>
      <p className="mt-1 text-gray-400">
        {account.postCount} flagged posts in corpus · avg pattern score{" "}
        <span className={scoreColor(account.avgBotScore)}>{scoreLabel(account.avgBotScore)}</span>
      </p>
      </div>

      <section className="space-y-3">
        {account.posts.length === 0 ? (
          <p className="text-gray-400">No posts matched for this handle.</p>
        ) : (
          account.posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </section>
    </div>
  );
}
