import { auth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { TacticalCard } from "@/components/ui/TacticalCard";
import { AdminHeading } from "@/components/ui/AdminHeading";
import { Users, Calendar, Rocket, Trophy, Activity, ShieldCheck } from "lucide-react";
import Link from "next/link";

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
    { label: "CONNECTED_MEMBERS", value: totalUsers, icon: Users, href: "/admin/members" },
    { label: "ACTIVE_PROJECTS", value: totalProjects, icon: Rocket, href: "/admin/projects" },
    { label: "PENDING_REVIEWS", value: pendingProjects, icon: ShieldCheck, href: "/admin/projects", highlight: true },
    { label: "EVENT_SCHEDULES", value: "05", icon: Calendar, href: "/admin/events" },
  ];

  return (
    <div className="p-8 space-y-12">
      <AdminHeading title="DASHBOARD" sub="ORBIT_COMMAND_SYSTEM_READY" code="0x7F2A9B0C" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <TacticalCard
              id={stat.label}
              variant={stat.highlight ? "accent" : "default"}
              className="hover:border-[#22c55e]/60 transition-all group h-full"
            >
              <div className="flex items-center justify-between group-hover:translate-x-1 transition-transform">
                <div className="flex flex-col gap-3">
                  <span className="retro text-[8px] text-zinc-600 uppercase tracking-widest">METRIC_V1</span>
                  <span className="retro text-3xl text-[#22c55e] leading-none">{stat.value}</span>
                </div>
                <stat.icon className="w-8 h-8 text-[#22c55e] transition-opacity group-hover:opacity-80" />
              </div>
            </TacticalCard>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="retro text-sm uppercase tracking-wider text-white border-b-2 border-white/10 pb-3 flex items-center gap-3">
             <Activity className="w-5 h-5 text-[#22c55e]" />
             SYSTEM_LOGS
          </div>
          <div className="space-y-4 font-mono">
            <div className="p-4 border-2 border-white/10 hover:border-[#22c55e]/40 hover:bg-[#22c55e]/[0.04] transition-colors">
              <span className="text-[#22c55e]/50 mr-4">[12:44:03]</span>
              <span className="text-zinc-400 uppercase text-xs">UPLINK_SUCCESS: SYNCED_WITH_NEON_DB</span>
            </div>
            <div className="p-4 border-2 border-white/10 hover:border-[#22c55e]/40 hover:bg-[#22c55e]/[0.04] transition-colors">
              <span className="text-[#22c55e]/50 mr-4">[12:44:05]</span>
              <span className="text-zinc-400 uppercase text-xs">ROOT_ACCESS: COMMANDER_SESSION_INITIATED</span>
            </div>
            <div className="p-4 border-2 border-white/10 hover:border-[#22c55e]/40 hover:bg-[#22c55e]/[0.04] transition-colors">
              <span className="text-[#22c55e]/50 mr-4">[12:44:12]</span>
              <span className="text-zinc-400 uppercase text-xs">SECURITY_NOTICE: UNESCAPED_ENTITIES_RESOLVED</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="retro text-sm uppercase tracking-wider text-white border-b-2 border-white/10 pb-3 flex items-center gap-3">
             <Trophy className="w-5 h-5 text-[#22c55e]" />
             QUICK_STATS
          </div>
          <TacticalCard id="SYS_HEALTH" variant="dashed">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between retro text-[8px] text-zinc-500 tracking-widest uppercase">
                  <span>DB_LATENCY</span>
                  <span className="text-[#22c55e]">14MS</span>
                </div>
                <div className="h-2 bg-white/5"><div className="h-full bg-[#22c55e] w-[14%]" /></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between retro text-[8px] text-zinc-500 tracking-widest uppercase">
                   <span>UI_DENSITY</span>
                   <span className="text-[#22c55e]">OPTIMAL</span>
                </div>
                <div className="h-2 bg-white/5"><div className="h-full bg-[#22c55e] w-[88%]" /></div>
              </div>
            </div>
          </TacticalCard>
        </div>
      </div>
    </div>
  );
}