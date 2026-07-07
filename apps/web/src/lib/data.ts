import type { SourcePostDTO, PatternClusterDTO, PaginatedResponse } from "@narrativewatch/shared";
import { apiFetch } from "./api";

export type { SourcePostDTO, PatternClusterDTO, PaginatedResponse };

export function getPosts(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<PaginatedResponse<SourcePostDTO>>(`/api/posts?${qs}`);
}

export function getPost(id: string) {
  return apiFetch<SourcePostDTO>(`/api/posts/${id}`);
}

export function getClusters(window = "24h") {
  return apiFetch<PatternClusterDTO[]>(`/api/clusters?window=${window}`);
}

export function getCluster(id: string) {
  return apiFetch<PatternClusterDTO & { posts: SourcePostDTO[] }>(`/api/clusters/${id}`);
}

export function getAccount(handle: string) {
  return apiFetch<{
    handle: string;
    postCount: number;
    avgBotScore: number;
    posts: SourcePostDTO[];
  }>(`/api/accounts/${handle}`);
}

export function getEducation() {
  return apiFetch<import("@narrativewatch/shared").EducationContent>("/api/education");
}

export function getIngestionKeywords() {
  return apiFetch<{ keywords: string[] }>("/api/ingestion-keywords");
}
