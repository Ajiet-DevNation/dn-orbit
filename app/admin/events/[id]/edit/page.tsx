import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";
import { db } from "@/lib/db";
import { parseFormSchema } from "@/lib/forms";
import { PixelPageHeader } from "@/components/admin/PixelPageHeader";
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

  const toLocal = (d: Date | null) =>
    d ? new Date(d).toISOString().slice(0, 16) : "";

  return (
    <div className="space-y-8 p-8">
      <PixelPageHeader title="EDIT EVENT" subtitle={e.title.toUpperCase()} />
      <EventCreationForm
        eventId={e.id}
        initial={{
          title: e.title,
          eventType: e.eventType ?? "WORKSHOP",
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
