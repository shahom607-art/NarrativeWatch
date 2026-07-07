import { Router } from "express";
import { z } from "zod";
import { prisma } from "@narrativewatch/database";
import { authMiddleware } from "../middleware/auth";

const router = Router();

const createSchema = z.object({
  handle: z.string().min(1).max(50).regex(/^@?[a-zA-Z0-9_]+$/),
});

router.use(authMiddleware);

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const handle = parsed.data.handle.replace(/^@/, "");
  const userId = (req as typeof req & { user: { userId: string } }).user.userId;

  const account = await prisma.trackedAccount.upsert({
    where: { userId_handle: { userId, handle } },
    create: { userId, handle },
    update: {},
  });

  res.status(201).json({
    id: account.id,
    handle: account.handle,
    addedAt: account.addedAt.toISOString(),
  });
});

router.get("/", async (req, res) => {
  const userId = (req as typeof req & { user: { userId: string } }).user.userId;
  const items = await prisma.trackedAccount.findMany({
    where: { userId },
    orderBy: { addedAt: "desc" },
  });

  res.json(
    items.map((a) => ({
      id: a.id,
      handle: a.handle,
      addedAt: a.addedAt.toISOString(),
    })),
  );
});

router.delete("/:id", async (req, res) => {
  const userId = (req as typeof req & { user: { userId: string } }).user.userId;
  const existing = await prisma.trackedAccount.findFirst({
    where: { id: req.params.id, userId },
  });

  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await prisma.trackedAccount.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
