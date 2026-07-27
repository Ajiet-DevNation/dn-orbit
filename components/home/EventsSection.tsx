"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/8bit-button";
import { Card } from "@/components/ui/8bit-card";
import { Command, CommandInput } from "@/components/ui/8bit-command";
import {
  DetailOverlay,
  DetailOverlayContent,
} from "@/components/ui/DetailOverlay";
import { useFlipDetail } from "@/hooks/useFlipDetail";
import { AUDIENCE_BADGE_LABELS, type EventAudience } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { PixelReveal } from "./PixelReveal";
import { SectionHeading } from "./SectionHeading";

// How many event cards render per page in the grid below.
const PAGE_SIZE = 6;

// Plain, serializable shape — mapped from the DB Event in the server page so no
// Date objects cross the client boundary.
//
// Every field an organizer can fill in the "NEW EVENT" modal is represented
// here, so the public card/detail can surface all of it. Anything the organizer
// left blank arrives as null and its row is simply not rendered.
export interface EventCardData {
  id: string;
  type: string; // e.g. "WORKSHOP" / "HACKATHON" — uppercased upstream
  title: string;
  description: string | null;
  dateLabel: string; // pre-formatted, e.g. "JUL 15, 2026"
  timeLabel: string | null; // e.g. "6:30 PM" — the modal collects a datetime
  location: string | null;
  bannerUrl: string | null;
  audience: EventAudience;
  /** Seats taken. Always known — shown even when capacity is unlimited. */
  registeredCount: number;
  /** Organizer-set seat cap, or null for unlimited. */
  capacity: number | null;
  /** Pre-formatted registration deadline, or null when none was set. */
  deadlineLabel: string | null;
  /** Capacity reached — distinct from a passed deadline, so copy can differ. */
  isFull: boolean;
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
      <div className="group relative h-full transition-transform duration-300 ease-out hover:-translate-y-1.5 hover:scale-[1.02]">
        {/* Hover glow as a pre-rendered shadow faded via opacity (compositor),
            instead of animating box-shadow (paint-bound). pointer-events-none +
            outset-only shadow → never covers or blocks the card. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 shadow-[0_0_30px_rgba(34,197,94,0.18)] transition-opacity duration-300 group-hover:opacity-100"
        />
        <Card className="h-full justify-start gap-0 overflow-hidden border-white/10 py-0 shadow-[0_0_15px_rgba(34,197,94,0.04)] transition-colors duration-300 group-hover:border-[#22c55e]/50">
          {/* Banner — plain <img> (pixelated) so arbitrary admin URLs render
              without next/image remote-pattern config. Falls back to a pixel
              placeholder when no banner is set. */}
          <div className="relative aspect-video w-full overflow-hidden border-b-[6px] border-white/10 bg-[#0d0d0d] transition-colors duration-300 group-hover:border-[#22c55e]/50">
            {data.bannerUrl ? (
              // biome-ignore lint/performance/noImgElement: arbitrary remote host — next/image would need per-host config
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
            {/* Who may register — set in the modal but previously only visible
                after opening the detail panel. Mirrored here so the grid is
                scannable for members vs. AJIET-only vs. open events. */}
            <span className="retro absolute right-3 top-3 inline-block border-2 border-white/25 bg-[#0a0a0a]/80 px-2 py-1 text-[8px] text-white/70">
              {AUDIENCE_BADGE_LABELS[data.audience]}
            </span>
            {/* Registration state ribbon — a card in the grid should say it's
                unavailable without the visitor having to open it first. */}
            {data.registrationClosed && (
              <span className="retro absolute bottom-3 left-3 inline-block border-2 border-white/25 bg-[#0a0a0a]/85 px-2 py-1 text-[8px] text-white/60">
                {data.isFull ? "FULL" : "CLOSED"}
              </span>
            )}
          </div>

          {/* Fixed line reservations (2-line title, 3-line description) keep every
              card the same height regardless of how much text it carries, so the
              grid reads evenly across rows. The banner above is already a fixed
              aspect-video, so reserving the text block is all that's needed. */}
          <div className="flex flex-1 flex-col gap-3 p-6">
            <h3 className="retro line-clamp-2 min-h-[2lh] text-sm leading-relaxed text-white transition-colors duration-300 group-hover:text-[#22c55e]">
              {data.title}
            </h3>

            <p className="retro truncate text-[9px] text-muted-foreground">
              {[data.dateLabel, data.timeLabel, data.location]
                .filter(Boolean)
                .join(" · ")}
            </p>

            <p className="line-clamp-3 min-h-[3lh] text-sm leading-relaxed text-muted-foreground">
              {data.description}
            </p>

            {/* Seats — reserved as a fixed row so cards stay the same height
                whether or not the organizer capped attendance. */}
            <p className="retro mt-auto truncate text-[8px] tracking-wider text-zinc-500">
              {data.capacity != null
                ? `${data.registeredCount} / ${data.capacity} SEATS`
                : `${data.registeredCount} REGISTERED`}
            </p>
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
  const label = AUDIENCE_BADGE_LABELS[audience];
  return (
    <span className="retro border-2 border-[#22c55e] px-2 py-1 text-[8px] text-[#22c55e]">
      {label}
    </span>
  );
}

// One labelled row in the detail panel's field list. Fixed label column so the
// values line up regardless of label length.
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3">
      <dt className="retro text-[9px] tracking-widest text-zinc-500">
        {label}
      </dt>
      <dd className="retro min-w-0 text-[9px] break-words text-muted-foreground">
        {value}
      </dd>
    </div>
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
        {/* Event type also lives on the card's banner chip, but the card is
            scaled down beside this panel — repeating it keeps the detail view
            self-describing. */}
        <span className="retro border-2 border-white/25 px-2 py-1 text-[8px] text-white/70">
          {data.type}
        </span>
        <h3 className="retro min-w-0 break-words text-2xl text-white">
          {data.title}
        </h3>
      </div>
      <p className="retro text-[10px] text-[#22c55e]">
        {[data.dateLabel, data.timeLabel, data.location]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {data.description && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {data.description}
        </p>
      )}

      {/* Every remaining organizer-set field, as a labelled list. Rows are
          omitted individually when the organizer left the field blank. */}
      <dl className="flex flex-col gap-2">
        <DetailRow
          label="SEATS"
          value={
            data.capacity != null
              ? `${data.registeredCount} / ${data.capacity} registered`
              : `${data.registeredCount} registered · unlimited`
          }
        />
        {data.deadlineLabel && (
          <DetailRow label="REGISTER BY" value={data.deadlineLabel} />
        )}
      </dl>

      {data.registrationClosed ? (
        <span className="retro w-fit border-2 border-white/20 px-4 py-3 text-[9px] text-white/50">
          {data.isFull ? "EVENT FULL" : "REGISTRATION CLOSED"}
        </span>
      ) : (
        <Button
          asChild
          className="w-fit text-[9px] !bg-[#22c55e] hover:!bg-[#16a34a] !text-black"
        >
          <Link href={`/events/${data.id}/register`}>REGISTER ▸</Link>
        </Button>
      )}
    </div>
  );
}

