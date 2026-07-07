import WebSocket from "ws";
import type { PostSource, RawPost } from "./types";
import { IngestRateLimiter } from "./ingest-rate-limiter";
import {
  buildJetstreamSubscribeUrl,
  DEFAULT_JETSTREAM_HOST,
  type JetstreamEvent,
} from "./bluesky/jetstream";
import { parseJetstreamMessage } from "./bluesky/parser";

export interface BlueskyPostSourceOptions {
  keywords: string[];
  jetstreamHost?: string;
  maxQueueSize?: number;
  maxPerSecond?: number;
  batchSize?: number;
  reconnectDelayMs?: number;
}

/**
 * Read-only Bluesky ingestion via the public Jetstream websocket firehose.
 * Filters posts client-side by keyword; no auth required.
 *
 * @see https://github.com/bluesky-social/jetstream-legacy/blob/main/README.md
 * @see https://docs.bsky.app/docs/advanced-guides/firehose
 */
export class BlueskyPostSource implements PostSource {
  private readonly keywords: string[];
  private readonly jetstreamUrl: string;
  private readonly batchSize: number;
  private readonly reconnectDelayMs: number;
  private readonly limiter: IngestRateLimiter<RawPost>;
  private readonly didToHandle = new Map<string, string>();

  private ws: WebSocket | null = null;
  private lastCursorUs: number | undefined;
  private connecting = false;
  private stopped = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: BlueskyPostSourceOptions) {
    this.keywords = options.keywords;
    const host = options.jetstreamHost ?? DEFAULT_JETSTREAM_HOST;
    this.jetstreamUrl = buildJetstreamSubscribeUrl(host);
    this.batchSize = options.batchSize ?? 10;
    this.reconnectDelayMs = options.reconnectDelayMs ?? 5000;
    this.limiter = new IngestRateLimiter<RawPost>(
      options.maxQueueSize ?? 500,
      options.maxPerSecond ?? 5,
      (post) => post.externalId,
    );

    this.connect();
  }

  async fetchRecent(_keywords: string[], _sinceId?: string): Promise<RawPost[]> {
    return this.limiter.drain(this.batchSize);
  }

  getQueueDepth(): number {
    return this.limiter.pending;
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  private connect(): void {
    if (this.stopped || this.connecting || this.ws) return;
    this.connecting = true;

    const url = new URL(this.jetstreamUrl);
    if (this.lastCursorUs) {
      // Rewind cursor slightly on reconnect for gapless playback (Jetstream docs)
      const rewindUs = 5_000_000;
      url.searchParams.set("cursor", String(Math.max(0, this.lastCursorUs - rewindUs)));
    }

    const ws = new WebSocket(url.toString());
    this.ws = ws;

    ws.on("open", () => {
      this.connecting = false;
      console.log(`[BlueskyPostSource] Connected to ${url.hostname}`);
    });

    ws.on("message", (data) => {
      const raw = typeof data === "string" ? data : data.toString("utf8");
      this.handleMessage(raw);
    });

    ws.on("close", () => {
      this.connecting = false;
      this.ws = null;
      if (!this.stopped) this.scheduleReconnect();
    });

    ws.on("error", (err) => {
      console.warn("[BlueskyPostSource] WebSocket error:", err.message);
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectDelayMs);
  }

  private handleMessage(raw: string): void {
    let event: JetstreamEvent;
    try {
      event = JSON.parse(raw) as JetstreamEvent;
    } catch {
      return;
    }

    if (event.time_us) {
      this.lastCursorUs = event.time_us;
    }

    const post = parseJetstreamMessage(raw, {
      didToHandle: this.didToHandle,
      keywords: this.keywords,
    });
    if (post) {
      this.limiter.enqueue(post);
    }
  }
}

export { DEFAULT_JETSTREAM_HOST, buildJetstreamSubscribeUrl };
