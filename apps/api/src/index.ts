import "./env";
import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import authRoutes from "./routes/auth";
import postsRoutes from "./routes/posts";
import clustersRoutes from "./routes/clusters";
import savedSearchesRoutes from "./routes/saved-searches";
import trackedAccountsRoutes from "./routes/tracked-accounts";
import reportLogRoutes from "./routes/report-log";
import accountsRoutes from "./routes/accounts";
import educationRoutes from "./routes/education";
import ingestionKeywordsRoutes from "./routes/ingestion-keywords";
import { ensurePostsIndex } from "./services/opensearch";
import { subscribeToEvents } from "@narrativewatch/shared";

const PORT = parseInt(process.env.API_PORT ?? "4000", 10);
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const CORS_ORIGIN = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

async function main() {
  const app = express();
  app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "narrativewatch-api" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/posts", postsRoutes);
  app.use("/api/clusters", clustersRoutes);
  app.use("/api/saved-searches", savedSearchesRoutes);
  app.use("/api/tracked-accounts", trackedAccountsRoutes);
  app.use("/api/report-log", reportLogRoutes);
  app.use("/api/accounts", accountsRoutes);
  app.use("/api/education", educationRoutes);
  app.use("/api/ingestion-keywords", ingestionKeywordsRoutes);

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: CORS_ORIGIN, credentials: true },
    path: "/socket.io",
  });

  const pubClient = createClient({ url: REDIS_URL });
  const subClient = pubClient.duplicate();
  await pubClient.connect();
  await subClient.connect();
  io.adapter(createAdapter(pubClient, subClient));

  const liveNs = io.of("/live");
  liveNs.on("connection", (socket) => {
    socket.emit("connected", { message: "Subscribed to live feed" });
  });

  subscribeToEvents((event) => {
    if (event.type === "new_post") {
      liveNs.emit("new_post", event.payload);
    } else if (event.type === "cluster_update") {
      liveNs.emit("cluster_update", event.payload);
    }
  });

  try {
    await ensurePostsIndex();
  } catch (err) {
    console.warn("OpenSearch not ready yet — search will fall back to Postgres:", err);
  }

  server.listen(PORT, () => {
    console.log(`NarrativeWatch API listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export {};
