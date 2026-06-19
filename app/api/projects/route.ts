import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isApproved } from "@/lib/access";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    if (!(await isApproved(session.user.id)))
      return NextResponse.json({ error: "Pending approval" }, { status: 403 });

    const body = await req.json();
    const { title, description, imageUrl, githubRepoUrl, demoUrl, techStack, milestones, status, progressPct } = body;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    // GitHub repo is mandatory for a project submission.
    if (!githubRepoUrl || !String(githubRepoUrl).trim()) {
      return NextResponse.json({ error: "GitHub repo URL is required" }, { status: 400 });
    }

    // Whitelist status against the ProjectStatus enum and clamp progress to an
    // integer 0–100 — never trust the client. Unknown/missing values fall back
    // to a fresh "planning, 0%" project.
    const ALLOWED_STATUS = ["planning", "active", "completed", "stalled"] as const;
    const safeStatus = ALLOWED_STATUS.includes(status)
      ? (status as (typeof ALLOWED_STATUS)[number])
      : "planning";
    const safeProgress = Math.max(0, Math.min(100, Math.round(Number(progressPct) || 0)));

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
          }
        }
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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const projects = await db.project.findMany({
      where: { reviewStatus: "approved" },
      include: {
        lead: { select: { id: true, name: true, image: true } },
        members: { select: { role: true, user: { select: { id: true, name: true } } } }
      },
      orderBy: { submittedAt: "desc" }
    });
    return NextResponse.json(projects);
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
