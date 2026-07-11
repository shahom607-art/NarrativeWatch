"use client";

import { useSession } from "next-auth/react";
import type { SourcePostDTO } from "@narrativewatch/shared";
import { buildReportText, XReportUrl } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

export function ReportViaXButton({ post }: { post: SourcePostDTO }) {
  const { data: session } = useSession();

  if (post.platform === "bluesky") {
    const rkey = post.externalId.startsWith("at://")
      ? post.externalId.split("/").pop()
      : null;
    const blueskyUrl = rkey
      ? `https://bsky.app/profile/${post.authorId}/post/${rkey}`
      : `https://bsky.app/profile/${post.authorId}`;
    return (
      <a
        href={blueskyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded border border-accent bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20 transition inline-block text-center font-medium"
      >
        View on Bluesky
      </a>
    );
  }

  if (post.platform !== "x") {
    return (
      <p className="text-xs text-gray-500">
        Read-only ingestion — no automated report actions for {post.platform} posts.
      </p>
    );
  }

  async function handleReport() {
    const text = buildReportText(post);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard may fail in insecure contexts
    }

    if (session?.accessToken) {
      try {
        await apiFetch(
          "/api/report-log",
          {
            method: "POST",
            body: JSON.stringify({ postId: post.id, channel: "x_report_flow" }),
          },
          (session as { accessToken?: string }).accessToken,
        );
      } catch {
        // non-blocking
      }
    }

    window.open(XReportUrl(post.externalId), "_blank", "noopener,noreferrer");
  }

  return (
    <button
      onClick={handleReport}
      className="rounded border border-border px-4 py-2 text-sm hover:border-accent hover:text-accent"
    >
      Report via X (opens official flow + copies neutral text)
    </button>
  );
}
