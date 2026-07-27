import { notFound, redirect } from "next/navigation";
import { PixelPageHeader } from "@/components/admin/PixelPageHeader";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseFormSchema } from "@/lib/forms";
import { canAccessAdmin } from "@/lib/roles";
import EventRosterClient from "./EventRosterClient";

export const metadata = { title: "EVENT ROSTER // ORBIT ADMIN" };

export default async function AdminEventRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role)) redirect("/");

  const { id } = await params;
  const event = await db.event.findUnique({
    where: { id },
    include: { registrations: { orderBy: { registeredAt: "asc" } } },
  });
  if (!event) notFound();

  const formFields = parseFormSchema(event.formSchema).map((f) => ({
    id: f.id,
    label: f.label,
  }));

  const registrations = event.registrations.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    usn: r.usn ?? "—",
    attended: r.attended,
    registeredAt: r.registeredAt.toISOString(),
    responses: (r.responses ?? {}) as Record<string, unknown>,
  }));

  return (
    <div className="space-y-8 p-6 md:p-8">
      <PixelPageHeader
        title="EVENT ROSTER"
        subtitle={event.title.toUpperCase()}
      />
      <EventRosterClient
        eventId={event.id}
        registrations={registrations}
        formFields={formFields}
      />
    </div>
  );
}
