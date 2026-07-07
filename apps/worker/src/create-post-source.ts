import type { PostSource } from "@narrativewatch/shared";
import { MockPostSource, BlueskyPostSource } from "@narrativewatch/shared";
import { loadIngestionKeywords } from "./load-keywords";

export type PostSourceKind = "mock" | "bluesky";

export function resolvePostSourceKind(): PostSourceKind {
  const value = (process.env.POST_SOURCE ?? "mock").toLowerCase();
  return value === "bluesky" ? "bluesky" : "mock";
}

export function createPostSource(keywords: string[]): PostSource {
  const kind = resolvePostSourceKind();

  if (kind === "bluesky") {
    return new BlueskyPostSource({
      keywords,
      jetstreamHost: process.env.BLUESKY_JETSTREAM_HOST,
      maxQueueSize: parseInt(process.env.INGEST_MAX_QUEUE_SIZE ?? "500", 10),
      maxPerSecond: parseInt(process.env.INGEST_MAX_PER_SECOND ?? "5", 10),
      batchSize: parseInt(process.env.INGEST_BATCH_SIZE ?? "10", 10),
    });
  }

  return new MockPostSource();
}

export function loadKeywordsForIngestion(): string[] {
  return loadIngestionKeywords();
}
