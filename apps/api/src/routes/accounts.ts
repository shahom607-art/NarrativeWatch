import { Router } from "express";
import { prisma } from "@narrativewatch/database";
import { toPostDTO } from "../serializers";

const router = Router();

router.get("/:handle", async (req, res) => {
  const handle = req.params.handle.replace(/^@/, "");

  const posts = await prisma.sourcePost.findMany({
    where: { authorHandle: handle },
    orderBy: { postedAt: "desc" },
    take: 100,
  });

  const avgBotScore =
    posts.length > 0
      ? posts.reduce((sum, p) => sum + (p.botScore ?? 0), 0) / posts.length
      : 0;

  res.json({
    handle,
    postCount: posts.length,
    avgBotScore: Math.round(avgBotScore * 10) / 10,
    posts: posts.map(toPostDTO),
  });
});

export default router;
