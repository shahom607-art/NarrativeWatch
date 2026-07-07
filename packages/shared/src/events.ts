import Redis from "ioredis";
import type { SourcePostDTO, PatternClusterDTO } from "./types";

const CHANNEL = "narrativewatch:events";

let publisher: Redis | null = null;

function getPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
  }
  return publisher;
}

export async function emitNewPost(post: SourcePostDTO): Promise<void> {
  await getPublisher().publish(CHANNEL, JSON.stringify({ type: "new_post", payload: post }));
}

export async function emitClusterUpdate(cluster: PatternClusterDTO): Promise<void> {
  await getPublisher().publish(
    CHANNEL,
    JSON.stringify({ type: "cluster_update", payload: cluster }),
  );
}

export function subscribeToEvents(
  handler: (event: { type: string; payload: unknown }) => void,
): Redis {
  const sub = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
  sub.subscribe(CHANNEL);
  sub.on("message", (_channel, message) => {
    try {
      handler(JSON.parse(message));
    } catch {
      // ignore malformed
    }
  });
  return sub;
}
