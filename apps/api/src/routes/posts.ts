import { Router } from "express";
import { prisma } from "@narrativewatch/database";
import { toPostDTO } from "../serializers";
import { searchPosts } from "../services/opensearch";

const router = Router();

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

router.get("/", async (req, res) => {
  const keyword = typeof req.query.keyword === "string" ? req.query.keyword : undefined;
  const from = parseDate(req.query.from);
  const to = parseDate(req.query.to);
  const minBotScore =
    typeof req.query.minBotScore === "string"
      ? parseFloat(req.query.minBotScore)
      : undefined;
  const page = typeof req.query.page === "string" ? parseInt(req.query.page, 10) : 1;
  const pageSize = 20;

  try {
    const { ids, total } = await searchPosts({
      keyword,
      from,
      to,
      minBotScore: Number.isFinite(minBotScore) ? minBotScore : undefined,
      page: Number.isFinite(page) ? page : 1,
      pageSize,
    });

    const posts =
      ids.length > 0
        ? await prisma.sourcePost.findMany({
            where: { id: { in: ids } },
          })
        : [];

    const postMap = new Map(posts.map((p) => [p.id, p]));
    const ordered = ids.map((id) => postMap.get(id)).filter(Boolean);

    res.json({
      data: ordered.map((p) => toPostDTO(p!)),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch {
    const where: Record<string, unknown> = {};
    if (keyword) where.keywordMatched = keyword;
    if (from || to) {
      where.postedAt = {};
      if (from) (where.postedAt as Record<string, Date>).gte = from;
      if (to) (where.postedAt as Record<string, Date>).lte = to;
    }
    if (minBotScore !== undefined) where.botScore = { gte: minBotScore };

    const skip = (Math.max(page, 1) - 1) * pageSize;
    const [posts, total] = await Promise.all([
      prisma.sourcePost.findMany({
        where,
        orderBy: { postedAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.sourcePost.count({ where }),
    ]);

    res.json({
      data: posts.map(toPostDTO),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  }
});

router.get("/:id", async (req, res) => {
  const post = await prisma.sourcePost.findUnique({ where: { id: req.params.id } });
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.json(toPostDTO(post));
});

export default router;
