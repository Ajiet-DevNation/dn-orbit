import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { TacticalCard } from "@/components/ui/TacticalCard";
import EventActionCenter from "./EventActionCenter";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 1. Session Security
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // 2. Await the params to resolve the dynamic ID
  const resolvedParams = await params;

  // 3. Fetch the specific event
  const event = await db.event.findUnique({
    where: { id: resolvedParams.id },
  });

  if (!event || !event.isPublished) {
    notFound();
  }

  const now = new Date();
  const isPast = event.eventDate < now;

  // 4. Ascertain Registration & Feedback Status
  const existingRegistration = await db.registration.findFirst({
    where: {
      eventId: event.id,
      userId: session.user.id,
    },
  });
  const isRegistered = !!existingRegistration;

  const existingFeedback = isPast
    ? await db.feedback.findFirst({
        where: {
          eventId: event.id,
          userId: session.user.id,
        },
      })
    : null;
  const hasProvidedFeedback = !!existingFeedback;

  const formattedDate = new Date(event.eventDate)
    .toLocaleDateString("en-CA")
    .replace(/-/g, ".");
  const eventIdHex = `0x${event.id.substring(0, 6).toUpperCase()}`;

  return (
    <div className="p-8 space-y-12">
      {/* 01_PAGE_HEADER */}
      <header className="border-b border-zinc-900 pb-12">
        <h1 className="text-7xl md:text-9xl font-black uppercase tracking-tighter italic leading-none text-white">
          MISSION_BRIEF
        </h1>
        <div className="flex items-center gap-4 mt-4">
          <span className="text-[10px] text-zinc-600 tracking-[0.4em] uppercase font-bold">
            EVT_ID: {eventIdHex}
          </span>
          <div className="h-px flex-1 bg-zinc-900" />
        </div>
      </header>

      {/* 02_CONTENT_GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Briefing Panel */}
        <div className="lg:col-span-2">
          <TacticalCard
            id={`DATA_ARCHIVE: ${eventIdHex}`}
            title={event.title}
            subtitle={event.eventType || "GENERAL_ASSEMBLY"}
            status={isPast ? "ARCHIVED" : "ACTIVE"}
          >
            <div className="space-y-8">
              <div className="grid grid-cols-2 border-b border-zinc-900 pb-6 gap-4">
                <div>
                  <p className="text-[8px] text-zinc-600 uppercase tracking-widest font-black mb-1">
                    DATE_STAMP
                  </p>
                  <p className="text-sm text-zinc-300 font-bold">
                    {formattedDate}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] text-zinc-600 uppercase tracking-widest font-black mb-1">
                    LOCATION_COORDS
                  </p>
                  <p className="text-sm text-zinc-300 font-bold">
                    {event.location || "VIRTUAL_UPLINK"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[8px] text-zinc-600 uppercase tracking-widest font-black mb-4">
                  MISSION_PARAMETERS
                </p>
                <div className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed">
                  {event.description ||
                    "NO_MISSION_BRIEFING_PROVIDED_IN_DATABASE."}
                </div>
              </div>
            </div>
          </TacticalCard>
        </div>

        {/* Interactive Action Sidebar */}
        <div>
          <EventActionCenter
            eventId={event.id}
            isPast={isPast}
            isRegistered={isRegistered}
            hasProvidedFeedback={hasProvidedFeedback}
          />
        </div>
      </div>
    </div>
  );
}
