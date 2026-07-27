import { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/roles";

// GET — list allowlist entries (newest first). POST — add an entry by GitHub
// username and/or email. Both require an admin session. Values are normalized to
// lowercase so the sign-in gate (lib/auth.ts) can match them with an exact query.

export async function GET() {
  const session = await auth();
  if (!session || !canAccessAdmin(session.user.role)) {
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
    if (!session || !canAccessAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    const githubUsername =
      typeof body.githubUsername === "string" && body.githubUsername.trim()
        ? body.githubUsername.trim().toLowerCase()
        : null;
    const email =
      typeof body.email === "string" && body.email.trim()
        ? body.email.trim().toLowerCase()
        : null;
    const note =
      typeof body.note === "string" && body.note.trim()
        ? body.note.trim()
        : null;

    if (!githubUsername && !email) {
      return NextResponse.json(
        { error: "Provide a GitHub username or an email" },
        { status: 400 },
      );
    }

    const entry = await db.allowlist.create({
      data: { githubUsername, email, note, addedBy: session.user.id },
    });

    void logAudit({
      action: "allowlist.add",
      actorId: session.user.id,
      actorName: session.user.name,
      summary: `Added ${githubUsername ?? email} to the allowlist`,
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
