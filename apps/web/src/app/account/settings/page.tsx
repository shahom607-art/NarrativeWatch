"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { SavedSearchDTO, TrackedAccountDTO, ReportLogDTO } from "@narrativewatch/shared";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const token = (session as { accessToken?: string } | null)?.accessToken;

  const [savedSearches, setSavedSearches] = useState<SavedSearchDTO[]>([]);
  const [trackedAccounts, setTrackedAccounts] = useState<TrackedAccountDTO[]>([]);
  const [reportLogs, setReportLogs] = useState<ReportLogDTO[]>([]);

  const [searchLabel, setSearchLabel] = useState("");
  const [searchKeywords, setSearchKeywords] = useState("");
  const [trackHandle, setTrackHandle] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiFetch<SavedSearchDTO[]>("/api/saved-searches", {}, token),
      apiFetch<TrackedAccountDTO[]>("/api/tracked-accounts", {}, token),
      apiFetch<ReportLogDTO[]>("/api/report-log", {}, token),
    ]).then(([s, t, r]) => {
      setSavedSearches(s);
      setTrackedAccounts(t);
      setReportLogs(r);
    });
  }, [token]);

  async function addSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const keywords = searchKeywords.split(",").map((k) => k.trim()).filter(Boolean);
    const created = await apiFetch<SavedSearchDTO>(
      "/api/saved-searches",
      { method: "POST", body: JSON.stringify({ label: searchLabel, keywords }) },
      token,
    );
    setSavedSearches((prev) => [created, ...prev]);
    setSearchLabel("");
    setSearchKeywords("");
  }

  async function addTracked(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const created = await apiFetch<TrackedAccountDTO>(
      "/api/tracked-accounts",
      { method: "POST", body: JSON.stringify({ handle: trackHandle }) },
      token,
    );
    setTrackedAccounts((prev) => [created, ...prev]);
    setTrackHandle("");
  }

  async function deleteSearch(id: string) {
    if (!token) return;
    await apiFetch(`/api/saved-searches/${id}`, { method: "DELETE" }, token);
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
  }

  async function deleteTracked(id: string) {
    if (!token) return;
    await apiFetch(`/api/tracked-accounts/${id}`, { method: "DELETE" }, token);
    setTrackedAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  if (status === "loading") return <p className="text-gray-400">Loading...</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">Account settings</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Saved searches</h2>
        <form onSubmit={addSearch} className="flex flex-wrap gap-2">
          <input
            placeholder="Label"
            value={searchLabel}
            onChange={(e) => setSearchLabel(e.target.value)}
            required
            className="rounded border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            placeholder="Keywords (comma-separated)"
            value={searchKeywords}
            onChange={(e) => setSearchKeywords(e.target.value)}
            required
            className="min-w-[200px] flex-1 rounded border border-border bg-card px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded bg-accent px-4 py-2 text-sm text-white">
            Save
          </button>
        </form>
        <ul className="space-y-2">
          {savedSearches.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded border border-border bg-card px-3 py-2 text-sm"
            >
              <span>
                <strong>{s.label}</strong>: {s.keywords.join(", ")}
              </span>
              <button onClick={() => deleteSearch(s.id)} className="text-red-400 hover:underline">
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Tracked accounts</h2>
        <form onSubmit={addTracked} className="flex gap-2">
          <input
            placeholder="@handle"
            value={trackHandle}
            onChange={(e) => setTrackHandle(e.target.value)}
            required
            className="flex-1 rounded border border-border bg-card px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded bg-accent px-4 py-2 text-sm text-white">
            Track
          </button>
        </form>
        <ul className="space-y-2">
          {trackedAccounts.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded border border-border bg-card px-3 py-2 text-sm"
            >
              <a href={`/account/${a.handle}`} className="text-accent hover:underline">
                @{a.handle}
              </a>
              <button onClick={() => deleteTracked(a.id)} className="text-red-400 hover:underline">
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Report history</h2>
        <p className="text-xs text-gray-500">
          Logs showing when you visited the report form on Bluesky. Note that NarrativeWatch does not
          report on your behalf.
        </p>
        <ul className="space-y-2">
          {reportLogs.length === 0 ? (
            <li className="text-sm text-gray-400">No report log entries yet.</li>
          ) : (
            reportLogs.map((r) => (
              <li key={r.id} className="rounded border border-border bg-card px-3 py-2 text-sm">
                Post {r.postId.slice(0, 8)}… · {new Date(r.reportedAt).toLocaleString()} ·{" "}
                {r.channel}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
