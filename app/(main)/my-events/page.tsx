import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatEventDateLong } from "@/lib/event-format";
import { parseFormSchema } from "@/lib/forms";
import { type MyEvent, MyEventsList } from "./MyEventsList";

export const metadata = {
  title: "Your Events · ORBIT",
};

// Bounds on what one page render will pull. The roster now carries every custom
// answer per registrant, so an uncapped query on a popular event could ship
// megabytes of JSON into the RSC payload. The CSV export is the unbounded path
// — it streams as a file instead of into the page — and the UI points at it
// whenever a roster is truncated.
const MAX_EVENTS = 100;
const MAX_ROSTER_ROWS = 300;

// A member's own events + registration rosters. Access is intrinsically scoped:
// the query only ever returns events this signed-in user created, so registrant
// PII (name/email/USN/answers) is never exposed to anyone but the organizer.
export default async function MyEventsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const userId = session.user.id;

  const [events, attendedGroups] = await Promise.all([
    db.event.findMany({
      where: { createdBy: userId },
      orderBy: { eventDate: "desc" },
      take: MAX_EVENTS,
      include: {
        _count: { select: { registrations: true } },
        registrations: {
          orderBy: { registeredAt: "desc" },
          take: MAX_ROSTER_ROWS,
          select: {
            id: true,
            name: true,
            email: true,
            usn: true,
            attended: true,
            registeredAt: true,
            // The organizer's own custom questions. Without this the roster
            // could only ever show name/email/USN, so the answers an organizer
            // built the form to collect were invisible to them.
            responses: true,
          },
        },
      },
    }),
    // Attendance is counted in the database rather than by filtering the loaded
    // rows — with the roster capped above, counting client-side would report
    // only the attendees who happened to fall inside the page.
    db.registration.groupBy({
      by: ["eventId"],
      where: { attended: true, event: { createdBy: userId } },
      _count: { _all: true },
    }),
  ]);

  const attendedByEvent = new Map(
    attendedGroups.map((g) => [g.eventId, g._count._all]),
  );

  const myEvents: MyEvent[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    type: (e.eventType ?? "EVENT").toUpperCase(),
    dateLabel: formatEventDateLong(e.eventDate),
    location: e.location,
    reviewStatus: e.reviewStatus,
    isPublished: e.isPublished,
    registeredCount: e._count.registrations,
    attendedCount: attendedByEvent.get(e.id) ?? 0,
    // Column headers come from the stored schema rather than the union of keys
    // present in `responses`, so questions nobody answered still get a column
    // (and the order matches the form the organizer built).
    formFields: parseFormSchema(e.formSchema).map((f) => ({
      id: f.id,
      label: f.label,
    })),
    roster: e.registrations.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      usn: r.usn,
      attended: r.attended,
      registeredAt: r.registeredAt.toISOString(),
      responses: (r.responses ?? {}) as Record<string, unknown>,
    })),
  }));

  return <MyEventsList events={myEvents} />;
}
