import { Router } from "express";
import { z } from "zod";
import { prisma } from "@narrativewatch/database";
import { authMiddleware } from "../middleware/auth";

const router = Router();

const createSchema = z.object({
  label: z.string().min(1).max(100),
  keywords: z.array(z.string().min(1)).min(1).max(20),
});

router.use(authMiddleware);

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const userId = (req as typeof req & { user: { userId: string } }).user.userId;
  const saved = await prisma.savedSearch.create({
    data: {
      userId,
      label: parsed.data.label,
      keywords: parsed.data.keywords,
    },
  });

  res.status(201).json({
    id: saved.id,
    label: saved.label,
    keywords: saved.keywords,
    createdAt: saved.createdAt.toISOString(),
  });
});

router.get("/", async (req, res) => {
  const userId = (req as typeof req & { user: { userId: string } }).user.userId;
  const items = await prisma.savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  res.json(
    items.map((s) => ({
      id: s.id,
      label: s.label,
      keywords: s.keywords,
      createdAt: s.createdAt.toISOString(),
    })),
  );
});

router.delete("/:id", async (req, res) => {
  const userId = (req as typeof req & { user: { userId: string } }).user.userId;
  const existing = await prisma.savedSearch.findFirst({
    where: { id: req.params.id, userId },
  });

  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await prisma.savedSearch.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