// Shown when a search query matches nothing — distinct from EmptyState (which
// means there are no published events at all) so the user knows it's the filter.
function NoMatch({ query }: { query: string }) {
  return (
    <div className="mx-auto max-w-md">
      <Card className="items-center gap-4 border-white/10 py-12 text-center">
        <span className="retro text-3xl text-[#22c55e]/30">▞▚</span>
        <h3 className="retro text-sm text-white">NO EVENTS FOUND</h3>
        <p className="retro break-words text-[9px] text-muted-foreground">
          NO MATCH FOR &quot;{query.toUpperCase()}&quot;
        </p>
      </Card>
    </div>
  );
}

// Case-insensitive match across the fields a visitor would reasonably search by.
function matchesQuery(e: EventCardData, q: string): boolean {
  return [e.title, e.type, e.location ?? "", e.description ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

// Page-number sequence with ellipsis gaps: always shows the first, last, and the
// current page's neighbours, e.g. [1, "…", 4, 5, 6, "…", 12]. Up to 7 pages are
// shown in full (no gaps needed).
function pageItems(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const shown = [1, total, current, current - 1, current + 1]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  let prev = 0;
  for (const p of shown) {
    if (p - prev > 1) result.push("…");
    if (p !== prev) result.push(p);
    prev = p;
  }
  return result;
}

// Pagination control built on the shared 8-bit Button (chunky pixel border +
// shadow). The active page is filled green to match the site's accent buttons
// (e.g. ADMIN in the profile modal); the rest stay the default pixel button.
function PageButton({
  children,
  onClick,
  disabled,
  active,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  ariaLabel: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
      className={cn(
        "min-w-[2.5rem] text-[9px]",
        active && "!bg-[#22c55e] hover:!bg-[#16a34a] !text-black",
      )}
    >
      {children}
    </Button>
  );
}

export function EventsSection({ events }: { events: EventCardData[] }) {
  const { selected, detailOpen, flipRef, open, close } = useFlipDetail();
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const sectionRef = useRef<HTMLElement>(null);
  const active = events.find((e) => e.id === selected) ?? null;

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      normalized ? events.filter((e) => matchesQuery(e, normalized)) : events,
    [events, normalized],
  );

  // `page` can drift past the available range when the filter shrinks results, so
  // clamp at render rather than tracking it in state. Searching also resets to 1.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageEvents = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // Opening the detail overlay needs the card's DOM node for the FLIP
  // transition. The ref can legitimately be null — between render and ref
  // attachment, or after the row unmounts mid-interaction — so a missing node
  // skips the animation instead of throwing on a non-null assertion.
  function openCard(id: string) {
    const el = cardRefs.current[id];
    if (el) open(id, el);
  }

  function handleSearch(value: string) {
    setQuery(value);
    setPage(1);
  }

  function goToPage(p: number) {
    setPage(Math.min(Math.max(1, p), totalPages));
    // Bring the grid back into view so the next page isn't below the fold.
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section
      ref={sectionRef}
      id="events"
      className="relative w-full scroll-mt-24 px-6 py-24"
    >
      <SectionHeading text="EVENTS" />

      {events.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* 8-bit command search bar — filters the grid across title, type,
              location and description. shouldFilter is off because we render our
              own grid rather than cmdk items. */}
          <div className="mx-auto mb-12 flex max-w-md justify-center px-1.5">
            <Command shouldFilter={false} className="w-full border-white/10">
              <CommandInput
                value={query}
                onValueChange={handleSearch}
                placeholder="SEARCH EVENTS..."
                aria-label="Search events"
                className="text-[10px] uppercase tracking-wider"
              />
            </Command>
          </div>

          {filtered.length === 0 ? (
            <NoMatch query={query.trim()} />
          ) : (
            <>
              <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {pageEvents.map((event, i) => (
                  <PixelReveal key={event.id} delayMs={i * 70}>
                    {/* A real <button> would inherit UA button styling and
                        nest interactive content; role+tabIndex+key handling is
                        the standard equivalent for a card-sized target. */}
                    {/* biome-ignore lint/a11y/useSemanticElements: card-sized target with full keyboard handling */}
                    <div
                      ref={(el) => {
                        cardRefs.current[event.id] = el;
                      }}
                      role="button"
                      tabIndex={0}
                      onClick={() => openCard(event.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openCard(event.id);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <EventCard data={event} />
                    </div>
                  </PixelReveal>
                ))}
              </div>

              {totalPages > 1 && (
                <nav
                  aria-label="Events pagination"
                  className="mt-14 flex flex-wrap items-center justify-center gap-x-4 gap-y-5"
                >
                  <PageButton
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    ariaLabel="Previous page"
                  >
                    ‹ PREV
                  </PageButton>

                  {pageItems(currentPage, totalPages).map((item, i) =>
                    item === "…" ? (
                      <span
                        key={`gap-${i}`}
                        aria-hidden="true"
                        className="retro px-1 text-[9px] text-muted-foreground"
                      >
                        …
                      </span>
                    ) : (
                      <PageButton
                        key={item}
                        active={item === currentPage}
                        onClick={() => goToPage(item)}
                        ariaLabel={`Go to page ${item}`}
                      >
                        {item}
                      </PageButton>
                    ),
                  )}

                  <PageButton
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    ariaLabel="Next page"
                  >
                    NEXT ›
                  </PageButton>
                </nav>
              )}
            </>
          )}
        </>
      )}

      <DetailOverlay
        open={!!active}
        onClose={close}
        closeLabel="Close event details"
      >
        {active && (
          <>
            <DetailOverlayContent
              ref={flipRef}
              className="w-full max-w-sm shrink-0"
            >
              <EventCard data={active} />
            </DetailOverlayContent>
            <DetailOverlayContent>
              <EventDetail data={active} open={detailOpen} />
            </DetailOverlayContent>
          </>
        )}
      </DetailOverlay>
    </section>
  );
}
