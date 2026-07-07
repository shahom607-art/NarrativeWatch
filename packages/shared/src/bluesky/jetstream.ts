/**
 * Jetstream event types — from official jetstream-legacy schema:
 * https://github.com/bluesky-social/jetstream-legacy/blob/main/pkg/models/models.go
 * https://github.com/bluesky-social/jetstream-legacy/blob/main/README.md
 */

export interface JetstreamCommit {
  rev?: string;
  operation?: string;
  collection?: string;
  rkey?: string;
  record?: Record<string, unknown>;
  cid?: string;
}

export interface JetstreamIdentity {
  did: string;
  handle?: string;
  seq?: number;
  time?: string;
}

export interface JetstreamAccount {
  active?: boolean;
  did: string;
  seq?: number;
  time?: string;
}

export interface JetstreamEvent {
  did: string;
  time_us: number;
  kind?: string;
  commit?: JetstreamCommit;
  identity?: JetstreamIdentity;
  account?: JetstreamAccount;
}

/** app.bsky.feed.post record (subset used for ingestion) */
export interface BlueskyFeedPostRecord {
  $type?: string;
  text?: string;
  createdAt?: string;
  langs?: string[];
}

export const JETSTREAM_POST_COLLECTION = "app.bsky.feed.post";
export const JETSTREAM_COMMIT_KIND = "commit";
export const JETSTREAM_COMMIT_CREATE = "create";

export const JETSTREAM_PUBLIC_HOSTS = [
  "jetstream1.us-east.bsky.network",
  "jetstream2.us-east.bsky.network",
  "jetstream1.us-west.bsky.network",
  "jetstream2.us-west.bsky.network",
] as const;

export const DEFAULT_JETSTREAM_HOST = "jetstream2.us-east.bsky.network";

export function buildJetstreamSubscribeUrl(host: string = DEFAULT_JETSTREAM_HOST): string {
  const base = host.startsWith("wss://") ? host : `wss://${host}`;
  const url = base.endsWith("/subscribe") ? base : `${base.replace(/\/$/, "")}/subscribe`;
  const parsed = new URL(url);
  parsed.searchParams.set("wantedCollections", JETSTREAM_POST_COLLECTION);
  return parsed.toString();
}

export function blueskyExternalId(did: string, rkey: string): string {
  return `at://${did}/${JETSTREAM_POST_COLLECTION}/${rkey}`;
}

export function parseFeedPostRecord(record: Record<string, unknown>): BlueskyFeedPostRecord | null {
  if (!record || typeof record !== "object") return null;
  const text = typeof record.text === "string" ? record.text : undefined;
  const createdAt = typeof record.createdAt === "string" ? record.createdAt : undefined;
  if (!text && !createdAt) return null;
  return {
    $type: typeof record.$type === "string" ? record.$type : undefined,
    text,
    createdAt,
    langs: Array.isArray(record.langs)
      ? record.langs.filter((l): l is string => typeof l === "string")
      : undefined,
  };
}
