import type { RawPost } from "../types";
import { matchKeyword } from "../keywords";
import {
  type JetstreamEvent,
  JETSTREAM_COMMIT_CREATE,
  JETSTREAM_COMMIT_KIND,
  JETSTREAM_POST_COLLECTION,
  blueskyExternalId,
  parseFeedPostRecord,
} from "./jetstream";

export interface BlueskyParseContext {
  didToHandle: Map<string, string>;
  keywords: string[];
}

export function applyIdentityEvent(ctx: BlueskyParseContext, event: JetstreamEvent): void {
  const identity = event.identity;
  if (!identity?.did || !identity.handle) return;
  ctx.didToHandle.set(identity.did, identity.handle.replace(/^@/, ""));
}

export function parsePostCommit(event: JetstreamEvent, ctx: BlueskyParseContext): RawPost | null {
  if (event.kind !== JETSTREAM_COMMIT_KIND || !event.commit) return null;

  const { commit } = event;
  if (commit.collection !== JETSTREAM_POST_COLLECTION) return null;
  if (commit.operation !== JETSTREAM_COMMIT_CREATE) return null;
  if (!commit.rkey || !commit.record) return null;

  const record = parseFeedPostRecord(commit.record);
  if (!record?.text) return null;

  const keywordMatched = matchKeyword(record.text, ctx.keywords);
  if (!keywordMatched) return null;

  const did = event.did;
  const handle = ctx.didToHandle.get(did) ?? did;
  const postedAt = record.createdAt ? new Date(record.createdAt) : new Date(event.time_us / 1000);

  if (Number.isNaN(postedAt.getTime())) return null;

  return {
    platform: "bluesky",
    externalId: blueskyExternalId(did, commit.rkey),
    authorHandle: handle,
    authorId: did,
    content: record.text,
    postedAt,
    keywordMatched,
    accountCreatedAt: null,
    accountPostCount: null,
  };
}

export function parseJetstreamMessage(raw: string, ctx: BlueskyParseContext): RawPost | null {
  let event: JetstreamEvent;
  try {
    event = JSON.parse(raw) as JetstreamEvent;
  } catch {
    return null;
  }

  if (event.kind === "identity") {
    applyIdentityEvent(ctx, event);
    return null;
  }

  return parsePostCommit(event, ctx);
}
