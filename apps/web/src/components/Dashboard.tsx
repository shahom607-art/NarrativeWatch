"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SourcePostDTO, PatternClusterDTO } from "@narrativewatch/shared";
import { getPosts, getClusters, getIngestionKeywords } from "@/lib/data";
import { useLiveFeed } from "@/hooks/useLiveFeed";
import { PostCard } from "@/components/PostCard";
import { TrendChart } from "@/components/TrendChart";
import Link from "next/link";

const FALLBACK_KEYWORDS = ["election", "fraud", "protest", "vaccine"];
const WINDOWS = [
  { label: "1h", hours: 1 },
  { label: "24h", hours: 24 },
  { label: "7d", hours: 168 },
];

export function Dashboard() {
  const [keyword, setKeyword] = useState("");
  const [windowKey, setWindowKey] = useState("24h");
  const [initialPosts, setInitialPosts] = useState<SourcePostDTO[]>([]);
  const [clusters, setClusters] = useState<PatternClusterDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartKeywords, setChartKeywords] = useState<string[]>(FALLBACK_KEYWORDS);
  const { posts: livePosts, clusterUpdates, connected } = useLiveFeed();

  useEffect(() => {
    getIngestionKeywords()
      .then((res) => {
        if (res.keywords.length > 0) setChartKeywords(res.keywords.slice(0, 8));
      })
      .catch(() => {
        // keep fallback
      });
  }, []);

  const windowHours = WINDOWS.find((w) => w.label === windowKey)?.hours ?? 24;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const since = new Date(Date.now() - windowHours * 3600000).toISOString();
      const [postsRes, clustersRes] = await Promise.all([
        getPosts({ from: since, ...(keyword ? { keyword } : {}), page: "1" }),
        getClusters(windowKey),
      ]);
      setInitialPosts(postsRes.data);
      setClusters(clustersRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [keyword, windowKey, windowHours]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const allPosts = useMemo(() => {
    const map = new Map<string, SourcePostDTO>();
    for (const p of [...livePosts, ...initialPosts]) {
      map.set(p.id, p);
    }
    let merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
    );
    if (keyword) {
      merged = merged.filter(
        (p) =>
          p.keywordMatched.includes(keyword) ||
          p.content.toLowerCase().includes(keyword.toLowerCase()),
      );
    }
    const since = Date.now() - windowHours * 3600000;
    return merged.filter((p) => new Date(p.postedAt).getTime() >= since);
  }, [livePosts, initialPosts, keyword, windowHours]);

  const activeChartKeywords = keyword ? [keyword] : chartKeywords;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live pattern dashboard</h1>
          <p className="text-sm text-gray-400">
            Suspected coordinated behavior patterns from public posts — configure keywords in{" "}
            <code className="text-xs">config/ingestion-keywords.json</code>.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
          />
          {connected ? "Live" : "Disconnected"}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Filter by keyword..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="rounded border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="flex rounded border border-border">
          {WINDOWS.map((w) => (
            <button
              key={w.label}
              onClick={() => setWindowKey(w.label)}
              className={`px-3 py-2 text-sm ${windowKey === w.label ? "bg-accent text-white" : "hover:bg-card"}`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <TrendChart posts={allPosts} keywords={activeChartKeywords} windowHours={windowHours} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <h2 className="text-lg font-semibold">Recent posts</h2>
          {loading && allPosts.length === 0 ? (
            <p className="text-gray-400">Loading...</p>
          ) : allPosts.length === 0 ? (
            <p className="text-gray-400">
              No posts yet — the mock ingestion worker should populate data shortly.
            </p>
          ) : (
            allPosts.slice(0, 30).map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Pattern clusters</h2>
          {[...clusterUpdates, ...clusters]
            .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
            .slice(0, 10)
            .map((cluster) => (
              <Link
                key={cluster.id}
                href={`/clusters/${cluster.id}`}
                className="block rounded-lg border border-border bg-card p-3 hover:border-accent/50"
              >
                <p className="text-sm font-medium">{cluster.label}</p>
                <p className="mt-1 text-xs text-gray-400">{cluster.postCount} posts · suspected pattern</p>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
