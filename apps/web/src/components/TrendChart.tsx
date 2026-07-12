"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { SourcePostDTO } from "@narrativewatch/shared";
import { useMemo, useState } from "react";
import { buildVolumeBuckets, totalVolume } from "@/lib/chart-buckets";

interface TrendChartProps {
  posts: SourcePostDTO[];
  keywords: string[];
  allKeywords?: string[];
  windowHours: number;
}

export function TrendChart({ posts, keywords, allKeywords = [], windowHours }: TrendChartProps) {
  const [pinnedKeywords, setPinnedKeywords] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const referenceKeywords = allKeywords.length > 0 ? allKeywords : keywords;

  // 1. Calculate frequency/volume of each keyword in the current time-window posts
  const keywordVolumes = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const kw of referenceKeywords) {
      counts[kw] = 0;
    }
    for (const p of posts) {
      if (counts[p.keywordMatched] !== undefined) {
        counts[p.keywordMatched]++;
      }
    }
    return counts;
  }, [referenceKeywords, posts]);

  // 2. Fallback to top 7 keywords by volume
  const autoTopKeywords = useMemo(() => {
    const sorted = [...referenceKeywords]
      .map((kw) => ({ kw, count: keywordVolumes[kw] ?? 0 }))
      .sort((a, b) => b.count - a.count);
    return sorted.slice(0, 7).map((item) => item.kw);
  }, [referenceKeywords, keywordVolumes]);

  const isDashboardFiltered = keywords.length === 1;

  // 3. Selection of active keywords
  const activeKeywords = useMemo(() => {
    if (isDashboardFiltered) return keywords;
    if (pinnedKeywords.length > 0) return pinnedKeywords;
    return autoTopKeywords;
  }, [isDashboardFiltered, keywords, pinnedKeywords, autoTopKeywords]);

  const data = useMemo(
    () => buildVolumeBuckets(posts, activeKeywords, windowHours),
    [posts, activeKeywords, windowHours],
  );

  const chartKey = useMemo(
    () => `${totalVolume(data, activeKeywords)}-${data.length}-${pinnedKeywords.join(",")}`,
    [data, activeKeywords, pinnedKeywords],
  );

  // 4. Stable Golden Angle Hue Generator
  const getStableColor = (kw: string) => {
    const index = referenceKeywords.indexOf(kw);
    if (index === -1) return "#3b82f6";
    // golden angle (137.5 degrees) creates high contrast distribution
    const hue = (index * 137.5) % 360;
    return `hsl(${hue}, 70%, 55%)`;
  };

  const formatAxisTick = (unixSeconds: number) => {
    const d = new Date(unixSeconds * 1000);
    if (windowHours <= 1) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (windowHours <= 24) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    // For 7d (168 hours) with 6h buckets, show Date + time cleanly
    return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const handleToggleKeyword = (kw: string) => {
    setPinnedKeywords((prev) => {
      if (prev.includes(kw)) {
        return prev.filter((k) => k !== kw);
      }
      if (prev.length >= 7) return prev;
      return [...prev, kw];
    });
  };

  const filteredKeywordsList = useMemo(() => {
    if (!search) return referenceKeywords;
    const lower = search.toLowerCase();
    return referenceKeywords.filter((kw) => kw.toLowerCase().includes(lower));
  }, [referenceKeywords, search]);

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-border bg-card p-4 lg:flex-row">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-400">Post volume over time</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {allKeywords.length === 0
                ? "Loading keywords..."
                : isDashboardFiltered
                  ? `Filtering by dashboard search keyword`
                  : pinnedKeywords.length > 0
                    ? `Showing ${activeKeywords.length} pinned keyword(s)`
                    : `Showing top ${activeKeywords.length} keywords by post volume`}
            </p>
          </div>
          {!isDashboardFiltered && pinnedKeywords.length > 0 && (
            <button
              onClick={() => setPinnedKeywords([])}
              className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              Reset to Auto
            </button>
          )}
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart key={chartKey} data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2a38" />
              <XAxis
                dataKey="t"
                tickFormatter={formatAxisTick}
                stroke="#6b7280"
                fontSize={11}
              />
              <YAxis stroke="#6b7280" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#121820", border: "1px solid #1e2a38" }}
                labelFormatter={(v) => new Date(Number(v) * 1000).toLocaleString()}
              />
              <Legend />
              {activeKeywords.map((kw) => (
                <Line
                  key={kw}
                  type="monotone"
                  dataKey={kw}
                  stroke={getStableColor(kw)}
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hide the sidebar if the dashboard filter has locked rendering to 1 keyword */}
      {!isDashboardFiltered && (
        <div className="w-full lg:w-64 border-t border-border pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Pin Keywords ({pinnedKeywords.length}/7)
            </h4>
          </div>
          <input
            type="text"
            placeholder="Search keywords to pin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
          <div className="flex-1 overflow-y-auto max-h-48 lg:max-h-60 pr-1 space-y-1">
            {allKeywords.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-gray-500 py-6">
                Loading keywords...
              </div>
            ) : filteredKeywordsList.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-gray-500 py-6">
                No matching keywords
              </div>
            ) : (
              filteredKeywordsList.map((kw) => {
                const isPinned = pinnedKeywords.includes(kw);
                const isMaxReached = pinnedKeywords.length >= 7;
                const isDisabled = !isPinned && isMaxReached;
                const count = keywordVolumes[kw] ?? 0;
                return (
                  <label
                    key={kw}
                    className={`flex items-center justify-between rounded px-2 py-1.5 text-xs cursor-pointer select-none transition-colors ${
                      isPinned
                        ? "bg-blue-500/10 text-blue-400 font-medium"
                        : "hover:bg-background text-gray-300"
                    } ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isPinned}
                        disabled={isDisabled}
                        onChange={() => handleToggleKeyword(kw)}
                        className="rounded border-border bg-background text-blue-500 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <span className="truncate" title={kw}>{kw}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono pl-2">({count})</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
