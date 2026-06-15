import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";

// GET — list allowlist entries (newest first). POST — add an entry by GitHub
// username and/or email. Both require an admin session. Values are normalized to
// lowercase so the sign-in gate (lib/auth.ts) can match them with an exact query.

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const entries = await db.allowlist.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
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
        { status: 400 }
      );
    }

    const entry = await db.allowlist.create({
      data: { githubUsername, email, note, addedBy: session.user.id },
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "That username or email is already on the allowlist" },
        { status: 409 }
      );
    }
    console.error("Allowlist POST Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
