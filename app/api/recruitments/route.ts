import { type NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { rateLimit, rateLimitKey, tooManyRequests } from "@/lib/rate-limit";
import { fieldErrors, recruitmentApplicationSchema } from "@/lib/recruitment";
import { isRecruitmentOpen } from "@/lib/recruitment-config";

// Public: applicants have no account. Throttled like event registration, and
// refused outright while an admin has recruitment switched off.
export async function POST(req: NextRequest) {
  const limit = rateLimit(rateLimitKey(req, "recruitment-apply"), 5, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  if (!(await isRecruitmentOpen())) {
    return NextResponse.json(
      { error: "Recruitment is closed" },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const parsed = recruitmentApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: fieldErrors(parsed.error) },
      { status: 422 },
    );
  }
  const data = parsed.data;

  // One open application per person. A rejected applicant may apply again in a
  // later drive, so only pending rows block.
  const existing = await db.recruitmentApplication.findFirst({
    where: {
      status: "pending",
      OR: [{ usn: data.usn }, { email: data.email }],
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You already have an application under review" },
      { status: 409 },
    );
  }

  const created = await db.recruitmentApplication.create({ data });

  void logAudit({
    action: "recruitment.apply",
    actorName: data.name,
    summary: `${data.name} (${data.usn}) applied to join`,
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
