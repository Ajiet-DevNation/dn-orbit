import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { db, isRecordNotFound } from "@/lib/db";
import { toTitleCase } from "@/lib/names";
import { invalidatePublic, PUBLIC_TAG } from "@/lib/public-tags";
import { canAccessAdmin, canManageRoles, canModerate } from "@/lib/roles";
import { memberUpdateSchema, parseBody } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    if (!canAccessAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const parsed = await parseBody(req, memberUpdateSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { isVisible, role, bio, status } = parsed.data;

    const target = await db.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!target) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    // A lower admin tier may not reject, hide or edit the officers above it
    // (a rejected account cannot sign in, so this was a lock-out). Members may
    // still edit their own row.
    if (
      id !== session.user.id &&
      !canModerate(session.user.role, target.role)
    ) {
      return NextResponse.json(
        { error: "You can't change a member of a higher tier" },
        { status: 403 },
      );
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (isVisible !== undefined) updateData.isVisible = isVisible;
    if (bio !== undefined) updateData.bio = bio || null;

    // Approve / reject membership — allowed for any admin tier (route is already
    // canAccessAdmin-gated); only role-tier changes below require President.
    if (status !== undefined) updateData.status = status;

    if (role !== undefined) {
      // Any admin tier can toggle visibility/bio, but only the President may
      // change role tiers.
      if (!canManageRoles(session.user.role)) {
        return NextResponse.json(
          { error: "Only the President may change roles" },
          { status: 403 },
        );
      }
      // Don't let the President strip their own management ability and lock out.
      if (id === session.user.id && role !== "president") {
        return NextResponse.json(
          { error: "You cannot demote yourself from President" },
          { status: 400 },
        );
      }
      updateData.role = role;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields provided to update" },
        { status: 400 },
      );
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
    });
    // Visibility and status decide who is on the public board.
    invalidatePublic(PUBLIC_TAG.leaderboard);

    // Log the meaningful member mutations (role / membership status changes).
    const who = toTitleCase(updatedUser.name) || "a member";
    if (role !== undefined) {
      void logAudit({
        action: "member.role_change",
        actorId: session.user.id,
        actorName: session.user.name,
        summary: `Set ${who}'s role to ${role}`,
      });
    }
    if (status !== undefined) {
      void logAudit({
        action: "member.status_change",
        actorId: session.user.id,
        actorName: session.user.name,
        summary: `${status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Updated"} membership for ${who}`,
      });
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    if (isRecordNotFound(error)) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    console.error("Update Member Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
