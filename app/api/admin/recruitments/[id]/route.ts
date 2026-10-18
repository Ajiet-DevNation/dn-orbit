import { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recruitmentReviewSchema } from "@/lib/recruitment";
import { canAccessAdmin } from "@/lib/roles";
import { CV_BUCKET, getSupabaseAdmin } from "@/lib/supabase";
import { parseBody } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// Accept or reject an application. Status only — accepting does not touch the
// sign-in allowlist; admins add accepted people there separately.
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || !canAccessAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = await parseBody(req, recruitmentReviewSchema);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { status } = parsed.data;
  const { id } = await params;

  try {
    const updated = await db.recruitmentApplication.update({
      where: { id },
      data: {
        status,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    });

    void logAudit({
      action: `recruitment.${status === "approved" ? "accept" : "reject"}`,
      actorId: session.user.id,
      actorName: session.user.name,
      summary: `${status === "approved" ? "Accepted" : "Rejected"} ${updated.name}'s application`,
    });

    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }
    throw e;
  }
}

// Permanently remove an application and its CV — for clearing junk/test
// submissions. The row goes first: if the file removal then fails, the worst
// case is an orphaned file in storage, never a row pointing at a missing CV.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || !canAccessAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const application = await db.recruitmentApplication.findUnique({
    where: { id },
    select: { name: true, cvPath: true },
  });
  if (!application) {
    return NextResponse.json(
      { error: "Application not found" },
      { status: 404 },
    );
  }

  await db.recruitmentApplication.delete({ where: { id } });

  if (application.cvPath) {
    const { error } = await getSupabaseAdmin()
      .storage.from(CV_BUCKET)
      .remove([application.cvPath]);
    if (error) console.error("CV delete error:", error);
  }

  void logAudit({
    action: "recruitment.delete",
    actorId: session.user.id,
    actorName: session.user.name,
    summary: `Deleted ${application.name}'s application`,
  });

  return NextResponse.json({ success: true });
}
