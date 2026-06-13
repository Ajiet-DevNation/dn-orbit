"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/8bit-card";
import { Button } from "@/components/ui/8bit-button";
import { Progress } from "@/components/ui/8bit-progress";
import type { ReactNode } from "react";
import { toast as rawToast } from "@/components/ui/8bit-toast";
import { type LanguageStat, languagesFromRecord } from "./stats-utils";
import { ContactModal } from "./ContactModal";
import { EventModal } from "./EventModal";
import { ProjectModal } from "./ProjectModal";

// The 8bit-toast bundle exports a single-arg `toast(title)` helper (no
// .success/.error variants exported). It renders the title node as-is, so we
// pass a colour-coded element: green = success, amber = partial, red = fail.
const toast = rawToast as unknown as (message: ReactNode) => void;

function notify(kind: "success" | "warn" | "error", message: string) {
  const color =
    kind === "success"
      ? "text-green-500"
      : kind === "warn"
        ? "text-yellow-500"
        : "text-red-500";
  toast(<span className={color}>{message}</span>);
}

// All serializable — plain numbers/strings, no Date objects cross the boundary.
export interface GithubStatsData {
  reposCount: number;
  totalCommits: number;
  totalPrs: number;
  totalStars: number;
  topLanguages: LanguageStat[];
  fetchedAt: string | null; // ISO string
}

export interface LeetcodeStatsData {
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  lcRanking: number | null;
  streak: number;
  fetchedAt: string | null; // ISO string
}

export interface StatsSectionProps {
  userId: string;
  isAdmin: boolean;
  hasGithubToken: boolean;
  hasLcUsername: boolean;
  github: GithubStatsData | null;
  leetcode: LeetcodeStatsData | null;
  rank: { rank: number | null; totalScore: number } | null;
}

const COMMIT_CEILING = 1000;
const SOLVED_CEILING = 500;

function pct(value: number, ceiling: number): number {
  return Math.max(0, Math.min(100, Math.round((value / ceiling) * 100)));
}

function formatStamp(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-2.5">
      <span className="text-[11px] tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="retro text-[11px] text-white">{value}</span>
    </div>
  );
}

