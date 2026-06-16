import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TacticalCard } from "@/components/ui/TacticalCard";
import { TacticalButton } from "@/components/ui/TacticalButton";
import { EventTable } from "./EventTable";

export default async function AdminEventsPage() {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role)) {
    redirect("/");
  }

  const events = await db.event.findMany({
    select: {
      id: true,
      title: true,
      eventType: true,
      eventDate: true,
      location: true,
      isPublished: true,
    },
    orderBy: {
      eventDate: "desc",
    },
  });
  const totalEvents = events.length;
  const publishedCount = events.filter((e) => e.isPublished).length;

  return (
    <div className="space-y-12 p-8">
      <header className="border-b border-zinc-900 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <h1 className="text-8xl font-black uppercase tracking-tighter leading-none italic text-white">
              EVENT
              <br />
              MANAGEMENT
            </h1>
            <p className="text-xs text-zinc-600 tracking-[0.4em] uppercase font-bold">
              CS_EVENT_ARCHIVE_v1.2
            </p>
          </div>

          {/* UPDATED: Flex container now includes the Link to the new form */}
          <div className="flex flex-wrap gap-4 items-end">
            <Link href="/admin/events/new">
              <TacticalButton variant="primary" className="h-[60px] px-6">
                INITIATE_NEW_EVENT
              </TacticalButton>
            </Link>

            <TacticalCard variant="dashed" className="w-40 py-2 h-[60px]">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-black">
                  TOTAL
                </span>
                <span className="text-3xl text-white font-black italic leading-none">
                  {totalEvents.toString().padStart(2, "0")}
                </span>
              </div>
            </TacticalCard>

            <TacticalCard variant="dashed" className="w-40 py-2 h-[60px]">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-black">
                  ACTIVE
                </span>
                <span className="text-3xl text-white font-black italic leading-none">
                  {publishedCount.toString().padStart(2, "0")}
                </span>
              </div>
            </TacticalCard>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
          <div className="text-xl text-white font-black uppercase tracking-tighter">
            EVENT_DIRECTORY
          </div>
          <div className="text-[8px] text-[#22c55e] uppercase tracking-widest font-bold">
            STATUS: OPERATIONAL
          </div>
        </div>

        <EventTable initialEvents={events} />
      </div>
    </div>
  );
}
