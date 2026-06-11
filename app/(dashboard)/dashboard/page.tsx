import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TacticalCard } from "@/components/ui/TacticalCard";

export const metadata = {
  title: "DASHBOARD // ORBIT MEMBER",
};

// Helper function to check if data is older than 24 hours
const isStale = (date: Date | undefined | null) => {
  if (!date) return false;
  const twentyFourHours = 24 * 60 * 60 * 1000;
  return new Date().getTime() - new Date(date).getTime() > twentyFourHours;
};

export default async function DashboardPage() {
  const session = await auth();

  // Guard: Ensure user is logged in
  if (!session?.user) {
    redirect("/login");
  }

  const userId = session.user.id;
  const lcUsername = session.user.lcUsername;

  // 1. Parallel Data Fetching
  const [leaderboardScore, githubStats, lcStats, upcomingEvents] =
    await Promise.all([
      db.leaderboardScore.findUnique({
        where: { userId },
      }),
      db.githubStats.findFirst({
        where: { userId },
        orderBy: { fetchedAt: "desc" },
      }),
      db.lcStats.findFirst({
        where: { userId },
        orderBy: { fetchedAt: "desc" },
      }),
      db.event.findMany({
        where: {
          isPublished: true,
          eventDate: { gte: new Date() },
        },
        orderBy: { eventDate: "asc" },
        take: 3,
      }),
    ]);

  // Safely parse GitHub languages (handles both Stringified JSON or native Prisma Json object)
  let topLangs: Array<{ name: string; count: number }> = [];
  if (githubStats?.topLanguages) {
    try {
      const parsed =
        typeof githubStats.topLanguages === "string"
          ? JSON.parse(githubStats.topLanguages)
          : githubStats.topLanguages;

      if (typeof parsed === "object" && !Array.isArray(parsed)) {
        topLangs = Object.entries(parsed)
          .map(([name, count]) => ({ name, count: Number(count) }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5); // Take top 5
      }
    } catch (e) {
      console.error("Failed to parse GitHub languages", e);
    }
  }

  const totalLangCount =
    topLangs.reduce((sum, lang) => sum + lang.count, 0) || 1;

  return (
    <div className="p-8 space-y-12">
      {/* 01_PAGE_HEADER */}
      <header className="border-b border-zinc-900 pb-12">
        <h1 className="text-7xl md:text-9xl font-black uppercase tracking-tighter italic leading-none text-white">
          DASHBOARD
        </h1>
        <div className="flex items-center gap-4 mt-4">
          <span className="text-[10px] text-zinc-600 tracking-[0.4em] uppercase font-bold">
            ORBIT_MEMBER_SECTOR_V1
          </span>
          <div className="h-px flex-1 bg-zinc-900" />
        </div>
      </header>

      {/* 02_TOP_METRICS_BAR */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <TacticalCard variant="dashed" className="py-4">
          <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-black block mb-2">
            RANK
          </span>
          <span className="text-5xl text-white font-black italic leading-none">
            {leaderboardScore?.rank ? `#${leaderboardScore.rank}` : "—"}
          </span>
        </TacticalCard>

        <TacticalCard variant="dashed" className="py-4">
          <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-black block mb-2">
            TOTAL_SCORE
          </span>
          <span className="text-5xl text-white font-black italic leading-none">
            {leaderboardScore?.totalScore
              ? leaderboardScore.totalScore.toFixed(1)
              : "—"}
          </span>
        </TacticalCard>

        <TacticalCard variant="dashed" className="py-4">
          <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-black block mb-2">
            LC_SCORE
          </span>
          <span className="text-5xl text-white font-black italic leading-none">
            {leaderboardScore?.lcScore
              ? leaderboardScore.lcScore.toFixed(1)
              : "—"}
          </span>
        </TacticalCard>

        <TacticalCard variant="dashed" className="py-4">
          <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-black block mb-2">
            GITHUB_SCORE
          </span>
          <span className="text-5xl text-white font-black italic leading-none">
            {leaderboardScore?.githubScore
              ? leaderboardScore.githubScore.toFixed(1)
              : "—"}
          </span>
        </TacticalCard>
      </div>

      {/* 03_INTEGRATION_STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* GITHUB STATS */}
        <TacticalCard id="GITHUB_STATS">
          <div className="flex justify-between items-start mb-6 border-b border-zinc-900 pb-4">
            <h3 className="text-[10px] font-black tracking-widest uppercase text-zinc-500">
              GITHUB_TELEMETRY
            </h3>
            {isStale(githubStats?.fetchedAt) && (
              <span className="text-[8px] bg-yellow-500/10 text-yellow-500 px-2 py-1 uppercase tracking-widest font-bold">
                STATS_STALE
              </span>
            )}
          </div>

          {!githubStats ? (
            <div className="py-8 text-center text-xs text-zinc-500 font-mono uppercase tracking-widest">
              NO_STATS_AVAILABLE // SYNC_PENDING
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black block">
                    REPOS
                  </span>
                  <span className="text-xl text-white font-bold">
                    {githubStats.repos}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black block">
                    COMMITS
                  </span>
                  <span className="text-xl text-white font-bold">
                    {githubStats.commits}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black block">
                    PRs_MERGED
                  </span>
                  <span className="text-xl text-white font-bold">
                    {githubStats.mergedPrs}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black block">
                    STARS
                  </span>
                  <span className="text-xl text-white font-bold">
                    {githubStats.stars}
                  </span>
                </div>
              </div>

              {topLangs.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-zinc-900">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black block mb-4">
                    LANGUAGE_DISTRIBUTION
                  </span>
                  {topLangs.map((lang) => {
                    const pct = Math.round((lang.count / totalLangCount) * 100);
                    return (
                      <div key={lang.name} className="flex items-center gap-3">
                        <span className="text-[9px] text-zinc-400 w-16 uppercase truncate">
                          {lang.name}
                        </span>
                        <div className="flex-1 h-1 bg-zinc-900">
                          <div
                            className="h-full bg-white"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-zinc-600 w-8 text-right">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </TacticalCard>

        {/* LEETCODE STATS */}
        <TacticalCard id="LEETCODE_STATS">
          <div className="flex justify-between items-start mb-6 border-b border-zinc-900 pb-4">
            <h3 className="text-[10px] font-black tracking-widest uppercase text-zinc-500">
              LEETCODE_TELEMETRY
            </h3>
            {isStale(lcStats?.fetchedAt) && (
              <span className="text-[8px] bg-yellow-500/10 text-yellow-500 px-2 py-1 uppercase tracking-widest font-bold">
                STATS_STALE
              </span>
            )}
          </div>

          {!lcStats && !lcUsername ? (
            <div className="py-8 text-center space-y-3">
              <div className="text-xs text-red-500 font-mono uppercase tracking-widest">
                LC_USERNAME_NOT_SET
              </div>
              <Link
                href="/settings"
                className="text-[9px] text-zinc-400 underline hover:text-white uppercase tracking-widest"
              >
                UPDATE_PROFILE_PARAMETERS
              </Link>
            </div>
          ) : !lcStats ? (
            <div className="py-8 text-center text-xs text-zinc-500 font-mono uppercase tracking-widest">
              SYNC_PENDING // AWAITING_CRON
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black block">
                    TOTAL_SOLVED
                  </span>
                  <span className="text-xl text-white font-bold">
                    {lcStats.totalSolved}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black block">
                    GLOBAL_RANKING
                  </span>
                  <span className="text-xl text-white font-bold">
                    #{lcStats.ranking}
                  </span>
                </div>
                <div className="col-span-2 border-t border-zinc-900 pt-4">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black block">
                    ACTIVE_STREAK
                  </span>
                  <span className="text-xl text-white font-bold">
                    {lcStats.streak} DAYS
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-900">
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black block mb-4">
                  DIFFICULTY_DISTRIBUTION
                </span>

                <div className="space-y-3">
                  {/* EASY BAR */}
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-emerald-500 w-12 uppercase tracking-widest font-bold">
                      EASY
                    </span>
                    <div className="flex-1 h-1 bg-zinc-900">
                      <div
                        className="h-full bg-emerald-500"
                        style={{
                          width: `${(lcStats.easySolved / Math.max(1, lcStats.totalSolved)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-zinc-500 w-8 text-right">
                      {lcStats.easySolved}
                    </span>
                  </div>

                  {/* MEDIUM BAR */}
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-yellow-500 w-12 uppercase tracking-widest font-bold">
                      MED
                    </span>
                    <div className="flex-1 h-1 bg-zinc-900">
                      <div
                        className="h-full bg-yellow-500"
                        style={{
                          width: `${(lcStats.mediumSolved / Math.max(1, lcStats.totalSolved)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-zinc-500 w-8 text-right">
                      {lcStats.mediumSolved}
                    </span>
                  </div>

                  {/* HARD BAR */}
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-red-500 w-12 uppercase tracking-widest font-bold">
                      HARD
                    </span>
                    <div className="flex-1 h-1 bg-zinc-900">
                      <div
                        className="h-full bg-red-500"
                        style={{
                          width: `${(lcStats.hardSolved / Math.max(1, lcStats.totalSolved)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-zinc-500 w-8 text-right">
                      {lcStats.hardSolved}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TacticalCard>
      </div>

      {/* 04_UPCOMING_EVENTS */}
      <div>
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-xl font-black tracking-tighter uppercase text-white">
            UPCOMING_EVENTS
          </h2>
          <div className="h-px flex-1 bg-zinc-900" />
          <Link
            href="/events"
            className="text-[9px] text-zinc-500 hover:text-white uppercase tracking-widest"
          >
            VIEW_ALL_OPERATIONS ↗
          </Link>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="text-xs text-zinc-500 font-mono uppercase tracking-widest p-8 border border-dashed border-zinc-800 text-center">
            NO_UPCOMING_EVENTS_SCHEDULED
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {upcomingEvents.map((event, i) => {
              const formattedDate = new Date(event.eventDate)
                .toLocaleDateString("en-CA")
                .replace(/-/g, ".");
              const eventIdHex = `0x${event.id.substring(0, 6).toUpperCase()}`;

              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="block h-full group"
                >
                  <TacticalCard
                    id={`EVT_ID: ${eventIdHex}`}
                    variant="dashed"
                    className="h-full group-hover:border-zinc-600 transition-colors cursor-pointer flex flex-col"
                  >
                    <div className="flex-1 space-y-4 mb-6">
                      <h4 className="text-lg font-black uppercase text-white truncate">
                        {event.title}
                      </h4>

                      <div className="grid grid-cols-2 gap-4 border-t border-zinc-900 pt-4">
                        <div>
                          <p className="text-[8px] text-zinc-600 uppercase tracking-widest font-black mb-1">
                            DATE
                          </p>
                          <p className="text-[10px] text-zinc-300 truncate">
                            {formattedDate}
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] text-zinc-600 uppercase tracking-widest font-black mb-1">
                            TYPE
                          </p>
                          <p className="text-[10px] text-emerald-500 truncate">
                            {event.eventType || "ASSEMBLY"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </TacticalCard>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
