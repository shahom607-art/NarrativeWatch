/**
 * In-memory bounded queue with token-bucket rate limiting for firehose spikes.
 */
export class IngestRateLimiter<T> {
  private readonly buffer: T[] = [];
  private readonly seenIds = new Set<string>();
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly maxQueueSize: number,
    private readonly maxPerSecond: number,
    private readonly getId: (item: T) => string,
  ) {
    this.tokens = maxPerSecond;
    this.lastRefill = Date.now();
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    if (elapsed <= 0) return;
    this.tokens = Math.min(this.maxPerSecond, this.tokens + elapsed * this.maxPerSecond);
    this.lastRefill = now;
  }

  enqueue(item: T): boolean {
    const id = this.getId(item);
    if (this.seenIds.has(id)) return false;

    if (this.buffer.length >= this.maxQueueSize) {
      const dropped = this.buffer.shift();
      if (dropped) this.seenIds.delete(this.getId(dropped));
    }

    this.buffer.push(item);
    this.seenIds.add(id);
    return true;
  }

  drain(maxBatch: number): T[] {
    this.refillTokens();
    const batch: T[] = [];
    while (batch.length < maxBatch && this.buffer.length > 0 && this.tokens >= 1) {
      const item = this.buffer.shift()!;
      batch.push(item);
      this.tokens -= 1;
    }
    return batch;
  }

  get pending(): number {
    return this.buffer.length;
  }
}
