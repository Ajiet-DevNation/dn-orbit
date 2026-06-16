import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";
import { redirect } from "next/navigation";
import { PixelPageHeader } from "@/components/admin/PixelPageHeader";
import { PixelPanel } from "@/components/admin/PixelPanel";
import { WeightForm } from "./WeightForm";

export default async function AdminLeaderboardPage() {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role)) {
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
        },
      },
    },
    orderBy: {
      totalScore: "desc",
    },
    take: 10,
  });

  return (
    <div className="space-y-8 p-8">
      <PixelPageHeader
        title="LEADERBOARD CONFIGURATION"
        subtitle="SCORING_ENGINE_v2.0"
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <PixelPanel title="WEIGHT_CONFIG">
            <WeightForm
              initialWeights={
                weights || { githubWeight: 0.33, lcWeight: 0.33, eventWeight: 0.34 }
              }
            />
          </PixelPanel>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="retro text-[9px] tracking-widest text-zinc-500 border-b-2 border-white/10 pb-2">
            PREVIEW_TELEMETRY (TOP_10)
          </div>
          <div className="border-2 border-white/10 divide-y-2 divide-zinc-900 overflow-hidden">
            {scores.map((s, idx) => (
              <div
                key={s.id}
                className="p-4 flex items-center justify-between hover:bg-zinc-950 transition-all group"
              >
                <div className="flex items-center gap-6">
                  <span className="retro text-xl text-zinc-700 group-hover:text-[#22c55e] transition-colors">
                    {(idx + 1).toString().padStart(2, "0")}
                  </span>
                  <div className="flex flex-col">
                    <span className="retro text-[10px] uppercase tracking-tight text-white">
                      {s.user.name || "ANONYMOUS"}
                    </span>
                    <span className="retro text-[8px] text-zinc-600 tracking-widest uppercase">
                      {s.user.branch} ({s.user.year}y)
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
