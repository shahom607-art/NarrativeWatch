import { Router } from "express";
import { prisma } from "@narrativewatch/database";
import { toClusterDTO, toPostDTO } from "../serializers";

const router = Router();

function windowToDate(window: string): Date {
  const now = Date.now();
  switch (window) {
    case "1h":
      return new Date(now - 3600000);
    case "7d":
      return new Date(now - 7 * 86400000);
    case "24h":
    default:
      return new Date(now - 86400000);
  }
}

router.get("/", async (req, res) => {
  const window = typeof req.query.window === "string" ? req.query.window : "24h";
  const since = windowToDate(window);

  const clusters = await prisma.patternCluster.findMany({
    where: { lastSeen: { gte: since } },
    orderBy: { postCount: "desc" },
    take: 50,
  });

  res.json(clusters.map(toClusterDTO));
});

router.get("/:id", async (req, res) => {
  const cluster = await prisma.patternCluster.findUnique({
    where: { id: req.params.id },
    include: {
      posts: {
        orderBy: { postedAt: "desc" },
        take: 50,
      },
    },
  });

  if (!cluster) {
    res.status(404).json({ error: "Cluster not found" });
    return;
  }

  res.json({
    ...toClusterDTO(cluster),
    posts: cluster.posts.map(toPostDTO),
  });
});

export default router;
