"use client";

import { useEffect, useState } from "react";
import { getPosts, getClusters } from "@/lib/data";

type Stats = {
  postsAnalyzed24h: number | null;
  patternClusters7d: number | null;
};

export function LiveStatsSnippet() {
  const [stats, setStats] = useState<Stats>({ postsAnalyzed24h: null, patternClusters7d: null });
  const [error, setError] = useState(false);

  useEffect(() => {
    const since = new Date(Date.now() - 24 * 3600000).toISOString();

    Promise.all([getPosts({ from: since, page: "1" }), getClusters("7d")])
      .then(([postsRes, clusters]) => {
        setStats({
          postsAnalyzed24h: postsRes.total,
          patternClusters7d: clusters.length,
        });
      })
      .catch(() => setError(true));
  }, []);

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-400">
        Live activity snapshot
      </h2>
      {error ? (
        <p className="text-sm text-gray-500">Stats temporarily unavailable.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <StatCard
            label="Posts analyzed (last 24h)"
            value={stats.postsAnalyzed24h}
          />
          <StatCard
            label="Suspected pattern clusters (last 7d)"
            value={stats.patternClusters7d}
          />
        </div>
      )}
      <p className="mt-4 text-xs text-gray-500">
        Pulled from the same aggregation pipeline as the research dashboard — updated on page load.
      </p>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="space-y-1">
      <p className="text-3xl font-semibold tabular-nums text-accent">
        {value === null ? "—" : value.toLocaleString()}
      </p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}
