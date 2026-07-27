import Link from "next/link";
import { redirect } from "next/navigation";
import { PixelPageHeader } from "@/components/admin/PixelPageHeader";
import { PixelStatTile } from "@/components/admin/PixelStatTile";
import { Button } from "@/components/ui/8bit-button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/roles";
import { EventTable } from "./EventTable";

export const metadata = {
  title: "EVENTS // ORBIT ADMIN",
};

export default async function AdminEventsPage() {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role)) redirect("/");

  const events = await db.event.findMany({
    select: {
      id: true,
      title: true,
      eventType: true,
      eventDate: true,
      location: true,
      isPublished: true,
      audience: true,
      reviewStatus: true,
    },
    orderBy: { eventDate: "desc" },
    take: 500,
  });
  const total = events.length;
  const published = events.filter((e) => e.isPublished).length;
  const pendingReview = events.filter(
    (e) => e.reviewStatus === "pending",
  ).length;

  return (
    <div className="space-y-8 p-6 md:p-8">
      <PixelPageHeader
        title="EVENT MANAGEMENT"
        subtitle="EVENT ARCHIVE"
        actions={
          <Button
            asChild
            size="sm"
            className="text-[9px] !bg-[#22c55e] hover:!bg-[#16a34a] !text-black"
          >
            <Link href="/admin/events/new">+ NEW EVENT</Link>
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <PixelStatTile label="TOTAL" value={total} />
        <PixelStatTile label="PUBLISHED" value={published} />
        <PixelStatTile label="PENDING REVIEW" value={pendingReview} />
      </div>
      <EventTable initialEvents={events} />
    </div>
  );
}
