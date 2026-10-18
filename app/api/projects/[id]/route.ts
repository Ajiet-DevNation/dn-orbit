import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/roles";
import { parseBody, updateProjectSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const { id } = await params;

    // Fetch existing to check lead
    const project = await db.project.findUnique({
      where: { id },
      select: {
        leadId: true,
        reviewStatus: true,
        title: true,
        description: true,
        githubRepoUrl: true,
        techStack: true,
      },
    });

    if (!project)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isAdmin = canAccessAdmin(session.user.role);
    if (project.leadId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = await parseBody(req, updateProjectSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { techStack, milestones, githubRepoUrl, status, description, title } =
      parsed.data;

    const dataToUpdate: Prisma.ProjectUpdateInput = {};
    if (title !== undefined) dataToUpdate.title = title;
    if (description !== undefined) dataToUpdate.description = description;
    if (githubRepoUrl !== undefined) dataToUpdate.githubRepoUrl = githubRepoUrl;
    if (techStack !== undefined) dataToUpdate.techStack = techStack;
    if (status !== undefined) dataToUpdate.status = status;

    if (milestones !== undefined) {
      dataToUpdate.milestones = milestones;

      // progressPct is always derived from the milestones, never taken from the
      // client. Schema guarantees the { label, done } shape by this point.
      const completed = milestones.filter((m) => m.done).length;
      dataToUpdate.progressPct =
        milestones.length > 0
          ? Math.round((completed / milestones.length) * 100)
          : 0;
    }

    // A lead changing what the public sees on an APPROVED project sends it
    // back to moderation; otherwise approval could be used once and the card
    // rewritten (title, copy, outbound repo link) with no review. Admin edits
    // keep the decision.
    const publicChange =
      (title !== undefined && title !== project.title) ||
      (description !== undefined &&
        (description ?? null) !== project.description) ||
      (githubRepoUrl !== undefined &&
        (githubRepoUrl ?? null) !== project.githubRepoUrl) ||
      (techStack !== undefined &&
        JSON.stringify(techStack) !== JSON.stringify(project.techStack));
    const sendBackToReview =
      !isAdmin && project.reviewStatus === "approved" && publicChange;
    if (sendBackToReview) {
      dataToUpdate.reviewStatus = "pending";
      dataToUpdate.reviewedBy = { disconnect: true };
      dataToUpdate.reviewedAt = null;
    }

    const updatedProject = await db.project.update({
      where: { id },
      data: dataToUpdate,
    });

    if (sendBackToReview) {
      void logAudit({
        action: "project.resubmit",
        actorId: session.user.id,
        actorName: session.user.name,
        summary: `Edited project "${updatedProject.title}" — back in review`,
      });
    }

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Update Project Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();

    // Unapproved submissions are only visible to their lead and to admins —
    // this route previously served anything in the moderation queue to anyone
    // holding the id.
    const visibility: Prisma.ProjectWhereInput =
      session && canAccessAdmin(session.user.role)
        ? {}
        : session
          ? { OR: [{ reviewStatus: "approved" }, { leadId: session.user.id }] }
          : { reviewStatus: "approved" };

    const project = await db.project.findFirst({
      where: { id, ...visibility },
      include: {
        lead: {
          select: { id: true, name: true, githubUsername: true, image: true },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                githubUsername: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!project)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(project);
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
