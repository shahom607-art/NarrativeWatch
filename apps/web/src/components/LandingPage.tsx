import Link from "next/link";
import { LiveStatsSnippet } from "@/components/LiveStatsSnippet";

export function LandingPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 py-8">
      <section className="space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight">NarrativeWatch</h1>
        <p className="text-lg leading-relaxed text-gray-300">
          A research and awareness tool for spotting suspected coordinated hate-speech and
          inauthentic activity patterns online. All findings are suspected pattern matches, not
          verified conclusions. This tool is built for understanding, not enforcement.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/auth/register"
            className="rounded bg-accent px-6 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            Sign up
          </Link>
          <Link
            href="/auth/login"
            className="rounded border border-border px-6 py-2.5 text-sm font-medium hover:border-accent"
          >
            Log in
          </Link>
        </div>
      </section>

      <LiveStatsSnippet />
    </div>
  );
}
