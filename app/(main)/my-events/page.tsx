import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { type MyEvent, MyEventsList } from "./MyEventsList";

export const metadata = {
  title: "Your Events · ORBIT",
};

// Fuller date for the event cards, e.g. "JUL 15, 2026".
function formatEventDateLong(date: Date): string {
  return date
    .toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    })
    .toUpperCase();
}

// A member's own events + registration rosters. Access is intrinsically scoped:
// the query only ever returns events this signed-in user created, so registrant
// PII (name/email/USN) is never exposed to anyone but the organizer.
export default async function MyEventsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const userId = session.user.id;

  const events = await db.event.findMany({
    where: { createdBy: userId },
    orderBy: { eventDate: "desc" },
    include: {
      _count: { select: { registrations: true } },
      registrations: {
        orderBy: { registeredAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          usn: true,
          attended: true,
          registeredAt: true,
        },
      },
    },
  });

  const myEvents: MyEvent[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    type: (e.eventType ?? "EVENT").toUpperCase(),
    dateLabel: formatEventDateLong(e.eventDate),
    location: e.location,
    reviewStatus: e.reviewStatus,
    isPublished: e.isPublished,
    registeredCount: e._count.registrations,
    attendedCount: e.registrations.filter((r) => r.attended).length,
    roster: e.registrations.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      usn: r.usn,
      attended: r.attended,
      registeredAt: r.registeredAt.toISOString(),
    })),
  }));

  return <MyEventsList events={myEvents} />;
}
