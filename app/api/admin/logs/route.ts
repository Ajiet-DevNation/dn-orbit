import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/roles";

// Recent audit-log entries for the dashboard feed. Admin-gated. `take` is capped
// so a malicious/huge value can't pull the whole (potentially enormous) table;
// the createdAt index keeps "newest N" fast regardless of total volume.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !canAccessAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const takeParam = Number(new URL(req.url).searchParams.get("take"));
  const take = Math.min(
    Number.isFinite(takeParam) && takeParam > 0 ? takeParam : 100,
    200,
  );

  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      action: true,
      actorName: true,
      summary: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ logs });
}
