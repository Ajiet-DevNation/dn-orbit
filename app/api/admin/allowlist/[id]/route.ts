import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/roles";

type Params = { params: Promise<{ id: string }> };

// DELETE — remove an allowlist entry. Requires an admin session. Removing an
// entry does not sign out an already-authenticated user; it only prevents
// future sign-ins for that username/email.

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session || !canAccessAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
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
