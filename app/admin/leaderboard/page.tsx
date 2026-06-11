import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TacticalCard } from "@/components/ui/TacticalCard";
import { WeightForm } from "./WeightForm";

export default async function AdminLeaderboardPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/");
  }

  const weights = await db.scoreWeight.findFirst();
  const scores = await db.leaderboardScore.findMany({
    select: {
      id: true,
      totalScore: true,
      rank: true,
      user: {
        select: {
          name: true,
          branch: true,
          year: true,
        }
      },
    },
    orderBy: {
      totalScore: "desc"
    },
    take: 10
  });

  return (
    <div className="space-y-12 p-8">
      <header className="border-b border-zinc-900 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <h1 className="text-8xl font-black uppercase tracking-tighter leading-none italic">
              LEADERBOARD<br />CONFIGURATION
            </h1>
            <p className="text-xs text-zinc-600 tracking-[0.4em] uppercase font-bold">
              SCORING_ENGINE_v2.0
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1">
          <TacticalCard title="WEIGHT_CONFIG" subtitle="Define algorithm parameters for score calculation.">
            <WeightForm initialWeights={weights || { githubWeight: 0.33, lcWeight: 0.33, eventWeight: 0.34 }} />
          </TacticalCard>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="text-xl font-black uppercase tracking-tighter border-b border-zinc-900 pb-2">
            PREVIEW_TELEMETRY (TOP_10)
          </div>
          <div className="border border-zinc-900 divide-y divide-zinc-900 overflow-hidden">
            {scores.map((s, idx) => (
              <div key={s.id} className="p-4 flex items-center justify-between hover:bg-zinc-950 transition-all group">
                <div className="flex items-center gap-6">
                  <span className="text-3xl font-black italic text-zinc-800 group-hover:text-white transition-colors">
                    {(idx + 1).toString().padStart(2, '0')}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-black uppercase tracking-tighter">{s.user.name || "ANONYMOUS"}</span>
                    <span className="text-[9px] text-zinc-600 tracking-widest uppercase">
                      {s.user.branch} ({s.user.year}y)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black italic text-white tabular-nums">
                    {s.totalScore.toFixed(2)}
                  </div>
                  <div className="text-[8px] text-zinc-700 uppercase tracking-widest font-bold">SCORE_VALUE</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
