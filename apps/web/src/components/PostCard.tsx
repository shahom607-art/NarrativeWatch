"use client";

import Link from "next/link";
import type { SourcePostDTO } from "@narrativewatch/shared";
import { scoreColor, scoreLabel, formatDate } from "@/lib/utils";

export function PostCard({ post }: { post: SourcePostDTO }) {
  return (
    <article className="rounded-lg border border-border bg-card p-4 transition hover:border-accent/50">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <Link href={`/account/${post.authorHandle}`} className="font-medium text-accent">
          @{post.authorHandle}
        </Link>
        <span className="text-gray-500">·</span>
        <span className="text-gray-500">{formatDate(post.postedAt)}</span>
        <span className="rounded bg-border px-2 py-0.5 text-xs">{post.keywordMatched}</span>
        <span className="rounded bg-border/60 px-2 py-0.5 text-xs text-gray-400">{post.platform}</span>
        <span className={`ml-auto text-xs font-medium ${scoreColor(post.botScore)}`}>
          Pattern match: {scoreLabel(post.botScore)}
        </span>
        {post.toxicityScore != null && (
          <span className={`text-xs font-medium ${scoreColor(post.toxicityScore)}`}>
            Toxicity: {Math.round(post.toxicityScore)}/100
          </span>
        )}
      </div>
      <p className="mb-3 text-sm leading-relaxed">{post.content}</p>
      {post.platform === "youtube" && post.youtubeVideoId && (
        <div className="mb-3 text-xs text-gray-400">
          Commented on video:{" "}
          <a
            href={`https://www.youtube.com/watch?v=${post.youtubeVideoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline font-medium"
          >
            {post.youtubeVideoTitle || post.youtubeVideoId}
          </a>
        </div>
      )}
      <div className="flex gap-3 text-xs">
        <Link href={`/post/${post.id}`} className="text-accent hover:underline">
          View details
        </Link>
        {post.clusterId && (
          <Link href={`/clusters/${post.clusterId}`} className="text-gray-400 hover:underline">
            View cluster
          </Link>
        )}
      </div>
    </article>
  );
}
