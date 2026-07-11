import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@narrativewatch/database";
import { authMiddleware, signToken } from "../middleware/auth";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const googleOAuthSchema = z.object({
  email: z.string().email(),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    if (!existing.passwordHash) {
      res.status(409).json({ error: "This email is registered via Google. Please sign in with Google." });
      return;
    }
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: { email: parsed.data.email, passwordHash },
  });

  const token = signToken({ userId: user.id, email: user.email });
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
  });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (!user.passwordHash) {
    res.status(401).json({ error: "This account uses Google sign-in" });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email });
  res.json({
    token,
    user: { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
  });
});

router.post("/oauth/google", async (req, res) => {
  const syncSecret = process.env.OAUTH_SYNC_SECRET;
  if (!syncSecret || req.headers["x-oauth-sync-secret"] !== syncSecret) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = googleOAuthSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  let user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email: parsed.data.email, passwordHash: null },
    });
  }

  const token = signToken({ userId: user.id, email: user.email });
  res.json({
    token,
    user: { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
  });
});

router.get("/me", authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: (req as typeof req & { user: { userId: string } }).user.userId },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ id: user.id, email: user.email, createdAt: user.createdAt.toISOString() });
});

export default router;
