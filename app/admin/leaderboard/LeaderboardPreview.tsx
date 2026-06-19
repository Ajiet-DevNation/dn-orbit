"use client";

import { useMemo, useState } from "react";
import { Command, CommandInput } from "@/components/ui/8bit-command";

export interface PreviewRow {
  id: string;
  totalScore: number;
  name: string | null;
  branch: string | null;
  year: number | null;
}

// How many rows to show when no search is active — mirrors the "TOP_10" label.
const TOP_N = 10;

// Client-side leaderboard preview. Receives the full, score-sorted roster so a
// name search can reach beyond the top 10; with no query it shows just the top
// slice. Each row keeps its true standing (its index in the full sorted list),
// so a match deep in the rankings still displays its real position.
export function LeaderboardPreview({ rows }: { rows: PreviewRow[] }) {
  const [query, setQuery] = useState("");

  const ranked = useMemo(
    () => rows.map((r, i) => ({ ...r, position: i + 1 })),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ranked.slice(0, TOP_N);
    return ranked.filter((r) => (r.name ?? "").toLowerCase().includes(q));
  }, [ranked, query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 border-b-2 border-white/10 pb-2">
        <span className="retro text-[9px] tracking-widest text-zinc-500">
          {query ? "PREVIEW_TELEMETRY (SEARCH)" : `PREVIEW_TELEMETRY (TOP_${TOP_N})`}
        </span>
      </div>

      <div className="max-w-xs px-1.5">
        <Command shouldFilter={false} className="w-full border-white/10">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="SEARCH BY NAME…"
            aria-label="Search leaderboard by name"
            className="text-[10px] uppercase tracking-wider"
          />
        </Command>
      </div>

      <div className="border-2 border-white/10 divide-y-2 divide-zinc-900 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="retro px-5 py-10 text-center text-[9px] text-zinc-600">
            NO MATCHING ENTRIES
          </div>
        ) : (
          filtered.map((s) => (
            <div
              key={s.id}
              className="p-4 flex items-center justify-between hover:bg-zinc-950 transition-all group"
            >
              <div className="flex items-center gap-6">
                <span className="retro text-xl text-zinc-700 group-hover:text-[#22c55e] transition-colors">
                  {s.position.toString().padStart(2, "0")}
                </span>
                <div className="flex flex-col">
                  <span className="retro text-[10px] uppercase tracking-tight text-white">
                    {s.name || "ANONYMOUS"}
                  </span>
                  <span className="retro text-[8px] text-zinc-600 tracking-widest uppercase">
                    {s.branch} ({s.year}y)
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="retro text-base text-[#22c55e] tabular-nums">
                  {s.totalScore.toFixed(2)}
                </div>
                <div className="retro text-[8px] text-zinc-700 uppercase tracking-widest">
                  SCORE_VALUE
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
