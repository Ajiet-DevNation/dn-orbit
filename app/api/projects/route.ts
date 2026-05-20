import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const body = await req.json();
    const { title, description, githubRepoUrl, techStack, milestones } = body;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const project = await db.project.create({
      data: {
        title,
        description,
        githubRepoUrl,
        techStack: techStack ?? [],
        milestones: milestones ?? [],
        status: "planning",
        isApproved: false,
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
      where: { isApproved: true },
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
