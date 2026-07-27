import Link from "next/link";
import { redirect } from "next/navigation";
import { PixelPageHeader } from "@/components/admin/PixelPageHeader";
import { PixelPanel } from "@/components/admin/PixelPanel";
import { PixelStatTile } from "@/components/admin/PixelStatTile";
import { type LogEntry, SystemLogs } from "@/components/admin/SystemLogs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/roles";

export const metadata = {
  title: "DASHBOARD // ORBIT ADMIN",
};

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!canAccessAdmin(session?.user?.role)) {
    redirect("/");
  }

  // Fetch live counts for the dashboard tiles + the most recent activity.
  const [
    totalUsers,
    totalProjects,
    pendingProjects,
    pendingEvents,
    totalEvents,
    totalRegistrations,
    recentLogs,
  ] = await Promise.all([
    db.user.count(),
    db.project.count({ where: { reviewStatus: "approved" } }),
    db.project.count({ where: { reviewStatus: "pending" } }),
    db.event.count({ where: { reviewStatus: "pending" } }),
    db.event.count(),
    db.registration.count(),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        action: true,
        actorName: true,
        summary: true,
        createdAt: true,
      },
    }),
  ]);
  const pendingReviews = pendingProjects + pendingEvents;

  const stats = [
    { label: "MEMBERS", value: totalUsers, href: "/admin/members" },
    { label: "ACTIVE PROJECTS", value: totalProjects, href: "/admin/projects" },
    {
      label: "PENDING REVIEWS",
      value: pendingReviews,
      href: "/admin/approvals",
    },
    { label: "EVENTS", value: totalEvents, href: "/admin/events" },
    {
      label: "REGISTRATIONS",
      value: totalRegistrations,
      href: "/admin/events",
    },
  ];

  const initialLogs: LogEntry[] = recentLogs.map((l) => ({
    id: l.id,
    action: l.action,
    actorName: l.actorName,
    summary: l.summary,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8 p-6 md:p-8">
      <PixelPageHeader title="DASHBOARD" subtitle="SYSTEM OVERVIEW" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <PixelStatTile label={stat.label} value={stat.value} />
          </Link>
        ))}
      </div>

      <PixelPanel title="SYSTEM LOGS">
        <SystemLogs initial={initialLogs} />
      </PixelPanel>
    </div>
  );
}
