import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";
import { parseFormSchema } from "@/lib/forms";

type Params = { params: Promise<{ id: string }> };

function csvCell(v: unknown): string {
  let s = Array.isArray(v) ? v.join("; ") : v == null ? "" : String(v);
  // CSV formula-injection guard: a cell that a spreadsheet would treat as a
  // formula (leading = + - @ or tab/CR) is neutralised with a leading apostrophe
  // so registrant-supplied text can't execute when an admin opens the export.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || !canAccessAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const event = await db.event.findUnique({
    where: { id },
    include: { registrations: { orderBy: { registeredAt: "asc" } } },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fields = parseFormSchema(event.formSchema);
  const header = [
    "Registered At", "Name", "Email", "USN", "Attended",
    ...fields.map((f) => f.label),
  ];
  const rows = event.registrations.map((r) => {
    const responses = (r.responses ?? {}) as Record<string, unknown>;
    return [
      r.registeredAt.toISOString(),
      r.name, r.email, r.usn ?? "", r.attended ? "yes" : "no",
      ...fields.map((f) => responses[f.id]),
    ].map(csvCell).join(",");
  });
  const csv = [header.map(csvCell).join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="registrations-${id}.csv"`,
    },
  });
}
