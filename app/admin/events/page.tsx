import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { EventTable } from "./EventTable";
import { TacticalButton } from "@/components/ui/TacticalButton";

export default async function EventsAdminPage() {
  const session = await auth();

  if (session?.user?.role !== "admin") {
    redirect("/");
  }

  const events = await db.event.findMany({
    orderBy: { eventDate: 'desc' },
  });

  return (
    <div className="flex-1 bg-black p-8 space-y-12">
      {/* Header Info */}
      <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-zinc-900 pb-12 gap-8">
        <div className="space-y-4">
          <div className="bg-white text-black inline-block px-2 py-0.5 text-[10px] font-black tracking-widest uppercase">
            STATUS: OPERATIONAL
          </div>
          <h1 className="text-6xl font-black uppercase tracking-tighter leading-none">
            EVENT<br />MANAGEMENT
            <span className="block text-2xl text-zinc-700 tracking-tight mt-4">(SYSTEM_EVENT_REGISTRY)</span>
          </h1>
        </div>

        <div className="flex gap-4">
           {/* In a real app, this would open a Dialog/Modal */}
           <TacticalButton size="lg" variant="primary" prefix="">
              CREATE_NEW_EVENT
           </TacticalButton>
        </div>
      </header>

      {/* Main Table Interface */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2 text-[9px] text-zinc-600 uppercase tracking-widest font-bold">
           <span>EVENT_UPLINK (SECTOR_GLOBAL)</span>
           <div className="flex items-center gap-4">
              <span>SYNC_STATUS: STABLE</span>
              <div className="w-2 h-2 bg-white" />
           </div>
        </div>
        
        <EventTable initialEvents={events as any} />
      </section>

      {/* Footer Meta */}
      <footer className="pt-12 border-t border-zinc-900 flex justify-between items-center text-[9px] text-zinc-700 uppercase tracking-[0.4em] font-bold">
         <span>©2024_TACTICAL_ARCHIVE_CS_CLUB</span>
         <div className="flex gap-8 text-zinc-800">
            <span>SECTOR_E604</span>
            <span>UPLINK_STABLE</span>
         </div>
      </footer>
    </div>
  );
}
