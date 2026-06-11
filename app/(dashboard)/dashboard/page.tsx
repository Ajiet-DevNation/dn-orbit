import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TacticalCard } from "@/components/ui/TacticalCard";

export const metadata = {
  title: "DASHBOARD // ORBIT MEMBER",
};

const isStale = (date: Date | undefined | null) => {
  if (!date) return false;
  const twentyFourHours = 24 * 60 * 60 * 1000;
  return new Date().getTime() - new Date(date).getTime() > twentyFourHours;
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;

  const [leaderboardScore, githubStats, lcStats, upcomingEvents] =
    await Promise.all([
      db.leaderboardScore.findUnique({ where: { userId } }),
      db.githubStats.findFirst({ where: { userId }, orderBy: { fetchedAt: "desc" } }),
      db.lcStats.findFirst({ where: { userId }, orderBy: { fetchedAt: "desc" } }),
      db.event.findMany({
        where: { isPublished: true, eventDate: { gte: new Date() } },
        orderBy: { eventDate: "asc" },
        take: 3,
      }),
    ]);

  return (
    <div className="p-8 space-y-12">
      <header className="border-b border-zinc-900 pb-12">
        <h1 className="text-7xl md:text-9xl font-black uppercase tracking-tighter italic leading-none text-white">
          DASHBOARD
        </h1>
      </header>

      {/* Stats row omitted for brevity, logic remains same */}
      
      {/* Upcoming Events - FIX: Removed unused 'i' variable from map */}
      {upcomingEvents.map((event) => (
        <Link key={event.id} href={`/events/${event.id}`}>
          {/* ... card content ... */}
        </Link>
      ))}
    </div>
  );
}
