import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isApproved } from "@/lib/access";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    if (!(await isApproved(session.user.id)))
      return NextResponse.json({ error: "Pending approval" }, { status: 403 });

    const body = await req.json();
    const { title, description, imageUrl, githubRepoUrl, techStack, milestones } = body;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const project = await db.project.create({
      data: {
        title,
        description,
        imageUrl,
        githubRepoUrl,
        techStack: techStack ?? [],
        milestones: milestones ?? [],
        status: "planning",
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
