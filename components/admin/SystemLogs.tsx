"use client";

import { useEffect, useState } from "react";
import { toTitleCase } from "@/lib/names";

export interface LogEntry {
  id: string;
  action: string;
  actorName: string | null;
  summary: string;
  createdAt: string; // ISO
}

function stamp(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Live activity feed. Seeded from the server (no flash), then polls the logs API
// so new entries "pop in" without a manual refresh. The list is virtualised by
// nature of the capped query (newest N), and scrolls — so it stays snappy no
// matter how many total logs exist.
export function SystemLogs({ initial }: { initial: LogEntry[] }) {
  const [logs, setLogs] = useState<LogEntry[]>(initial);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/admin/logs", { cache: "no-store" });
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

  if (logs.length === 0) {
    return (
      <p className="retro text-[9px] uppercase tracking-widest text-zinc-600">
        NO ACTIVITY YET — ACTIONS WILL APPEAR HERE.
      </p>
    );
  }

  return (
    <div className="no-scrollbar max-h-[60vh] space-y-2 overflow-y-auto">
      {logs.map((log) => (
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
  );
}
