import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import EventRosterClient from "./EventRosterClient";

export const metadata = {
  title: "EVENT ROSTER // ORBIT ADMIN",
};

export default async function AdminEventRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 1. Enforce high-level security clearance
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/");
  }

  // 2. Await the params to resolve the dynamic ID
  const resolvedParams = await params;

  // 3. Fetch the event AND include all registrations with user data
  const eventRaw = await db.event.findUnique({
    where: { id: resolvedParams.id },
    include: {
      registrations: {
        include: {
          user: true, // Pulls Name and USN
        },
        orderBy: {
          registeredAt: "asc", // <--- FIX: Changed from createdAt to registeredAt
        },
      },
    },
  });

  if (!eventRaw) {
    notFound();
  }

  // 4. Serialize and format data for the TacticalTable
  const formattedRegistrations = eventRaw.registrations.map((reg) => ({
    id: reg.id,
    userId: reg.user.id,
    name: reg.user.name || "UNKNOWN_OPERATIVE",
    usn: reg.user.usn || "NO_USN_ON_FILE",
    attended: reg.attended,
  }));

  const eventIdHex = `0x${eventRaw.id.substring(0, 6).toUpperCase()}`;

  return (
    <div className="p-8 space-y-12">
      <header className="border-b border-zinc-900 pb-12">
        <h1 className="text-7xl md:text-9xl font-black uppercase tracking-tighter italic leading-none text-white">
          ROSTER
        </h1>
        <div className="flex items-center gap-4 mt-4">
          <span className="text-[10px] text-zinc-600 tracking-[0.4em] uppercase font-bold">
            EVT_ID: {eventIdHex} — {eventRaw.title}
          </span>
          <div className="h-px flex-1 bg-zinc-900" />
        </div>
      </header>

      {/* Hand off the flattened data to the Client Component */}
      <EventRosterClient
        eventId={eventRaw.id}
        registrations={formattedRegistrations}
      />
    </div>
  );
}
