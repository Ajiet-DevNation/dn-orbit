import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";
import { redirect } from "next/navigation";
import { PixelPageHeader } from "@/components/admin/PixelPageHeader";
import { PixelPanel } from "@/components/admin/PixelPanel";
import { WeightForm } from "./WeightForm";
import { LeaderboardPreview } from "./LeaderboardPreview";

export default async function AdminLeaderboardPage() {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role)) {
    redirect("/");
  }

  const weights = await db.scoreWeight.findFirst();
  // Pull the full score-sorted roster so the preview's name search can reach
  // past the top 10; the client component slices to the top 10 by default.
  const scores = await db.leaderboardScore.findMany({
    select: {
      id: true,
      totalScore: true,
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
  });

  return (
    <div className="space-y-8 p-8">
      <PixelPageHeader
        title="LEADERBOARD CONFIGURATION"
        subtitle="SCORING ENGINE"
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <PixelPanel title="SCORING WEIGHTS">
            <WeightForm
              initialWeights={{
                githubWeight: weights?.githubWeight ?? 0.33,
                lcWeight: weights?.lcWeight ?? 0.33,
                eventWeight: weights?.eventWeight ?? 0.34,
                ghOpenSourceMinStars: weights?.ghOpenSourceMinStars ?? 10,
                ghOpenSourcePerPrPoints: weights?.ghOpenSourcePerPrPoints ?? 10,
              }}
            />
          </PixelPanel>
        </div>

        <div className="lg:col-span-2">
          <LeaderboardPreview
            rows={scores.map((s) => ({
              id: s.id,
              totalScore: s.totalScore,
              name: s.user.name,
              branch: s.user.branch,
              year: s.user.year,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
