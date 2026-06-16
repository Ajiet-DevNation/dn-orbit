import { auth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PixelPageHeader } from "@/components/admin/PixelPageHeader";
import { PixelStatTile } from "@/components/admin/PixelStatTile";
import { PixelPanel } from "@/components/admin/PixelPanel";

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!canAccessAdmin(session?.user?.role)) {
    redirect("/");
  }

  // Fetch counts for dashboard
  const totalUsers = await db.user.count();
  // We fetch counts for other entities to show on dashboard
  const totalProjects = await db.project.count({ where: { isApproved: true } });
  const pendingProjects = await db.project.count({ where: { isApproved: false } });

  const stats = [
    { label: "CONNECTED_MEMBERS", value: totalUsers, href: "/admin/members" },
    { label: "ACTIVE_PROJECTS", value: totalProjects, href: "/admin/projects" },
    { label: "PENDING_REVIEWS", value: pendingProjects, href: "/admin/projects" },
    { label: "EVENT_SCHEDULES", value: "05", href: "/admin/events" },
  ];

  return (
    <div className="space-y-8 p-8">
      <PixelPageHeader title="DASHBOARD" subtitle="ORBIT_COMMAND_SYSTEM_READY" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <PixelStatTile label={stat.label} value={stat.value} />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <PixelPanel title="SYSTEM_LOGS">
            <div className="space-y-3">
              <div className="border-2 border-white/10 p-4 transition-colors hover:border-[#22c55e]/40 hover:bg-[#22c55e]/[0.04]">
                <span className="retro text-[9px] text-[#22c55e]/50 mr-4">[12:44:03]</span>
                <span className="retro text-[9px] uppercase text-zinc-400">UPLINK_SUCCESS: SYNCED_WITH_NEON_DB</span>
              </div>
              <div className="border-2 border-white/10 p-4 transition-colors hover:border-[#22c55e]/40 hover:bg-[#22c55e]/[0.04]">
                <span className="retro text-[9px] text-[#22c55e]/50 mr-4">[12:44:05]</span>
                <span className="retro text-[9px] uppercase text-zinc-400">ROOT_ACCESS: COMMANDER_SESSION_INITIATED</span>
              </div>
              <div className="border-2 border-white/10 p-4 transition-colors hover:border-[#22c55e]/40 hover:bg-[#22c55e]/[0.04]">
                <span className="retro text-[9px] text-[#22c55e]/50 mr-4">[12:44:12]</span>
                <span className="retro text-[9px] uppercase text-zinc-400">SECURITY_NOTICE: UNESCAPED_ENTITIES_RESOLVED</span>
              </div>
            </div>
          </PixelPanel>
        </div>

        <div className="space-y-6 lg:col-span-1">
          <PixelPanel title="QUICK_STATS">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between retro text-[8px] text-zinc-500 tracking-widest uppercase">
                  <span>DB_LATENCY</span>
                  <span className="text-[#22c55e]">14MS</span>
                </div>
                <div className="h-2 bg-white/5">
                  <div className="h-full bg-[#22c55e] w-[14%]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between retro text-[8px] text-zinc-500 tracking-widest uppercase">
                  <span>UI_DENSITY</span>
                  <span className="text-[#22c55e]">OPTIMAL</span>
                </div>
                <div className="h-2 bg-white/5">
                  <div className="h-full bg-[#22c55e] w-[88%]" />
                </div>
              </div>
            </div>
          </PixelPanel>
        </div>
      </div>
    </div>
  );
}
