import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TacticalCard } from "@/components/ui/TacticalCard";
import { Calendar, MapPin } from "lucide-react";

/**
 * Events page — Shows all published events to authenticated members.
 *
 * This is a Server Component: it fetches events directly from the DB
 * using Prisma, so no API route needed. Only published events are shown.
 * The page also checks if the current user is registered for each event.
 */
export default async function EventsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const events = await db.event.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      title: true,
      description: true,
      eventType: true,
      eventDate: true,
      location: true,
      registrations: {
        where: { userId: session.user.id },
        select: { id: true },
      },
      _count: {
        select: { registrations: true },
      },
    },
    orderBy: { eventDate: "desc" },
  });

  const upcoming = events.filter((e) => new Date(e.eventDate) >= new Date());
  const past = events.filter((e) => new Date(e.eventDate) < new Date());

  return (
    <div className="p-8 space-y-12">
      <header className="border-b border-zinc-900 pb-12">
        <h1 className="text-7xl md:text-8xl font-black uppercase tracking-tighter leading-none italic">
          EVENTS
        </h1>
        <div className="flex items-center gap-4 mt-4">
          <span className="text-[10px] text-zinc-600 tracking-[0.4em] uppercase font-bold">
            ORBIT_EVENT_ARCHIVE
          </span>
          <div className="h-px flex-1 bg-zinc-900" />
          <span className="text-[9px] text-zinc-500 tracking-widest uppercase">
            {events.length.toString().padStart(2, "0")}_TOTAL_ENTRIES
          </span>
        </div>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TacticalCard id="0xUP" title="UPCOMING">
          <span className="text-4xl font-black italic text-white">
            {upcoming.length.toString().padStart(2, "0")}
          </span>
        </TacticalCard>
        <TacticalCard id="0xPAST" title="PAST_EVENTS">
          <span className="text-4xl font-black italic text-white">
            {past.length.toString().padStart(2, "0")}
          </span>
        </TacticalCard>
        <TacticalCard id="0xREG" title="YOUR_REGISTRATIONS">
          <span className="text-4xl font-black italic text-white">
            {events
              .filter((e) => e.registrations.length > 0)
              .length.toString()
              .padStart(2, "0")}
          </span>
        </TacticalCard>
      </div>

      {/* Upcoming events */}
      {upcoming.length > 0 && (
        <section className="space-y-6">
          <SectionHeader label="UPCOMING_EVENTS" count={upcoming.length} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {upcoming.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isRegistered={event.registrations.length > 0}
              />
            ))}
          </div>
        </section>
      )}

      {/* Past events */}
      {past.length > 0 && (
        <section className="space-y-6">
          <SectionHeader label="PAST_EVENTS" count={past.length} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {past.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isRegistered={event.registrations.length > 0}
                isPast
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {events.length === 0 && (
        <TacticalCard id="0xNULL" title="NO_EVENTS" variant="dashed">
          <p className="text-[10px] text-zinc-600 tracking-widest uppercase">
            NO_PUBLISHED_EVENTS_FOUND_IN_THE_ARCHIVE
          </p>
        </TacticalCard>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-4">
      <h2 className="text-xl font-black uppercase tracking-tighter">{label}</h2>
      <div className="h-px flex-1 bg-zinc-900" />
      <span className="text-[9px] text-zinc-600 tracking-widest uppercase">
        {count.toString().padStart(2, "0")}_ENTRIES
      </span>
    </div>
  );
}

function EventCard({
  event,
  isRegistered,
  isPast = false,
}: {
  event: {
    id: string;
    title: string;
    description: string | null;
    eventType: string | null;
    eventDate: Date;
    location: string | null;
    _count: { registrations: number };
  };
  isRegistered: boolean;
  isPast?: boolean;
}) {
  const dateStr = new Date(event.eventDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className={`border p-6 space-y-4 transition-colors ${
        isPast
          ? "border-zinc-900 opacity-60"
          : "border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h3 className="text-lg font-black uppercase tracking-tighter text-white truncate">
            {event.title}
          </h3>
          {event.eventType && (
            <span className="text-[9px] text-zinc-500 tracking-widest uppercase">
              TYPE: {event.eventType}
            </span>
          )}
        </div>
        {isRegistered && (
          <span className="shrink-0 text-[8px] text-black bg-emerald-400 px-2 py-1 font-black tracking-widest uppercase">
            REGISTERED
          </span>
        )}
      </div>

      {event.description && (
        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
          {event.description}
        </p>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] text-zinc-500 tracking-widest uppercase">
        <span className="flex items-center gap-2">
          <Calendar className="w-3 h-3" />
          {dateStr}
        </span>
        {event.location && (
          <span className="flex items-center gap-2">
            <MapPin className="w-3 h-3" />
            {event.location}
          </span>
        )}
        <span>{event._count.registrations} REGISTERED</span>
      </div>
    </div>
  );
}
