"use client";

import { useRef } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/8bit-card";
import { SectionHeading } from "./SectionHeading";
import { PixelReveal } from "./PixelReveal";
import { useFlipDetail } from "./useFlipDetail";

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
  audience: "members" | "college" | "public";
  capacityLabel: string | null;
  registrationClosed: boolean;
}

// First letter of the event type, shown as a big pixel glyph when a card has no
// banner image — keeps the grid visually even without art.
function bannerGlyph(type: string): string {
  return (type.trim()[0] ?? "·").toUpperCase();
}

function EventCard({ data }: { data: EventCardData }) {
  return (
    <>
      {/* Dedicated hover wrapper — the lift/scale lives here, NOT on the Card,
          because the 8-bit Card spreads className onto both its frame and inner
          content; a transform there would double-apply and shift the pixel
          border off the content. `group` here so banner/title/chip can react. */}
      <div className="group h-full transition-transform duration-300 ease-out hover:-translate-y-1.5 hover:scale-[1.02]">
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
                draggable={false}
                className="pixelated h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110 select-none [-webkit-user-drag:none]"
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
    </>
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

function AudienceBadge({ audience }: { audience: EventCardData["audience"] }) {
  const label = audience === "members" ? "MEMBERS" : audience === "college" ? "COLLEGE" : "OPEN";
  return (
    <span className="retro border-2 border-[#22c55e] px-2 py-1 text-[8px] text-[#22c55e]">
      {label}
    </span>
  );
}

function EventDetail({ data, open }: { data: EventCardData; open: boolean }) {
  return (
    <div
      className="flex w-full max-w-xl flex-col gap-6"
      style={{
        opacity: open ? 1 : 0,
        transform: `translateX(${open ? 0 : 40}px)`,
        transition:
          "opacity 400ms var(--ease-out-quart), transform 400ms var(--ease-out-quart)",
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <AudienceBadge audience={data.audience} />
        <h3 className="retro text-2xl text-white">{data.title}</h3>
      </div>
      <p className="retro text-[10px] text-[#22c55e]">
        {[data.dateLabel, data.location].filter(Boolean).join(" · ")}
      </p>
      {data.description && (
        <p className="text-sm leading-relaxed text-muted-foreground">{data.description}</p>
      )}
      {data.capacityLabel && (
        <p className="retro text-[9px] text-muted-foreground">{data.capacityLabel}</p>
      )}
      {data.registrationClosed ? (
        <span className="retro w-fit border-2 border-white/20 px-4 py-3 text-[9px] text-white/50">
          REGISTRATION CLOSED
        </span>
      ) : (
        <Link
          href={`/events/${data.id}/register`}
          className="retro inline-flex w-fit cursor-pointer items-center gap-2 border-2 border-[#22c55e] px-4 py-3 text-[9px] text-[#22c55e] transition-colors duration-200 hover:bg-[#22c55e] hover:text-[#0a0a0a]"
        >
          REGISTER ▸
        </Link>
      )}
    </div>
  );
}

export function EventsSection({ events }: { events: EventCardData[] }) {
  const { selected, detailOpen, flipRef, open, close } = useFlipDetail();
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const active = events.find((e) => e.id === selected) ?? null;

  return (
    <section id="events" className="relative w-full scroll-mt-24 px-6 py-24">
      <SectionHeading text="EVENTS" />

      {events.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event, i) => (
            <PixelReveal key={event.id} delayMs={i * 70}>
              <div
                ref={(el) => { cardRefs.current[event.id] = el; }}
                role="button"
                tabIndex={0}
                onClick={() => open(event.id, cardRefs.current[event.id]!)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open(event.id, cardRefs.current[event.id]!);
                  }
                }}
                className="cursor-pointer"
              >
                <EventCard data={event} />
              </div>
            </PixelReveal>
          ))}
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 overflow-y-auto bg-[#0a0a0a] px-[6%] pt-24 lg:flex-row lg:gap-16">
          <button
            onClick={close}
            aria-label="Close event details"
            className="retro absolute right-6 top-6 z-10 flex cursor-pointer items-center gap-2 border-2 border-[#22c55e] bg-[#0a0a0a] px-3 py-2 text-[10px] text-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.25)] transition-colors duration-200 hover:bg-[#22c55e] hover:text-[#0a0a0a]"
          >
            <span aria-hidden>✕</span> CLOSE
          </button>
          <div ref={flipRef} className="w-full max-w-sm shrink-0">
            <EventCard data={active} />
          </div>
          <EventDetail data={active} open={detailOpen} />
        </div>
      )}
    </section>
  );
}
