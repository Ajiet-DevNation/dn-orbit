import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessAdmin, canModerate } from "@/lib/roles";

type Params = { params: Promise<{ id: string }> };

// DELETE — remove an allowlist entry. Requires an admin session. Removing an
// entry does not sign out an already-authenticated user; it only prevents
// future sign-ins for that username/email. So removing an officer's entry is
// held to the same rank rule as rejecting them (canModerate): otherwise a core
// member could lock the President out at their next sign-in.

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session || !canAccessAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const entry = await db.allowlist.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // Matched the way the sign-in gate matches (lib/auth.ts): by username or
    // email, case-insensitively. Your own entry is never blocked by rank.
    const match: Prisma.UserWhereInput[] = [];
    if (entry.githubUsername)
      match.push({
        githubUsername: { equals: entry.githubUsername, mode: "insensitive" },
      });
    if (entry.email)
      match.push({ email: { equals: entry.email, mode: "insensitive" } });
    const holders =
      match.length > 0
        ? await db.user.findMany({
            where: { OR: match, NOT: { id: session.user.id } },
            select: { role: true },
          })
        : [];
    if (holders.some((u) => !canModerate(session.user.role, u.role))) {
      return NextResponse.json(
        { error: "You can't remove an officer above your rank" },
        { status: 403 },
      );
    }

    const removed = await db.allowlist.delete({ where: { id } });

    void logAudit({
      action: "allowlist.remove",
      actorId: session.user.id,
      actorName: session.user.name,
      summary: `Removed ${removed.githubUsername ?? removed.email ?? "an entry"} from the allowlist`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    console.error("Allowlist DELETE Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
