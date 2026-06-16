import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PixelPageHeader } from "@/components/admin/PixelPageHeader";
import { PixelStatTile } from "@/components/admin/PixelStatTile";
import { EventTable } from "./EventTable";

export default async function AdminEventsPage() {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role)) redirect("/");

  const events = await db.event.findMany({
    select: {
      id: true, title: true, eventType: true, eventDate: true,
      location: true, isPublished: true, audience: true,
    },
    orderBy: { eventDate: "desc" },
  });
  const total = events.length;
  const published = events.filter((e) => e.isPublished).length;

  return (
    <div className="space-y-8 p-8">
      <PixelPageHeader
        title="EVENT MANAGEMENT"
        subtitle="CS_EVENT_ARCHIVE"
        actions={
          <Link
            href="/admin/events/new"
            className="retro border-2 border-[#22c55e] px-5 py-3 text-[9px] text-[#22c55e] transition-colors hover:bg-[#22c55e] hover:text-black"
          >
            + NEW EVENT
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <PixelStatTile label="TOTAL" value={total} />
        <PixelStatTile label="PUBLISHED" value={published} />
      </div>
      <EventTable initialEvents={events} />
    </div>
  );
}
