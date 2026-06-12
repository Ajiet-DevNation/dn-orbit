import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import EventClientList from "./EventClientList";

export const metadata = {
  title: "EVENTS // ORBIT",
};

export default async function MemberEventsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const eventsRaw = await db.event.findMany({
    where: { isPublished: true },
    orderBy: { eventDate: "asc" },
  });

  // FIX: Explicitly mapping to plain objects to fix build serialization errors
  const events = eventsRaw.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    eventType: event.eventType,
    eventDate: event.eventDate.toISOString(),
    location: event.location,
  }));

  return (
    <div className="p-8 space-y-12">
      <header className="border-b border-zinc-900 pb-12">
        <h1 className="text-8xl font-black uppercase tracking-tighter leading-none italic text-white">
          EVENTS
        </h1>
        <div className="flex items-center gap-4 mt-4">
          <span className="text-[10px] text-zinc-600 tracking-[0.4em] uppercase font-bold">
            MEMBER_EVENT_DIRECTORY
          </span>
          <div className="h-px flex-1 bg-zinc-900" />
        </div>
      </header>
      <EventClientList initialEvents={events} />
    </div>
  );
}
