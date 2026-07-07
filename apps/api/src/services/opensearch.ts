import { Client } from "@opensearch-project/opensearch";
import type { SourcePostDTO } from "@narrativewatch/shared";

const OPENSEARCH_URL = process.env.OPENSEARCH_URL ?? "http://localhost:9200";
const INDEX_NAME = "posts";

let client: Client | null = null;

export function getOpenSearchClient(): Client {
  if (!client) {
    client = new Client({ node: OPENSEARCH_URL });
  }
  return client;
}

export async function ensurePostsIndex(): Promise<void> {
  const os = getOpenSearchClient();
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
  const os = getOpenSearchClient();
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

export interface PostSearchFilters {
  keyword?: string;
  from?: Date;
  to?: Date;
  minBotScore?: number;
  page?: number;
  pageSize?: number;
}

export async function searchPosts(filters: PostSearchFilters): Promise<{
  ids: string[];
  total: number;
}> {
  const os = getOpenSearchClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const must: object[] = [];

  if (filters.keyword) {
    must.push({
      bool: {
        should: [
          { match: { content: filters.keyword } },
          { term: { keywordMatched: filters.keyword } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  if (filters.from || filters.to) {
    const range: Record<string, string> = {};
    if (filters.from) range.gte = filters.from.toISOString();
    if (filters.to) range.lte = filters.to.toISOString();
    must.push({ range: { postedAt: range } });
  }

  if (filters.minBotScore !== undefined) {
    must.push({ range: { botScore: { gte: filters.minBotScore } } });
  }

  const result = await os.search({
    index: INDEX_NAME,
    body: {
      from: (page - 1) * pageSize,
      size: pageSize,
      sort: [{ postedAt: { order: "desc" } }],
      query: must.length > 0 ? { bool: { must } } : { match_all: {} },
    },
  });

  const hits = result.body.hits.hits as Array<{ _id: string }>;
  const total =
    typeof result.body.hits.total === "number"
      ? result.body.hits.total
      : (result.body.hits.total?.value ?? 0);

  return {
    ids: hits.map((h) => h._id),
    total,
  };
}
