import WebSocket from "ws";
import type { PostSource, RawPost } from "./types";
import { IngestRateLimiter } from "./ingest-rate-limiter";
import { matchKeyword } from "./keywords";

export interface MastodonPostSourceOptions {
  keywords: string[];
  instanceUrl?: string;
  accessToken?: string;
  maxQueueSize?: number;
  maxPerSecond?: number;
  batchSize?: number;
  reconnectDelayMs?: number;
}

export class MastodonPostSource implements PostSource {
  private readonly keywords: string[];
  private readonly instanceUrl: string;
  private readonly accessToken?: string;
  private readonly batchSize: number;
  private readonly reconnectDelayMs: number;
  private readonly limiter: IngestRateLimiter<RawPost>;

  private ws: WebSocket | null = null;
  private connecting = false;
  private stopped = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private deleteCallback?: (externalId: string) => void;



  constructor(options: MastodonPostSourceOptions) {
    this.keywords = options.keywords;
    let url = options.instanceUrl ?? process.env.MASTODON_INSTANCE_URL ?? "https://mastodon.social";
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }
    this.instanceUrl = url;
    this.accessToken = options.accessToken ?? process.env.MASTODON_ACCESS_TOKEN;
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

  onDelete(callback: (externalId: string) => void): void {
    this.deleteCallback = callback;
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  private async getStreamingUrl(): Promise<string> {
    try {
      const res = await fetch(`${this.instanceUrl}/api/v2/instance`);
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data && data.configuration && data.configuration.urls && data.configuration.urls.streaming) {
          return data.configuration.urls.streaming;
        }
      }
    } catch (err: any) {
      console.warn(`[MastodonPostSource] Failed to discover streaming URL via configuration:`, err.message);
    }
    // Fallback: convert http -> ws, https -> wss
    const wsProto = this.instanceUrl.startsWith("https://") ? "wss://" : "ws://";
    const host = this.instanceUrl.replace(/^https?:\/\//, "");
    return `${wsProto}${host}`;
  }

  private async connect(): Promise<void> {
    if (this.stopped || this.connecting || this.ws) return;
    this.connecting = true;

    try {
      const streamingBaseUrl = await this.getStreamingUrl();
      const url = new URL(streamingBaseUrl);
      if (url.pathname === "/" || url.pathname === "") {
        url.pathname = "/api/v1/streaming";
      }
      url.searchParams.set("stream", "public");

      if (this.accessToken) {
        url.searchParams.set("access_token", this.accessToken);
      }

      console.log(`[MastodonPostSource] Connecting to ${url.toString()}...`);
      const ws = new WebSocket(url.toString());
      this.ws = ws;

      ws.on("open", () => {
        this.connecting = false;
        console.log(`[MastodonPostSource] Connected to ${url.hostname}`);
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
        console.warn("[MastodonPostSource] WebSocket error:", err.message);
      });
    } catch (err: any) {
      this.connecting = false;
      console.error("[MastodonPostSource] Connection error:", err.message);
      if (!this.stopped) this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectDelayMs);
  }

  private handleMessage(raw: string): void {
    let event: { event: string; payload: any; stream?: string[] };
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }

    if (event.event === "update") {
      let statusObj = event.payload;
      if (typeof statusObj === "string") {
        try {
          statusObj = JSON.parse(statusObj);
        } catch {
          return;
        }
      }

      if (!statusObj || !statusObj.id || !statusObj.content || !statusObj.account) {
        return;
      }

      const plainText = cleanMastodonContent(statusObj.content);
      const keywordMatched = matchKeyword(plainText, this.keywords);
      if (!keywordMatched) return;

      const rawPost: RawPost = {
        platform: "mastodon",
        externalId: String(statusObj.id),
        authorHandle: statusObj.account.acct || statusObj.account.username,
        authorId: String(statusObj.account.id),
        content: plainText,
        postedAt: statusObj.created_at ? new Date(statusObj.created_at) : new Date(),
        keywordMatched,
        accountCreatedAt: null,
        accountPostCount: null,
      };

      this.limiter.enqueue(rawPost);
    } else if (event.event === "delete") {
      const deletedId = String(event.payload);
      if (this.deleteCallback && deletedId) {
        this.deleteCallback(deletedId);
      }
    }
  }
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function cleanMastodonContent(html: string): string {
  const text = html.replace(/<[^>]*>/g, "");
  return decodeEntities(text).trim();
}
