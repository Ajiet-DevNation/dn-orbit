import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TacticalCard } from "@/components/ui/TacticalCard";
import { EventTable } from "./EventTable";

interface EventWithMetadata {
  id: string;
  title: string;
  eventType: string | null;
  eventDate: Date;
  location: string | null;
  isPublished: boolean;
}

export default async function AdminEventsPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/");
  }

  const eventsRaw = await db.event.findMany({
    orderBy: {
      eventDate: "desc"
    }
  });

  const events = eventsRaw as EventWithMetadata[];
  const totalEvents = events.length;
  const publishedCount = events.filter(e => e.isPublished).length;

  return (
    <div className="space-y-12 p-8">
      <header className="border-b border-zinc-900 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <h1 className="text-8xl font-black uppercase tracking-tighter leading-none italic">
              EVENT<br />MANAGEMENT
            </h1>
            <p className="text-xs text-zinc-600 tracking-[0.4em] uppercase font-bold">
              CS_EVENT_ARCHIVE_v1.2
            </p>
          </div>
          
          <div className="flex gap-4">
            <TacticalCard variant="dashed" className="w-40 py-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-black">TOTAL</span>
                <span className="text-4xl font-black italic">{totalEvents.toString().padStart(2, '0')}</span>
              </div>
            </TacticalCard>
            <TacticalCard variant="dashed" className="w-40 py-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-black">ACTIVE</span>
                <span className="text-4xl font-black italic">{publishedCount.toString().padStart(2, '0')}</span>
              </div>
            </TacticalCard>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
          <div className="text-xl font-black uppercase tracking-tighter">EVENT_DIRECTORY</div>
          <div className="text-[8px] text-zinc-800 uppercase tracking-widest font-bold">STATUS: OPERATIONAL</div>
        </div>
        
        <EventTable initialEvents={events} />
      </div>
    </div>
  );
}
