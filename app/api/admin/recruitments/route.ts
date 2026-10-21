import { type NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { invalidatePublic, PUBLIC_TAG } from "@/lib/public-tags";
import { recruitmentConfigSchema } from "@/lib/recruitment";
import { canAccessAdmin } from "@/lib/roles";
import { parseBody } from "@/lib/validation";

// Open or close the recruitment drive. Upsert on the fixed singleton id, so the
// first toggle on a fresh database creates the row.
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || !canAccessAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = await parseBody(req, recruitmentConfigSchema);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { isOpen } = parsed.data;

  const config = await db.recruitmentConfig.upsert({
    where: { id: 1 },
    create: { id: 1, isOpen, updatedBy: session.user.id },
    update: { isOpen, updatedBy: session.user.id },
  });
  invalidatePublic(PUBLIC_TAG.recruitment);

  void logAudit({
    action: isOpen ? "recruitment.open" : "recruitment.close",
    actorId: session.user.id,
    actorName: session.user.name,
    summary: `${isOpen ? "Opened" : "Closed"} recruitment`,
  });

  return NextResponse.json({ isOpen: config.isOpen });
}
