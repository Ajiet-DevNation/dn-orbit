import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProjectTable } from "./ProjectTable";
import { TacticalCard } from "@/components/ui/TacticalCard";

export default async function AdminProjectsPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/");
  }

  // Fetch all projects with lead info
  const projects = await db.project.findMany({
    include: {
      lead: {
        select: {
          name: true,
          email: true,
          githubUsername: true
        }
      }
    },
    orderBy: {
      submittedAt: "desc"
    }
  });

  const pendingCount = projects.filter(p => !p.isApproved).length;
  const approvedCount = projects.filter(p => p.isApproved).length;

  return (
    <div className="space-y-12 p-8">
      {/* Header Area */}
      <header className="border-b border-zinc-900 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <h1 className="text-8xl font-black uppercase tracking-tighter leading-none italic">
              PROJECT<br />ARCHIVE
            </h1>
            <p className="text-xs text-zinc-600 tracking-[0.4em] uppercase font-bold">
              MISSION_REGISTRY_V1.1
            </p>
          </div>
          
          <div className="flex gap-4">
            <TacticalCard variant="dashed" className="w-40 py-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-black">PENDING</span>
                <span className="text-4xl font-black italic">{pendingCount.toString().padStart(2, '0')}</span>
              </div>
            </TacticalCard>
            <TacticalCard variant="dashed" className="w-40 py-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-black">APPROVED</span>
                <span className="text-4xl font-black italic">{approvedCount.toString().padStart(2, '0')}</span>
              </div>
            </TacticalCard>
          </div>
        </div>
      </header>

      {/* Main Table */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
          <div className="text-xl font-black uppercase tracking-tighter">PROJECT_DIRECTORY_LIST</div>
          <div className="text-[8px] text-zinc-800 uppercase tracking-widest font-bold">SYSLOG_ADDR: 0x82A1</div>
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
