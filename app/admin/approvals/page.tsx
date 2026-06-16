import { auth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AdminHeading } from "@/components/ui/AdminHeading";
import { ApprovalsQueue } from "./ApprovalsQueue";

// Unified moderation queue: every project/event that hasn't been actioned yet.
// Approving/rejecting happens here; the per-section list pages show status too.
export default async function AdminApprovalsPage() {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role)) redirect("/");

  const [projects, events] = await Promise.all([
    db.project.findMany({
      where: { reviewStatus: "pending" },
      select: {
        id: true,
        title: true,
        description: true,
        submittedAt: true,
        lead: { select: { name: true, githubUsername: true } },
      },
      orderBy: { submittedAt: "desc" },
    }),
    db.event.findMany({
      where: { reviewStatus: "pending" },
      select: {
        id: true,
        title: true,
        description: true,
        eventDate: true,
        isPublished: true,
        creator: { select: { name: true, githubUsername: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const projectRows = projects.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    submittedAt: p.submittedAt,
    authorName: p.lead?.name ?? "UNKNOWN",
    authorGithub: p.lead?.githubUsername ?? null,
  }));

  const eventRows = events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    eventDate: e.eventDate,
    isPublished: e.isPublished,
    authorName: e.creator?.name ?? "UNKNOWN",
    authorGithub: e.creator?.githubUsername ?? null,
  }));

  return (
    <div className="space-y-12 p-8">
      <AdminHeading
        title="APPROVALS"
        sub="CONTENT_MODERATION_QUEUE"
        code={`${projectRows.length + eventRows.length} PENDING`}
      />
      <ApprovalsQueue projects={projectRows} events={eventRows} />
    </div>
  );
}
