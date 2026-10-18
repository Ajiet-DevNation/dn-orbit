import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { rateLimit, rateLimitKey, tooManyRequests } from "@/lib/rate-limit";
import {
  CV_MAX_BYTES,
  fieldErrors,
  looksLikePdf,
  recruitmentApplicationSchema,
} from "@/lib/recruitment";
import { isRecruitmentOpen } from "@/lib/recruitment-config";
import { CV_BUCKET, getSupabaseAdmin } from "@/lib/supabase";

// Public: applicants have no account. Throttled like event registration, and
// refused outright while an admin has recruitment switched off.
//
// Multipart: `data` is the application as JSON, `cv` an optional PDF. The CV
// rides in the same request (no separate public upload endpoint), so a file is
// only ever stored for an application that passed every check below.
export async function POST(req: NextRequest) {
  const limit = rateLimit(rateLimitKey(req, "recruitment-apply"), 5, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  if (!(await isRecruitmentOpen())) {
    return NextResponse.json(
      { error: "Recruitment is closed" },
      { status: 403 },
    );
  }

  const form = await req.formData().catch(() => null);
  let body: unknown = null;
  try {
    body = JSON.parse(String(form?.get("data") ?? ""));
  } catch {}
  if (!form || !body)
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const parsed = recruitmentApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: fieldErrors(parsed.error) },
      { status: 422 },
    );
  }
  const data = parsed.data;

  // Optional CV. An empty file input still posts a zero-byte File; treat it as
  // absent. The declared type is client-controlled, so the bytes are checked.
  const cvField = form.get("cv");
  const cvFile = cvField instanceof File && cvField.size > 0 ? cvField : null;
  let cvBytes: Buffer | null = null;
  if (cvFile) {
    if (cvFile.size > CV_MAX_BYTES) {
      return NextResponse.json(
        {
          error: "Validation failed",
          fields: { cv: "CV must be 2 MB or less" },
        },
        { status: 422 },
      );
    }
    cvBytes = Buffer.from(await cvFile.arrayBuffer());
    if (!looksLikePdf(cvBytes)) {
      return NextResponse.json(
        { error: "Validation failed", fields: { cv: "CV must be a PDF" } },
        { status: 422 },
      );
    }
  }

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

  // Random name → no path traversal, no collisions, nothing personal in it.
  const cvPath = cvBytes ? `${randomUUID()}.pdf` : null;
  if (cvBytes && cvPath) {
    const { error } = await getSupabaseAdmin()
      .storage.from(CV_BUCKET)
      .upload(cvPath, cvBytes, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (error) {
      console.error("CV upload error:", error);
      return NextResponse.json(
        { error: "Could not upload your CV, try again" },
        { status: 502 },
      );
    }
  }

  let created: { id: string };
  try {
    created = await db.recruitmentApplication.create({
      data: { ...data, cvPath },
      select: { id: true },
    });
  } catch (e) {
    // Don't leave an orphaned CV behind when the row never got written.
    if (cvPath)
      await getSupabaseAdmin().storage.from(CV_BUCKET).remove([cvPath]);
    throw e;
  }

  void logAudit({
    action: "recruitment.apply",
    actorName: data.name,
    summary: `${data.name} (${data.usn}) applied to join`,
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
