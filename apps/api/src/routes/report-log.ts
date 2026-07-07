import { Router } from "express";
import { z } from "zod";
import { prisma } from "@narrativewatch/database";
import { authMiddleware } from "../middleware/auth";

const router = Router();

const createSchema = z.object({
  postId: z.string().min(1),
  channel: z.string().default("x_report_flow"),
});

router.post("/", authMiddleware, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const userId = (req as typeof req & { user: { userId: string } }).user.userId;
  const log = await prisma.reportLog.create({
    data: {
      userId,
      postId: parsed.data.postId,
      channel: parsed.data.channel,
    },
  });

  res.status(201).json({
    id: log.id,
    postId: log.postId,
    reportedAt: log.reportedAt.toISOString(),
    channel: log.channel,
  });
});

router.get("/", authMiddleware, async (req, res) => {
  const userId = (req as typeof req & { user: { userId: string } }).user.userId;
  const logs = await prisma.reportLog.findMany({
    where: { userId },
    orderBy: { reportedAt: "desc" },
    take: 100,
  });

  res.json(
    logs.map((l) => ({
      id: l.id,
      postId: l.postId,
      reportedAt: l.reportedAt.toISOString(),
      channel: l.channel,
    })),
  );
});

export default router;
