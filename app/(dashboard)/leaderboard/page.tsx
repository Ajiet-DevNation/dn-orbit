import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TacticalCard } from "@/components/ui/TacticalCard";

type ScoreRow = {
  id: string;
  userId: string;
  githubScore: number;
  lcScore: number;
  eventScore: number;
  totalScore: number;
  rank: number | null;
  computedAt: Date;
  user: {
    name: string;
    usn: string | null;
    branch: string | null;
    year: number | null;
    githubUsername: string;
  };
};

export default async function LeaderboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const scores = (await db.leaderboardScore.findMany({
    include: {
      user: {
        select: {
          name: true,
          usn: true,
          branch: true,
          year: true,
          githubUsername: true,
        },
      },
    },
    orderBy: [{ rank: { sort: "asc", nulls: "last" } }, { totalScore: "desc" }],
  })) as ScoreRow[];

  const currentUserScore = scores.find((score) => score.userId === session.user.id);
  const podium = scores.slice(0, 3);
  const computedAt = scores[0]?.computedAt ?? null;

  return (
    <div className="p-8 space-y-12">
      <header className="border-b border-zinc-900 pb-12">
        <h1 className="text-7xl md:text-8xl font-black uppercase tracking-tighter leading-none italic">
          LEADERBOARD
        </h1>
        <div className="flex items-center gap-4 mt-4">
          <span className="text-[10px] text-zinc-600 tracking-[0.4em] uppercase font-bold">
            ORBIT_RANKING_ARCHIVE
          </span>
          <div className="h-px flex-1 bg-zinc-900" />
          <span className="text-[9px] text-zinc-500 tracking-widest uppercase">
            {computedAt
              ? `LAST_COMPUTED ${formatDateStamp(computedAt)}`
              : "NO_COMPUTE_RUN_YET"}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <TacticalCard id="0xYOU" title="YOUR_POSITION">
          {currentUserScore ? (
            <div className="space-y-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <span className="block text-[9px] text-zinc-500 tracking-widest uppercase">
                    CURRENT_RANK
                  </span>
                  <span className="block text-6xl font-black italic text-white leading-none mt-2">
                    #{currentUserScore.rank ?? "—"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[9px] text-zinc-500 tracking-widest uppercase">
                    TOTAL_SCORE
                  </span>
                  <span className="block text-3xl font-black italic text-white leading-none mt-2">
                    {currentUserScore.totalScore.toFixed(1)}
                  </span>
                </div>
              </div>

              <div>
                <BreakdownRow label="GITHUB_SCORE" value={currentUserScore.githubScore} />
                <BreakdownRow label="LC_SCORE" value={currentUserScore.lcScore} />
                <BreakdownRow label="EVENT_SCORE" value={currentUserScore.eventScore} />
              </div>
            </div>
          ) : (
            <EmptyState code="NO_SCORE_COMPUTED_FOR_THIS_ACCOUNT" />
          )}
        </TacticalCard>

        <TacticalCard id="0xPODIUM" title="TOP_OPERATIVES" className="xl:col-span-2">
          {podium.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {podium.map((entry, index) => (
                <div key={entry.id} className="border border-zinc-900 p-4 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-4xl font-black italic text-white leading-none">
                      #{entry.rank ?? index + 1}
                    </span>
                    <span className="text-[9px] text-zinc-600 tracking-widest uppercase">
                      SLOT_{(index + 1).toString().padStart(2, "0")}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-black uppercase tracking-tighter text-white">
                      {entry.user.name}
                    </p>
                    <p className="text-[9px] text-zinc-500 tracking-widest uppercase">
                      {formatIdentity(entry.user)}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-zinc-900">
                    <p className="text-[9px] text-zinc-500 tracking-widest uppercase">
                      TOTAL_SCORE
                    </p>
                    <p className="mt-2 text-3xl font-black italic text-white leading-none">
                      {entry.totalScore.toFixed(1)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState code="LEADERBOARD_EMPTY__RUN_CRON_FIRST" />
          )}
        </TacticalCard>
      </div>

      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-black uppercase tracking-tighter">
            FULL_RANKINGS
          </h2>
          <div className="h-px flex-1 bg-zinc-900" />
          <span className="text-[9px] text-zinc-600 tracking-widest uppercase">
            {scores.length.toString().padStart(2, "0")}_SCORING_RECORDS
          </span>
        </div>

        {scores.length > 0 ? (
          <div className="border border-zinc-900 overflow-hidden">
            <div className="hidden md:grid md:grid-cols-[96px_minmax(0,1.8fr)_minmax(0,0.8fr)_120px_120px_120px_120px] border-b border-zinc-900 bg-zinc-950 px-6 py-3 text-[9px] text-zinc-500 tracking-widest uppercase">
              <span>Rank</span>
              <span>Member</span>
              <span>Branch</span>
              <span className="text-right">GitHub</span>
              <span className="text-right">LeetCode</span>
              <span className="text-right">Events</span>
              <span className="text-right">Total</span>
            </div>

            <div className="divide-y divide-zinc-900">
              {scores.map((score) => {
                const isCurrentUser = score.userId === session.user.id;

                return (
                  <div
                    key={score.id}
                    className={`px-6 py-4 transition-colors ${
                      isCurrentUser ? "bg-zinc-950" : "hover:bg-zinc-950/60"
                    }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[96px_minmax(0,1.8fr)_minmax(0,0.8fr)_120px_120px_120px_120px] gap-4 items-center">
                      <div className="flex items-center justify-between md:block">
                        <span className="text-[9px] text-zinc-600 tracking-widest uppercase md:hidden">
                          Rank
                        </span>
                        <span className="text-2xl font-black italic text-white">
                          #{score.rank ?? "—"}
                        </span>
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black uppercase tracking-tighter text-white truncate">
                            {score.user.name}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[8px] text-black bg-white px-1.5 py-0.5 font-black tracking-widest uppercase">
                              You
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-zinc-500 tracking-widest uppercase">
                          <span>{score.user.usn ?? "USN_PENDING"}</span>
                          <span>@{score.user.githubUsername}</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-zinc-500 tracking-widest uppercase">
                        {score.user.branch
                          ? `${score.user.branch}${score.user.year ? ` / Y${score.user.year}` : ""}`
                          : "PROFILE_PENDING"}
                      </div>

                      <ScoreMetric label="GitHub" value={score.githubScore} />
                      <ScoreMetric label="LeetCode" value={score.lcScore} />
                      <ScoreMetric label="Events" value={score.eventScore} />
                      <ScoreMetric label="Total" value={score.totalScore} strong />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <TacticalCard id="0xNULL" title="NO_SCORES_FOUND" variant="dashed">
            <div className="space-y-4">
              <EmptyState code="THE_MEMBER_LEADERBOARD_HAS_NOT_BEEN_COMPUTED_YET" />
              <Link
                href="/dashboard"
                className="inline-block text-[10px] text-zinc-500 hover:text-white tracking-widest uppercase border-b border-zinc-700 hover:border-white transition-colors"
              >
                &gt; RETURN_TO_DASHBOARD
              </Link>
            </div>
          </TacticalCard>
        )}
      </section>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-900 py-3">
      <span className="text-[10px] text-zinc-500 tracking-widest uppercase">
        {label}
      </span>
      <span className="text-sm font-black text-white">{value.toFixed(1)}</span>
    </div>
  );
}

function ScoreMetric({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="text-right">
      <div
        className={`text-sm md:text-base font-black tabular-nums ${
          strong ? "text-white" : "text-zinc-300"
        }`}
      >
        {value.toFixed(1)}
      </div>
      <div className="text-[8px] text-zinc-700 tracking-widest uppercase md:hidden">
        {label}
      </div>
    </div>
  );
}

function EmptyState({ code }: { code: string }) {
  return (
    <p className="text-[10px] text-zinc-600 tracking-widest uppercase">{code}</p>
  );
}

function formatIdentity(user: ScoreRow["user"]) {
  if (user.branch && user.year) {
    return `${user.branch} / Y${user.year}`;
  }

  if (user.branch) {
    return user.branch;
  }

  return user.usn ?? "PROFILE_PENDING";
}

function formatDateStamp(value: Date) {
  return value.toLocaleDateString("en-CA");
}
