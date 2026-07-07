"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { SourcePostDTO, PatternClusterDTO } from "@narrativewatch/shared";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000";

export function useLiveFeed() {
  const [posts, setPosts] = useState<SourcePostDTO[]>([]);
  const [clusterUpdates, setClusterUpdates] = useState<PatternClusterDTO[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let socket: Socket | null = null;

    socket = io(`${WS_URL}/live`, { path: "/socket.io", transports: ["websocket", "polling"] });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("new_post", (post: SourcePostDTO) => {
      setPosts((prev) => [post, ...prev].slice(0, 200));
    });

    socket.on("cluster_update", (cluster: PatternClusterDTO) => {
      setClusterUpdates((prev) => [cluster, ...prev].slice(0, 20));
    });

    return () => {
      socket?.disconnect();
    };
  }, []);

  return { posts, clusterUpdates, connected };
}
