import type { PostSource, RawPost } from "./types";

export class CompositePostSource implements PostSource {
  constructor(private readonly sources: PostSource[]) {}

  async fetchRecent(keywords: string[], sinceId?: string): Promise<RawPost[]> {
    const results = await Promise.all(
      this.sources.map((s) => s.fetchRecent(keywords, sinceId)),
    );
    return results.flat();
  }

  onDelete(callback: (externalId: string) => void): void {
    for (const source of this.sources) {
      if (source.onDelete) {
        source.onDelete(callback);
      }
    }
  }

  getQueueDepth(): number {
    let depth = 0;
    for (const source of this.sources) {
      if (source.getQueueDepth) {
        depth += source.getQueueDepth();
      }
    }
    return depth;
  }

  stop(): void {
    for (const source of this.sources) {
      if (typeof (source as any).stop === "function") {
        (source as any).stop();
      }
    }
  }
}
