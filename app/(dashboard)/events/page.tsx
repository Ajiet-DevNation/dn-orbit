import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import EventClientList from "./EventClientList";

export const metadata = {
  title: "EVENTS // ORBIT",
};

export default async function MemberEventsPage() {
  // 1. Enforce session security
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // 2. Fetch all published events from Prisma
  const eventsRaw = await db.event.findMany({
    where: {
      isPublished: true,
    },
    orderBy: {
      eventDate: "asc",
    },
  });

  // Ensure plain objects are passed to the Client Component
  const events = eventsRaw.map((event) => ({
    ...event,
    eventDate: event.eventDate.toISOString(),
  }));

  // 3. Render the Tactical Archive Page Shell
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

      {/* Hand off data to Phase 2: Client Component */}
      <EventClientList initialEvents={events} />
    </div>
  );
}
