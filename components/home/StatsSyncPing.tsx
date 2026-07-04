"use client";

import { useEffect } from "react";

// Fire-and-forget nudge that replaces the old stats cron: if the cached stats
// are stale, the server refreshes them in the background (SWR — this visitor
// sees cached data, the next one sees fresh; see lib/sync.ts). Delayed past
// first paint so it never competes with hydration, and errors are irrelevant
// to the visitor.
export function StatsSyncPing() {
  useEffect(() => {
    const id = window.setTimeout(() => {
      fetch("/api/sync", { method: "POST", keepalive: true }).catch(() => {});
    }, 2500);
    return () => window.clearTimeout(id);
  }, []);
  return null;
}
