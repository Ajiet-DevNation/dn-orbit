"use client";

import { useEffect, useMemo, useState } from "react";
import { toTitleCase } from "@/lib/names";
import { Command, CommandInput } from "@/components/ui/8bit-command";

export interface LogEntry {
  id: string;
  action: string;
  actorName: string | null;
  summary: string;
  createdAt: string; // ISO
}

// Full local date + time, e.g. "06/19/2026 - 18:32:57" — precise enough to pin
// down exactly when a suspicious action happened.
function stamp(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  const date = `${p(d.getMonth() + 1)}/${p(d.getDate())}/${d.getFullYear()}`;
  const time = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  return `${date} - ${time}`;
}

// Live activity feed. Seeded from the server (no flash), then polls the logs API
// so new entries "pop in" without a manual refresh. The list is virtualised by
// nature of the capped query (newest N), and scrolls — so it stays snappy no
// matter how many total logs exist. A client-side search filters the loaded
// window across the timestamp, action tag, actor, and summary so an admin can
// quickly isolate activity by date, person, or action type.
export function SystemLogs({ initial }: { initial: LogEntry[] }) {
  const [logs, setLogs] = useState<LogEntry[]>(initial);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        // Pull the largest window the API allows so search covers as much
        // history as possible, not just the newest 100.
        const res = await fetch("/api/admin/logs?take=200", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data.logs)) setLogs(data.logs as LogEntry[]);
      } catch {
        // transient network error — next tick retries
      }
    };
    const id = setInterval(poll, 12000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalized) return logs;
    return logs.filter((log) =>
      [stamp(log.createdAt), log.action, log.actorName ?? "", log.summary]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [logs, normalized]);

  return (
    <div className="space-y-4">
      {/* Pixel search bar — filters the loaded log window client-side. */}
      <div className="max-w-sm px-1.5">
        <Command shouldFilter={false} className="w-full border-white/10">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="SEARCH — DATE, USER, ACTION…"
            aria-label="Search logs"
            className="text-[10px] uppercase tracking-wider"
          />
        </Command>
      </div>

      {logs.length === 0 ? (
        <p className="retro text-[9px] uppercase tracking-widest text-zinc-600">
          NO ACTIVITY YET — ACTIONS WILL APPEAR HERE.
        </p>
      ) : filtered.length === 0 ? (
        <p className="retro text-[9px] uppercase tracking-widest text-zinc-600">
          NO LOGS MATCH THAT SEARCH.
        </p>
      ) : (
        <div className="no-scrollbar max-h-[60vh] space-y-2 overflow-y-auto">
          {filtered.map((log) => (
            <div
              key={log.id}
              className="border-2 border-white/10 p-3 transition-colors hover:border-[#22c55e]/40 hover:bg-[#22c55e]/[0.04]"
            >
              <div className="flex items-center gap-3">
                <span className="retro shrink-0 text-[8px] text-[#22c55e]/60">
                  [{stamp(log.createdAt)}]
                </span>
                <span className="retro truncate text-[8px] tracking-widest text-zinc-600">
                  {log.action}
                </span>
              </div>
              <p className="retro mt-1.5 text-[10px] leading-relaxed text-zinc-300">
                {log.summary}
                {log.actorName ? (
                  <span className="text-[#22c55e]/70"> — {toTitleCase(log.actorName)}</span>
                ) : null}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
