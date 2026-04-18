import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const { id } = await params;
    
    // Fetch existing to check lead
    const project = await db.project.findUnique({
      where: { id },
      select: { leadId: true }
    });

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (project.leadId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { techStack, milestones, githubRepoUrl, status, description, title } = body;

    const dataToUpdate: Prisma.ProjectUpdateInput = {};
    if (title !== undefined) dataToUpdate.title = title;
    if (description !== undefined) dataToUpdate.description = description;
    if (githubRepoUrl !== undefined) dataToUpdate.githubRepoUrl = githubRepoUrl;
    if (techStack !== undefined) dataToUpdate.techStack = techStack;
    if (status !== undefined) dataToUpdate.status = status;

    if (milestones !== undefined) {
      dataToUpdate.milestones = milestones;
      
      // Compute progressPct
      // format: { label: string, done: boolean }[]
      if (Array.isArray(milestones) && milestones.length > 0) {
        const completed = milestones.filter((m: { done?: boolean }) => m.done).length;
        dataToUpdate.progressPct = Math.round((completed / milestones.length) * 100);
      } else if (Array.isArray(milestones) && milestones.length === 0) {
        dataToUpdate.progressPct = 0;
      }
    }

    const updatedProject = await db.project.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Update Project Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const project = await db.project.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, name: true, githubUsername: true, image: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, githubUsername: true, image: true } }
          }
        }
      }
    });

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}