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
import { useMemo } from "react";
import { buildVolumeBuckets, totalVolume } from "@/lib/chart-buckets";

interface TrendChartProps {
  posts: SourcePostDTO[];
  keywords: string[];
  windowHours: number;
}

export function TrendChart({ posts, keywords, windowHours }: TrendChartProps) {
  const data = useMemo(
    () => buildVolumeBuckets(posts, keywords, windowHours),
    [posts, keywords, windowHours],
  );

  const chartKey = useMemo(() => `${totalVolume(data, keywords)}-${data.length}`, [data, keywords]);

  const colors = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#a855f7"];

  const formatAxisTick = (unixSeconds: number) => {
    const d = new Date(unixSeconds * 1000);
    if (windowHours <= 1) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (windowHours <= 24) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="h-64 w-full rounded-lg border border-border bg-card p-4">
      <h3 className="mb-2 text-sm font-medium text-gray-400">Post volume over time</h3>
      <ResponsiveContainer width="100%" height="90%">
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
          {keywords.map((kw, i) => (
            <Line
              key={kw}
              type="monotone"
              dataKey={kw}
              stroke={colors[i % colors.length]}
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
