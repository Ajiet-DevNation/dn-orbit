import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";
import { redirect } from "next/navigation";
import { ProjectTable } from "./ProjectTable";
import { TacticalCard } from "@/components/ui/TacticalCard";

export default async function AdminProjectsPage() {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role)) {
    redirect("/");
  }

  const projects = await db.project.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      progressPct: true,
      githubRepoUrl: true,
      isApproved: true,
      submittedAt: true,
      lead: {
        select: {
          name: true,
          githubUsername: true,
        }
      },
    },
    orderBy: {
      submittedAt: "desc"
    }
  });
  const pendingCount = projects.filter(p => !p.isApproved).length;
  const approvedCount = projects.filter(p => p.isApproved).length;

  return (
    <div className="space-y-12 p-8">
      <header className="border-b border-white/10 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <h1 className="retro text-2xl uppercase tracking-wider leading-relaxed text-white">
              PROJECT<br />MANAGEMENT
            </h1>
            <p className="text-xs text-zinc-600 tracking-[0.4em] uppercase font-bold">
              PROJECT_DIRECTORY_V1.1
            </p>
          </div>
          
          <div className="flex gap-4">
            <TacticalCard variant="dashed" className="w-40 py-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-black">PENDING</span>
                <span className="retro text-2xl text-[#22c55e]">{pendingCount.toString().padStart(2, '0')}</span>
              </div>
            </TacticalCard>
            <TacticalCard variant="dashed" className="w-40 py-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-black">APPROVED</span>
                <span className="retro text-2xl text-[#22c55e]">{approvedCount.toString().padStart(2, '0')}</span>
              </div>
            </TacticalCard>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="text-xl font-black uppercase tracking-tighter">PROJECT_DIRECTORY</div>
          <div className="text-[8px] text-zinc-800 uppercase tracking-widest font-bold">STATUS: OPERATIONAL</div>
        </div>
        
        <ProjectTable initialProjects={projects.map(p => ({
          ...p,
          leadName: p.lead?.name || "UNNAMED_LEAD",
          leadGithub: p.lead?.githubUsername || null
        }))} />
      </div>
    </div>
  );
}
