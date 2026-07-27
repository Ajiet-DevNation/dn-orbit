import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
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
      select: { leadId: true },
    });

    if (!project)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (
      project.leadId !== session.user.id &&
      !canAccessAdmin(session.user.role)
    ) {
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

    const updatedProject = await db.project.update({
      where: { id },
      data: dataToUpdate,
    });

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
