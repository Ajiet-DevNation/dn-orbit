// Plain (server-safe) helpers shared by the server page and the client
// StatsSection. Kept out of the "use client" module so the server can call it.

export interface LanguageStat {
  name: string;
  pct: number;
}

// GitHub's topLanguages is { "TypeScript": 12400, ... } — turn it into the
// top 5 sorted descending, with bar widths relative to the largest.
export function languagesFromRecord(
  rec: Record<string, number> | null | undefined,
): LanguageStat[] {
  if (!rec || typeof rec !== "object") return [];
  const entries = Object.entries(rec).filter(([, v]) => typeof v === "number");
  entries.sort((a, b) => b[1] - a[1]);
  const top = entries.slice(0, 5);
  const max = top[0]?.[1] ?? 1;
  return top.map(([name, count]) => ({
    name,
    pct: Math.max(12, Math.round((count / max) * 100)),
  }));
}