export function StatsSection({
  userId,
  isAdmin,
  hasGithubToken,
  hasLcUsername,
  github: githubProp,
  leetcode: leetcodeProp,
  rank,
}: StatsSectionProps) {
  const router = useRouter();
  const [github, setGithub] = useState(githubProp);
  const [leetcode, setLeetcode] = useState(leetcodeProp);
  const [refreshing, setRefreshing] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [, startTransition] = useTransition();

  const score = rank?.totalScore ?? 0;

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    const failures: string[] = [];
    let anyOk = false;

    // Each provider is refreshed independently — a missing GitHub token must
    // not block the LeetCode pull (and vice versa).
    if (hasGithubToken) {
      try {
        const res = await fetch(`/api/stats/github/${userId}`, {
          cache: "no-store",
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        const gh = body.data;
        setGithub({
          reposCount: gh.reposCount,
          totalCommits: gh.totalCommits,
          totalPrs: gh.totalPrs,
          totalStars: gh.totalStars,
          topLanguages: languagesFromRecord(gh.topLanguages),
          fetchedAt: gh.fetchedAt,
        });
        anyOk = true;
      } catch (err) {
        failures.push(`GITHUB ${err instanceof Error ? err.message : "ERR"}`);
      }
    } else {
      failures.push("GITHUB NO TOKEN");
    }

    if (hasLcUsername) {
      try {
        const res = await fetch(`/api/stats/lc/${userId}`, {
          cache: "no-store",
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        const lc = body.data;
        setLeetcode({
          totalSolved: lc.totalSolved,
          easySolved: lc.easySolved,
          mediumSolved: lc.mediumSolved,
          hardSolved: lc.hardSolved,
          lcRanking: lc.lcRanking ?? null,
          streak: lc.streak,
          fetchedAt: lc.fetchedAt,
        });
        anyOk = true;
      } catch (err) {
        failures.push(
          `LEETCODE ${err instanceof Error ? err.message : "ERR"}`
        );
      }
    } else {
      failures.push("LEETCODE NO USERNAME");
    }

    if (anyOk && failures.length === 0) {
      notify("success", "✓ Stats refreshed");
    } else if (anyOk) {
      notify("warn", `Partial refresh — ${failures.join(" · ")}`);
    } else {
      notify("error", `✗ Refresh failed — ${failures.join(" · ")}`);
    }

    if (anyOk) startTransition(() => router.refresh());
    setRefreshing(false);
  }

  return (
    <section className="w-full px-6 py-16 relative">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />

      <div className="mx-auto mb-10 flex max-w-6xl items-center justify-between">
        <h2 className="retro text-xl tracking-wider text-white">PLAYER STATS</h2>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-[10px]"
        >
          {refreshing ? "REFRESHING" : "↻ REFRESH"}
        </Button>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3 relative z-10">
        {/* ── GitHub ── */}
        <Card className="gap-6 py-8 border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <div className="px-7">
            <h3 className="retro mb-6 text-base text-white">GITHUB</h3>

            <div className="mb-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="retro text-[9px] text-white">COMMITS</span>
                <span className="retro text-[9px] text-muted-foreground">
                  {github?.totalCommits ?? 0}
                </span>
              </div>
              <Progress
                value={pct(github?.totalCommits ?? 0, COMMIT_CEILING)}
                variant="retro"
                progressBg="bg-blue-500"
                className="h-5"
              />
            </div>

            <StatRow label="REPOS" value={`${github?.reposCount ?? 0}`} />
            <StatRow label="MERGED PRS" value={`${github?.totalPrs ?? 0}`} />
            <StatRow label="STARS" value={`${github?.totalStars ?? 0}`} />

            <p className="mt-6 mb-3 text-[10px] tracking-wider text-muted-foreground">
              TOP LANGUAGES
            </p>
            {github && github.topLanguages.length > 0 ? (
              <div className="space-y-2">
                {github.topLanguages.map((lang) => (
                  <div key={lang.name} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-[10px] text-muted-foreground">
                      {lang.name}
                    </span>
                    <div className="h-2 flex-1 bg-white/5">
                      <div
                        className="h-full bg-white"
                        style={{ width: `${lang.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                No language data
              </p>
            )}

            <p className="mt-6 text-[9px] text-muted-foreground">
              Updated {formatStamp(github?.fetchedAt ?? null)}
            </p>
          </div>
        </Card>

        {/* ── LeetCode ── */}
        <Card className="gap-6 py-8 border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <div className="px-7">
            <h3 className="retro mb-6 text-base text-white">LEETCODE</h3>

            <div className="mb-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="retro text-[9px] text-white">SOLVED</span>
                <span className="retro text-[9px] text-muted-foreground">
                  {leetcode?.totalSolved ?? 0}
                </span>
              </div>
              <Progress
                value={pct(leetcode?.totalSolved ?? 0, SOLVED_CEILING)}
                variant="retro"
                progressBg="bg-yellow-500"
                className="h-5"
              />
            </div>

            <StatRow label="STREAK" value={`${leetcode?.streak ?? 0} DAYS`} />
            <StatRow
              label="RANKING"
              value={
                leetcode?.lcRanking != null
                  ? `#${leetcode.lcRanking.toLocaleString()}`
                  : "—"
              }
            />

            <div className="mt-6 grid grid-cols-3 gap-3">
              <DifficultyTile
                value={leetcode?.easySolved ?? 0}
                label="EASY"
                color="text-green-500"
              />
              <DifficultyTile
                value={leetcode?.mediumSolved ?? 0}
                label="MEDIUM"
                color="text-yellow-500"
              />
              <DifficultyTile
                value={leetcode?.hardSolved ?? 0}
                label="HARD"
                color="text-red-500"
              />
            </div>

            <p className="mt-6 text-[9px] text-muted-foreground">
              Updated {formatStamp(leetcode?.fetchedAt ?? null)}
            </p>
          </div>
        </Card>

        {/* ── Rank ── */}
        <Card className="items-center justify-center gap-6 py-8 border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <div className="w-full space-y-6 px-7 text-center">
            <h3 className="retro text-base text-white">RANK</h3>
            <p className="retro text-6xl text-white">
              {rank?.rank != null ? `#${rank.rank}` : "—"}
            </p>
            <p className="retro text-[9px] text-muted-foreground">
              {rank?.rank != null ? "GLOBAL STANDING" : "UNRANKED"}
            </p>
            <div className="space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="retro text-[9px] text-white">SCORE</span>
                <span className="retro text-[9px] text-muted-foreground">
                  {Math.round(score)}/100
                </span>
              </div>
              <Progress
                value={Math.round(score)}
                variant="retro"
                progressBg="bg-green-500"
                className="h-5"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* ── Action buttons ── */}
      <div className="mx-auto mt-8 grid max-w-6xl gap-6 sm:grid-cols-3">
        <Button onClick={() => setProjectOpen(true)}>NEW PROJECT</Button>
        <Button onClick={() => setEventOpen(true)}>NEW EVENT</Button>
        <Button onClick={() => setContactOpen(true)}>CONTACT</Button>
      </div>

      <ContactModal open={contactOpen} onOpenChange={setContactOpen} />
      <EventModal
        open={eventOpen}
        onOpenChange={setEventOpen}
        isAdmin={isAdmin}
      />
      <ProjectModal open={projectOpen} onOpenChange={setProjectOpen} />
    </section>
  );
}

function DifficultyTile({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="border border-white/10 py-5 text-center">
      <p className={`retro text-2xl ${color}`}>{value}</p>
      <p className="mt-2 text-[9px] tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
