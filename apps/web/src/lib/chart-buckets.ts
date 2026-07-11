import type { SourcePostDTO } from "@narrativewatch/shared";

export function bucketSizeMs(windowHours: number): number {
  if (windowHours <= 1) return 5 * 60 * 1000; // 5 minutes
  if (windowHours <= 24) return 1 * 60 * 60 * 1000; // 1 hour
  if (windowHours <= 168) return 6 * 60 * 60 * 1000; // 6 hours
  return 24 * 60 * 60 * 1000; // 1 day
}

/** Align a timestamp to the start of its bucket (epoch-aligned). */
export function bucketStart(ts: number, bucketMs: number): number {
  return Math.floor(ts / bucketMs) * bucketMs;
}

export interface VolumeBucketRow {
  t: number;
  [keyword: string]: number;
}

/**
 * Aggregate post counts into time buckets for the trend chart.
 * Uses postedAt and epoch-aligned bucket keys so bucket creation and post assignment match.
 */
export function buildVolumeBuckets(
  posts: SourcePostDTO[],
  keywords: string[],
  windowHours: number,
  nowMs: number = Date.now(),
): VolumeBucketRow[] {
  const bucketMs = bucketSizeMs(windowHours);
  const windowStart = nowMs - windowHours * 3600000;
  const firstBucket = bucketStart(windowStart, bucketMs);
  const lastBucket = bucketStart(nowMs, bucketMs);

  const buckets = new Map<number, VolumeBucketRow>();

  for (let t = firstBucket; t <= lastBucket; t += bucketMs) {
    const row: VolumeBucketRow = { t: t / 1000 };
    for (const kw of keywords) row[kw] = 0;
    buckets.set(t, row);
  }

  for (const post of posts) {
    const ts = new Date(post.postedAt).getTime();
    if (ts < windowStart || ts > nowMs) continue;

    const bt = bucketStart(ts, bucketMs);
    const row = buckets.get(bt);
    if (row && keywords.includes(post.keywordMatched)) {
      row[post.keywordMatched] = (row[post.keywordMatched] ?? 0) + 1;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.t - b.t);
}

export function totalVolume(rows: VolumeBucketRow[], keywords: string[]): number {
  return rows.reduce(
    (sum, row) => sum + keywords.reduce((kwSum, kw) => kwSum + (row[kw] ?? 0), 0),
    0,
  );
}
