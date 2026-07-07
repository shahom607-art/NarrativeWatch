import type { BotScoreBreakdown } from "@narrativewatch/shared";
import { scoreColor } from "@/lib/utils";

export function ScoreBreakdown({ breakdown }: { breakdown: BotScoreBreakdown | null }) {
  if (!breakdown) {
    return <p className="text-sm text-gray-400">Score breakdown unavailable.</p>;
  }

  const rows = [
    { label: "Posting frequency (30%)", value: breakdown.postingFrequency },
    { label: "Text near-duplication (40%)", value: breakdown.textDuplication },
    {
      label: "Account age / activity (15%)",
      value: breakdown.accountAgeUnavailable ? null : breakdown.accountAgeRatio,
      unavailable: breakdown.accountAgeUnavailable,
    },
    { label: "Toxicity contribution (15%)", value: breakdown.toxicityContribution },
  ];

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between text-sm">
          <span className="text-gray-400">{row.label}</span>
          <span className={scoreColor(row.value)}>
            {row.unavailable ? "unavailable" : `${row.value ?? 0}/100`}
          </span>
        </div>
      ))}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-2 font-medium">
        <span>Composite pattern match score</span>
        <span className={scoreColor(breakdown.total)}>{breakdown.total}/100 suspected</span>
      </div>
    </div>
  );
}
