import { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessAdmin, canManageRoles } from "@/lib/roles";
import { allowlistEntrySchema, parseBody } from "@/lib/validation";

// GET — list allowlist entries (newest first). POST — add an entry by GitHub
// username and/or email. Both require an admin session. Values are normalized to
// lowercase so the sign-in gate (lib/auth.ts) can match them with an exact query.

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  if (!canAccessAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const entries = await db.allowlist.findMany({
    // Bounded: one page view must never become an unbounded transfer.
    take: 500,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    if (!canAccessAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = await parseBody(req, allowlistEntrySchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { githubUsername, email, note, grantRole } = parsed.data;

    // Pre-granting faculty hands out admin access at first sign-in, so it is a
    // role change: President only, same as the member role picker.
    if (grantRole && !canManageRoles(session.user.role)) {
      return NextResponse.json(
        { error: "Only the President may invite faculty" },
        { status: 403 },
      );
    }

    const entry = await db.allowlist.create({
      data: {
        githubUsername,
        email,
        note,
        grantRole: grantRole ?? null,
        addedBy: session.user.id,
      },
    });

    void logAudit({
      action: "allowlist.add",
      actorId: session.user.id,
      actorName: session.user.name,
      summary: `Added ${githubUsername ?? email} to the allowlist${grantRole ? ` as ${grantRole}` : ""}`,
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "That username or email is already on the allowlist" },
        { status: 409 },
      );
    }
    console.error("Allowlist POST Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
