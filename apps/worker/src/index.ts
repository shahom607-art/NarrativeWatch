import "./env";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { BlueskyPostSource } from "@narrativewatch/shared";
import { ensurePostsIndex } from "./opensearch";
import { createPostSource, loadKeywordsForIngestion, resolvePostSourceKind } from "./create-post-source";
import { processRawPosts } from "./process-posts";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const KEYWORDS = loadKeywordsForIngestion();
const INTERVAL_MS = parseInt(process.env.INGESTION_INTERVAL_MS ?? "15000", 10);
const POST_SOURCE = resolvePostSourceKind();

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
const postSource = createPostSource(KEYWORDS);

const ingestQueue = new Queue("ingestion", { connection });

async function runIngestion(): Promise<void> {
  await ensurePostsIndex();

  const rawPosts = await postSource.fetchRecent(KEYWORDS);
  const processed = await processRawPosts(rawPosts);

  if (processed > 0) {
    console.log(`[worker] Processed ${processed} post(s) from ${POST_SOURCE} source`);
  }

  if (postSource instanceof BlueskyPostSource && postSource.getQueueDepth() > 0) {
    console.log(`[worker] Bluesky queue depth: ${postSource.getQueueDepth()} pending (rate-limited)`);
  }
}

async function scheduleIngestion(): Promise<void> {
  const pollMs = POST_SOURCE === "bluesky" ? Math.min(INTERVAL_MS, 3000) : INTERVAL_MS;

  await ingestQueue.add(
    "fetch",
    {},
    {
      repeat: { every: pollMs },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  );
}

async function main() {
  console.log(
    `NarrativeWatch worker starting (POST_SOURCE=${POST_SOURCE}, keywords: ${KEYWORDS.join(", ")})`,
  );

  const worker = new Worker(
    "ingestion",
    async () => {
      await runIngestion();
    },
    { connection },
  );

  worker.on("failed", (_job, err) => {
    console.error("Ingestion job failed:", err);
  });

  process.on("SIGINT", () => {
    if (postSource instanceof BlueskyPostSource) postSource.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    if (postSource instanceof BlueskyPostSource) postSource.stop();
    process.exit(0);
  });

  await scheduleIngestion();
  await ingestQueue.add("fetch-initial", {}, { removeOnComplete: true });

  const pollMs = POST_SOURCE === "bluesky" ? Math.min(INTERVAL_MS, 3000) : INTERVAL_MS;
  console.log(`Ingestion scheduled every ${pollMs}ms`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
