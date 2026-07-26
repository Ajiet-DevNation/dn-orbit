import { type NextRequest, NextResponse } from "next/server";
import { isApproved } from "@/lib/access";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createProjectSchema, parseBody } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    if (!(await isApproved(session.user.id)))
      return NextResponse.json({ error: "Pending approval" }, { status: 403 });

    // Status is enum-checked and progressPct bounded to 0–100 by the schema, so
    // anything that gets here is already safe to hand to Prisma.
    const parsed = await parseBody(req, createProjectSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const {
      title,
      description,
      imageUrl,
      githubRepoUrl,
      demoUrl,
      techStack,
      milestones,
      status,
      progressPct,
    } = parsed.data;

    const safeStatus = status ?? "planning";
    const safeProgress = progressPct ?? 0;

    const project = await db.project.create({
      data: {
        title,
        description,
        imageUrl,
        githubRepoUrl,
        demoUrl: demoUrl || null,
        techStack: techStack ?? [],
        milestones: milestones ?? [],
        status: safeStatus,
        progressPct: safeProgress,
        reviewStatus: "pending",
        leadId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: "lead",
          },
        },
      },
    });

    void logAudit({
      action: "project.create",
      actorId: session.user.id,
      actorName: session.user.name,
      summary: `Submitted project "${project.title}"`,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Create Project Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// Bound on an unauthenticated, unpaginated endpoint — see the events list route.
const MAX_PROJECTS = 500;

export async function GET() {
  try {
    const projects = await db.project.findMany({
      where: { reviewStatus: "approved" },
      include: {
        lead: { select: { id: true, name: true, image: true } },
        members: {
          select: { role: true, user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { submittedAt: "desc" },
      take: MAX_PROJECTS,
    });
    return NextResponse.json(projects);
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
