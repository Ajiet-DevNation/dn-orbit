import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TacticalCard } from "@/components/ui/TacticalCard";

const DAY_MS = 24 * 60 * 60 * 1000;
const isStale = (d?: Date | null) =>
  d ? Date.now() - new Date(d).getTime() > DAY_MS : false;

// `topLanguages` is stored as a JSON value; coerce it safely to string[].
function asLanguageList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export default async function DashboardPage() {
  const session = await auth();

  // Middleware already gates this route, but narrow the type and stay safe.
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const [leaderboardScore, githubStats, lcStats, upcomingEvents] =
    await Promise.all([
      db.leaderboardScore.findUnique({ where: { userId } }),
      db.githubStats.findFirst({
        where: { userId },
        orderBy: { fetchedAt: "desc" },
      }),
      db.lcStats.findFirst({
        where: { userId },
        orderBy: { fetchedAt: "desc" },
      }),
      db.event.findMany({
        where: { isPublished: true, eventDate: { gte: new Date() } },
        orderBy: { eventDate: "asc" },
        take: 3,
      }),
    ]);

  const languages = asLanguageList(githubStats?.topLanguages).slice(0, 5);
  const statsStale = isStale(githubStats?.fetchedAt) || isStale(lcStats?.fetchedAt);

  const statCards = [
    {
      id: "0xRANK",
      label: "RANK",
      value:
        leaderboardScore?.rank != null ? `#${leaderboardScore.rank}` : "—",
    },
    {
      id: "0xTOTAL",
      label: "TOTAL_SCORE",
      value: leaderboardScore ? leaderboardScore.totalScore.toFixed(1) : "—",
    },
    {
      id: "0xLCSCR",
      label: "LC_SCORE",
      value: leaderboardScore ? leaderboardScore.lcScore.toFixed(1) : "—",
    },
    {
      id: "0xGHSCR",
      label: "GITHUB_SCORE",
      value: leaderboardScore ? leaderboardScore.githubScore.toFixed(1) : "—",
    },
  ];

  return (
    <div className="p-8 space-y-12">
      {/* ── Page header ── */}
      <header className="border-b border-zinc-900 pb-12">
        <h1 className="text-7xl md:text-8xl font-black uppercase tracking-tighter leading-none italic">
          DASHBOARD
        </h1>
        <div className="flex items-center gap-4 mt-4">
          <span className="text-[10px] text-zinc-600 tracking-[0.4em] uppercase font-bold">
            ORBIT_MEMBER_SECTOR_V1
          </span>
          <div className="h-px flex-1 bg-zinc-900" />
          {statsStale && (
            <span className="text-[9px] text-zinc-500 tracking-widest uppercase border border-zinc-800 px-2 py-1">
              STATS_STALE — REFRESH_AVAILABLE
            </span>
          )}
        </div>
      </header>

      {/* ── Top stat bar ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <TacticalCard key={card.id} id={card.id}>
            <div className="space-y-2">
              <span className="block text-[9px] text-zinc-500 tracking-widest uppercase">
                {card.label}
              </span>
              <span className="block text-5xl font-black italic text-white leading-none">
                {card.value}
              </span>
            </div>
          </TacticalCard>
        ))}
      </div>

      {/* ── Leaderboard entry point ── */}
      <TacticalCard
        id="0xRANKING"
        title="LEADERBOARD_LINK"
        subtitle="Stored nightly scores from the scoring engine. Open the full board to inspect rank movement and component breakdowns."
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
              Your dashboard shows the personal snapshot. The leaderboard page shows
              the full member ranking, your exact position, and the score split used
              by the nightly compute job.
            </p>
            <div className="flex flex-wrap gap-6 text-[10px] text-zinc-500 tracking-widest uppercase">
              <span>
                CURRENT_RANK {leaderboardScore?.rank != null ? `#${leaderboardScore.rank}` : "PENDING"}
              </span>
              <span>
                TOTAL_SCORE {leaderboardScore ? leaderboardScore.totalScore.toFixed(1) : "—"}
              </span>
            </div>
          </div>

          <Link
            href="/leaderboard"
            className="inline-flex items-center justify-center px-5 py-3 text-[10px] font-black tracking-[0.3em] uppercase border border-zinc-800 bg-zinc-950 text-white hover:bg-white hover:text-black hover:border-white transition-colors"
          >
            OPEN_LEADERBOARD
          </Link>
        </div>
      </TacticalCard>

      {/* ── GitHub + LeetCode ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GitHub stats */}
        <TacticalCard id="0xGITHUB" title="GITHUB_STATS">
          {githubStats ? (
            <div className="space-y-6">
              <div>
                <StatRow label="REPOS" value={githubStats.reposCount} />
                <StatRow label="COMMITS" value={githubStats.totalCommits} />
                <StatRow label="MERGED_PRS" value={githubStats.totalPrs} />
                <StatRow label="STARS" value={githubStats.totalStars} />
              </div>

              {languages.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="block text-[9px] text-zinc-600 tracking-widest uppercase">
                    TOP_LANGUAGES
                  </span>
                  {languages.map((lang, i) => {
                    const pct = ((languages.length - i) / languages.length) * 100;
                    return (
                      <div key={lang} className="flex items-center gap-3">
                        <span className="text-[9px] text-zinc-500 w-20 uppercase truncate">
                          {lang}
                        </span>
                        <div className="flex-1 h-1 bg-zinc-900">
                          <div
                            className="h-full bg-white"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <EmptyState code="NO_STATS_AVAILABLE — SYNC_PENDING" />
          )}
        </TacticalCard>

        {/* LeetCode stats */}
        <TacticalCard id="0xLEETCODE" title="LEETCODE_STATS">
          {lcStats ? (
            <div className="space-y-6">
              <div>
                <StatRow label="TOTAL_SOLVED" value={lcStats.totalSolved} />
                <StatRow label="STREAK" value={`${lcStats.streak} DAYS`} />
                <StatRow
                  label="RANKING"
                  value={
                    lcStats.lcRanking != null
                      ? `#${lcStats.lcRanking.toLocaleString()}`
                      : "—"
                  }
                />
              </div>

              <div className="flex items-stretch gap-3 pt-2">
                <Difficulty
                  label="EASY"
                  count={lcStats.easySolved}
                  className="text-emerald-500"
                />
                <Difficulty
                  label="MEDIUM"
                  count={lcStats.mediumSolved}
                  className="text-yellow-500"
                />
                <Difficulty
                  label="HARD"
                  count={lcStats.hardSolved}
                  className="text-red-500"
                />
              </div>
            </div>
          ) : session.user.lcUsername ? (
            <EmptyState code="SYNC_PENDING" />
          ) : (
            <div className="space-y-3">
              <EmptyState code="NO_LC_USERNAME — UPDATE_PROFILE" />
              <Link
                href="/onboarding"
                className="inline-block text-[10px] text-zinc-500 hover:text-white tracking-widest uppercase border-b border-zinc-700 hover:border-white transition-colors"
              >
                &gt; SET_LEETCODE_USERNAME
              </Link>
            </div>
          )}
        </TacticalCard>
      </div>

      {/* ── Upcoming events ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-black uppercase tracking-tighter">
            UPCOMING_EVENTS
          </h2>
          <div className="h-px flex-1 bg-zinc-900" />
        </div>

        {upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {upcomingEvents.map((event, i) => (
              <Link key={event.id} href={`/events/${event.id}`} className="block">
                <TacticalCard
                  id={`EVT_${i.toString().padStart(2, "0")}`}
                  status={event.eventType ?? undefined}
                  className="h-full hover:border-zinc-600 transition-colors"
                >
                  <div className="space-y-3">
                    <h3 className="text-base font-black uppercase tracking-tighter text-white leading-tight">
                      {event.title}
                    </h3>
                    <div className="space-y-1">
                      <span className="block text-[9px] text-zinc-500 tracking-widest uppercase">
                        {event.eventDate.toLocaleDateString("en-CA")}
                      </span>
                      {event.location && (
                        <span className="block text-[9px] text-zinc-600 tracking-widest uppercase truncate">
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                </TacticalCard>
              </Link>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-zinc-800 p-12 text-center">
            <EmptyState code="NO_UPCOMING_EVENTS_SCHEDULED" />
          </div>
        )}
      </section>
    </div>
  );
}

// ── Local presentational helpers ──

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-900 py-3">
      <span className="text-[10px] text-zinc-500 tracking-widest uppercase">
        {label}
      </span>
      <span className="text-sm font-black text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
    </div>
  );
}

function Difficulty({
  label,
  count,
  className,
}: {
  label: string;
  count: number;
  className: string;
}) {
  return (
    <div className="flex-1 border border-zinc-900 px-3 py-4 text-center">
      <span className={`block text-2xl font-black italic ${className}`}>
        {count}
      </span>
      <span className="block mt-1 text-[8px] text-zinc-600 tracking-widest uppercase">
        {label}
      </span>
    </div>
  );
}

function EmptyState({ code }: { code: string }) {
  return (
    <p className="text-[10px] text-zinc-600 tracking-widest uppercase">{code}</p>
  );
}
