import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { TacticalCard } from "@/components/ui/TacticalCard";
import { Users, Calendar, Rocket, Trophy, Activity, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const session = await auth();
  
  if (session?.user?.role !== "admin") {
    redirect("/");
  }

  // Fetch counts for dashboard
  const totalUsers = await db.user.count();
  const totalProjects = await db.project.count({ where: { isApproved: true } });
  const pendingProjects = await db.project.count({ where: { isApproved: false } });
  const totalEvents = await db.event.count();


  const recentLogs = await db.auditLog.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });

  const stats = [
    { label: "CONNECTED_MEMBERS", value: totalUsers, icon: Users, href: "/admin/members" },
    { label: "ACTIVE_PROJECTS", value: totalProjects, icon: Rocket, href: "/admin/projects" },
    { label: "PENDING_REVIEWS", value: pendingProjects, icon: ShieldCheck, href: "/admin/projects", highlight: true },
    { label: "EVENT_SCHEDULES", value: totalEvents.toString().padStart(2, '0'), icon: Calendar, href: "/admin/events" },

  ];

  return (
    <div className="p-8 space-y-12">
      <header className="border-b border-zinc-900 pb-12">
        <div className="space-y-4">
          <h1 className="text-9xl font-black uppercase tracking-tighter leading-none italic select-none">
            DASHBOARD
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-zinc-600 tracking-[0.4em] uppercase font-bold">ORBIT_COMMAND_SYSTEM_READY</span>
            <div className="h-px flex-1 bg-zinc-900" />
            <span className="text-[10px] text-zinc-800 font-mono">0x7F2A9B0C</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <TacticalCard 
              id={stat.label} 
              variant={stat.highlight ? "accent" : "default"}
              className="hover:border-white transition-all group h-full"
            >
              <div className="flex items-center justify-between group-hover:translate-x-1 transition-transform">
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-black">METRIC_V1</span>
                  <span className="text-5xl font-black italic leading-none my-2">{stat.value}</span>
                </div>
                <stat.icon className={`w-8 h-8 text-white transition-opacity group-hover:opacity-80`} />
              </div>
            </TacticalCard>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="text-xl font-black uppercase tracking-tighter border-b border-zinc-900 pb-2 flex items-center gap-3">
             <Activity className="w-5 h-5" />
             SYSTEM_LOGS
          </div>
          <div className="space-y-4 font-mono">
            {recentLogs.length > 0 ? (
              recentLogs.map((log: import("@prisma/client").AuditLog) => (
                <div key={log.id} className="p-4 border border-zinc-900 hover:bg-zinc-950 transition-colors flex items-center">
                  <span className="text-zinc-700 mr-4 min-w-[75px]">[{log.createdAt.toISOString().substring(11, 19)}]</span>
                  <span className={`uppercase text-xs ${log.action.includes('ERROR') || log.action.includes('FAILURE') ? 'text-red-500 animate-pulse' : 'text-zinc-400'}`}>
                    {log.type}: {log.action}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 border border-zinc-900 hover:bg-zinc-950 transition-colors">
                <span className="text-zinc-700 mr-4">[--:--:--]</span>
                <span className="text-zinc-600 uppercase text-xs">NO_ACTIVITY_DETECTED</span>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="text-xl font-black uppercase tracking-tighter border-b border-zinc-900 pb-2 flex items-center gap-3">
             <Trophy className="w-5 h-5" />
             QUICK_STATS
          </div>
          <TacticalCard id="SYS_HEALTH" variant="dashed">
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-zinc-600 font-black tracking-widest uppercase">
                  <span>DB_LATENCY</span>
                  <span>14MS</span>
                </div>
                <div className="h-1 bg-zinc-900"><div className="h-full bg-white w-[14%]" /></div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-zinc-600 font-black tracking-widest uppercase">
                   <span>UI_DENSITY</span>
                   <span>OPTIMAL</span>
                </div>
                <div className="h-1 bg-zinc-900"><div className="h-full bg-white w-[88%]" /></div>
              </div>
            </div>
          </TacticalCard>
        </div>
      </div>
    </div>
  );
}