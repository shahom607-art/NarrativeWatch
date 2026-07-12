import { Client } from "@opensearch-project/opensearch";
import type { SourcePostDTO } from "@narrativewatch/shared";

const OPENSEARCH_URL = process.env.OPENSEARCH_URL ?? "http://localhost:9200";
const INDEX_NAME = "posts";

let client: Client | null = null;

function getClient(): Client {
  if (!client) client = new Client({ node: OPENSEARCH_URL });
  return client;
}

export async function ensurePostsIndex(): Promise<void> {
  const os = getClient();
  const exists = await os.indices.exists({ index: INDEX_NAME });
  if (!exists.body) {
    await os.indices.create({
      index: INDEX_NAME,
      body: {
        mappings: {
          properties: {
            id: { type: "keyword" },
            content: { type: "text" },
            authorHandle: { type: "keyword" },
            authorId: { type: "keyword" },
            keywordMatched: { type: "keyword" },
            postedAt: { type: "date" },
            toxicityScore: { type: "float" },
            botScore: { type: "float" },
            clusterId: { type: "keyword" },
          },
        },
      },
    });
  }
}

export async function indexPost(post: SourcePostDTO): Promise<void> {
  const os = getClient();
  await os.index({
    index: INDEX_NAME,
    id: post.id,
    body: {
      id: post.id,
      content: post.content,
      authorHandle: post.authorHandle,
      authorId: post.authorId,
      keywordMatched: post.keywordMatched,
      postedAt: post.postedAt,
      toxicityScore: post.toxicityScore,
      botScore: post.botScore,
      clusterId: post.clusterId,
    },
    refresh: true,
  });
}

export async function deletePostFromIndex(id: string): Promise<void> {
  const os = getClient();
  await os.delete({
    index: INDEX_NAME,
    id,
    refresh: true,
  });
}
