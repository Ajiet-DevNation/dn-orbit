import { notFound, redirect } from "next/navigation";
import { PixelPageHeader } from "@/components/admin/PixelPageHeader";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseFormSchema } from "@/lib/forms";
import { canAccessAdmin } from "@/lib/roles";
import EventCreationForm from "../../new/EventCreationForm";

export const metadata = { title: "EDIT EVENT // ORBIT ADMIN" };

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role)) redirect("/");

  const { id } = await params;
  const e = await db.event.findUnique({ where: { id } });
  if (!e) notFound();

  // Prefill for a `datetime-local` input. `toISOString()` yields UTC, which is
  // exactly the zone lib/validation.ts pins zone-less submissions to and
  // lib/event-format.ts renders in — so an edit round-trips losslessly. (Before
  // those two were pinned, this UTC string was re-parsed as server-local, which
  // shifted every event by the machine's offset on each save outside Vercel.)
  const toLocal = (d: Date | null) =>
    d ? new Date(d).toISOString().slice(0, 16) : "";

  return (
    <div className="space-y-8 p-6 md:p-8">
      <PixelPageHeader title="EDIT EVENT" subtitle={e.title.toUpperCase()} />
      <EventCreationForm
        eventId={e.id}
        initial={{
          title: e.title,
          eventType: e.eventType ?? "",
          description: e.description ?? "",
          eventDate: toLocal(e.eventDate),
          location: e.location ?? "",
          audience: e.audience,
          capacity: e.capacity?.toString() ?? "",
          registrationDeadline: toLocal(e.registrationDeadline),
          bannerUrl: e.bannerUrl ?? "",
          isPublished: e.isPublished ? "true" : "false",
          formSchema: parseFormSchema(e.formSchema),
        }}
      />
    </div>
  );
}
