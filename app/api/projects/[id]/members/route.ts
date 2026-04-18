import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// Helper to verify authorization
async function isAuthorized(projectId: string, userId: string, role: string) {
  if (role === "admin") return true;
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { leadId: true }
  });
  return project?.leadId === userId;
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const { id: projectId } = await params;
    
    if (!(await isAuthorized(projectId, session.user.id, session.user.role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, role } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const member = await db.projectMember.create({
      data: {
        projectId,
        userId,
        role,
      }
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ error: "User is already a member" }, { status: 400 });
      }
    }
    console.error("Add Member Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const { id: projectId } = await params;
    
    if (!(await isAuthorized(projectId, session.user.id, session.user.role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) return NextResponse.json({ error: "userId query param is required" }, { status: 400 });

    // Prevent removing the lead from the project
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (project?.leadId === userId) {
      return NextResponse.json({ error: "Cannot remove the project lead" }, { status: 400 });
    }

    await db.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId,
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: "Record not found" }, { status: 404 });
      }
    }
    console.error("Remove Member Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
