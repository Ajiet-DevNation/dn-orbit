import { redirect } from "next/navigation";
import { PixelPageHeader } from "@/components/admin/PixelPageHeader";
import { PixelStatTile } from "@/components/admin/PixelStatTile";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/roles";
import { ProjectTable } from "./ProjectTable";

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
      reviewStatus: true,
      submittedAt: true,
      lead: {
        select: {
          name: true,
          githubUsername: true,
        },
      },
    },
    orderBy: {
      submittedAt: "desc",
    },
  });
  const pendingCount = projects.filter(
    (p) => p.reviewStatus === "pending",
  ).length;
  const approvedCount = projects.filter(
    (p) => p.reviewStatus === "approved",
  ).length;

  return (
    <div className="space-y-8 p-8">
      <PixelPageHeader
        title="PROJECT MANAGEMENT"
        subtitle="PROJECT_DIRECTORY_V1.1"
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <PixelStatTile
          label="PENDING"
          value={pendingCount.toString().padStart(2, "0")}
        />
        <PixelStatTile
          label="APPROVED"
          value={approvedCount.toString().padStart(2, "0")}
        />
      </div>

      <ProjectTable
        initialProjects={projects.map((p) => ({
          ...p,
          leadName: p.lead?.name || "UNNAMED_LEAD",
          leadGithub: p.lead?.githubUsername || null,
        }))}
      />
    </div>
  );
}
