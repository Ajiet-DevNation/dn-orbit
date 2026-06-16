import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canAccessAdmin, canManageRoles, isRole } from "@/lib/roles";
import { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session || !canAccessAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const { isVisible, role, bio } = body;

    const updateData: Prisma.UserUpdateInput = {};
    if (isVisible !== undefined) updateData.isVisible = Boolean(isVisible);
    if (bio !== undefined) updateData.bio = String(bio);

    if (role !== undefined) {
      // Any admin tier can toggle visibility/bio, but only the President may
      // change role tiers — and only to a valid tier.
      if (!canManageRoles(session.user.role)) {
        return NextResponse.json(
          { error: "Only the President may change roles" },
          { status: 403 }
        );
      }
      if (!isRole(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      // Don't let the President strip their own management ability and lock out.
      if (id === session.user.id && role !== "president") {
        return NextResponse.json(
          { error: "You cannot demote yourself from President" },
          { status: 400 }
        );
      }
      updateData.role = role;
    }

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