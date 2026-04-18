import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const { isVisible, role, bio } = body;

    const updateData: Prisma.UserUpdateInput = {};
    if (isVisible !== undefined) updateData.isVisible = Boolean(isVisible);
    if (role !== undefined) updateData.role = role; // "admin" or "member"
    if (bio !== undefined) updateData.bio = String(bio);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields provided to update" }, { status: 400 });
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Update Member Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}