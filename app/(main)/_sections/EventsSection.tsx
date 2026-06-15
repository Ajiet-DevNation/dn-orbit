"use client";

import { Card } from "@/components/ui/8bit-card";
import { SectionHeading } from "./SectionHeading";
import { useRevealStagger } from "./useRevealStagger";

// Plain, serializable shape — mapped from the DB Event in the server page so no
// Date objects cross the client boundary.
export interface EventCardData {
  id: string;
  type: string; // e.g. "WORKSHOP" / "HACKATHON" — uppercased upstream
  title: string;
  description: string | null;
  dateLabel: string; // pre-formatted, e.g. "JUL 15, 2026"
  location: string | null;
  bannerUrl: string | null;
}

interface EventsSectionProps {
  events: EventCardData[];
}

// First letter of the event type, shown as a big pixel glyph when a card has no
// banner image — keeps the grid visually even without art.
function bannerGlyph(type: string): string {
  return (type.trim()[0] ?? "·").toUpperCase();
}

function EventCard({ data, reveal }: { data: EventCardData; reveal: number }) {
  return (
    <div
      style={{
        opacity: reveal,
        // easeOutBack lets these values slightly overshoot for a springy pop.
        transform: `translateY(${(1 - reveal) * 28}px) scale(${0.92 + 0.08 * reveal})`,
        willChange: "opacity, transform",
      }}
    >
      {/* Dedicated hover wrapper — the lift/scale lives here, NOT on the Card,
          because the 8-bit Card spreads className onto both its frame and inner
          content; a transform there would double-apply and shift the pixel
          border off the content. `group` here so banner/title/chip can react. */}
      <div className="group h-full transition-transform duration-300 ease-out will-change-transform hover:-translate-y-1.5 hover:scale-[1.02]">
        <Card className="h-full justify-start gap-0 overflow-hidden border-white/10 py-0 shadow-[0_0_15px_rgba(34,197,94,0.04)] transition-[box-shadow,border-color] duration-300 group-hover:border-[#22c55e]/50 group-hover:shadow-[0_0_30px_rgba(34,197,94,0.18)]">
          {/* Banner — plain <img> (pixelated) so arbitrary admin URLs render
              without next/image remote-pattern config. Falls back to a pixel
              placeholder when no banner is set. */}
          <div className="relative aspect-video w-full overflow-hidden border-b-[6px] border-white/10 bg-[#0d0d0d] transition-colors duration-300 group-hover:border-[#22c55e]/50">
            {data.bannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.bannerUrl}
                alt={data.title}
                loading="lazy"
                className="pixelated h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
              />
            ) : (
              <div className="dot-grid-bg flex h-full w-full items-center justify-center transition-transform duration-500 ease-out group-hover:scale-110">
                <span className="retro text-5xl text-[#22c55e]/30 transition-colors duration-300 select-none group-hover:text-[#22c55e]/60">
                  {bannerGlyph(data.type)}
                </span>
              </div>
            )}
            <span className="retro absolute left-3 top-3 inline-block border-2 border-[#22c55e] bg-[#0a0a0a]/80 px-2 py-1 text-[8px] text-[#22c55e] transition-colors duration-300 group-hover:bg-[#22c55e] group-hover:text-[#0a0a0a]">
              {data.type}
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-3 p-6">
            <h3 className="retro text-sm leading-relaxed text-white transition-colors duration-300 group-hover:text-[#22c55e]">
              {data.title}
            </h3>

            <p className="retro text-[9px] text-muted-foreground">
              {[data.dateLabel, data.location].filter(Boolean).join(" · ")}
            </p>

            {data.description && (
              <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                {data.description}
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-md">
      <Card className="items-center gap-4 border-white/10 py-12 text-center">
        <span className="retro text-3xl text-[#22c55e]/30">▞▚</span>
        <h3 className="retro text-sm text-white">NO EVENTS SCHEDULED</h3>
        <p className="retro text-[9px] text-muted-foreground">
          CHECK BACK SOON
        </p>
      </Card>
    </div>
  );
}

export function EventsSection({ events }: EventsSectionProps) {
  // Reveal count must cover every card so each gets its own staggered tween.
  const { containerRef, reveal } = useRevealStagger(events.length);

  return (
    <section
      id="events"
      className="w-full scroll-mt-24 px-6 py-24"
    >
      <SectionHeading text="EVENTS" />

      {events.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          ref={containerRef}
          className="mx-auto grid max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
        >
          {events.map((event, i) => (
            <EventCard key={event.id} data={event} reveal={reveal[i] ?? 0} />
          ))}
        </div>
      )}
    </section>
  );
}
