"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/8bit-button";

export interface RosterEntry {
  id: string;
  name: string;
  email: string;
  usn: string | null;
  attended: boolean;
  registeredAt: string; // ISO
}

export interface MyEvent {
  id: string;
  title: string;
  type: string;
  dateLabel: string;
  location: string | null;
  reviewStatus: "pending" | "approved" | "rejected";
  isPublished: boolean;
  registeredCount: number;
  attendedCount: number;
  roster: RosterEntry[];
}

// Status chip copy + colour derived from the two moderation flags. "Approved"
// alone isn't public — it also has to be published — so the two are shown as one
// combined state the organizer can act on.
function statusChip(reviewStatus: MyEvent["reviewStatus"], isPublished: boolean) {
  if (reviewStatus === "pending")
    return { label: "PENDING REVIEW", className: "border-amber-500/50 text-amber-400" };
  if (reviewStatus === "rejected")
    return { label: "REJECTED", className: "border-red-500/50 text-red-400" };
  return isPublished
    ? { label: "APPROVED · LIVE", className: "border-[#22c55e] text-[#22c55e]" }
    : { label: "APPROVED · DRAFT", className: "border-white/25 text-zinc-300" };
}

function formatRegisteredAt(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  const date = d
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase();
  return `${date} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Roster({ roster }: { roster: RosterEntry[] }) {
  if (roster.length === 0) {
    return (
      <p className="retro mt-4 border-2 border-white/10 p-4 text-center text-[9px] tracking-widest text-zinc-600">
        NO REGISTRATIONS YET
      </p>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto border-2 border-white/10">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="retro border-b-2 border-white/10 text-[8px] tracking-widest text-zinc-500">
            <th className="px-3 py-2 font-normal">NAME</th>
            <th className="px-3 py-2 font-normal">USN</th>
            <th className="px-3 py-2 font-normal">EMAIL</th>
            <th className="px-3 py-2 font-normal whitespace-nowrap">REGISTERED</th>
            <th className="px-3 py-2 text-center font-normal">ATTENDED</th>
          </tr>
        </thead>
        <tbody>
          {roster.map((r) => (
            <tr
              key={r.id}
              className="border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.03]"
            >
              <td className="px-3 py-2 text-[11px] text-zinc-200">{r.name}</td>
              <td className="retro px-3 py-2 text-[9px] text-zinc-400">
                {r.usn || "—"}
              </td>
              <td className="px-3 py-2 text-[11px] break-all text-zinc-400">
                {r.email}
              </td>
              <td className="retro px-3 py-2 text-[9px] whitespace-nowrap text-zinc-400">
                {formatRegisteredAt(r.registeredAt)}
              </td>
              <td className="px-3 py-2 text-center">
                {r.attended ? (
                  <span className="text-[#22c55e]">✓</span>
                ) : (
                  <span className="text-zinc-700">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventCard({ event }: { event: MyEvent }) {
  const [open, setOpen] = useState(false);
  const chip = statusChip(event.reviewStatus, event.isPublished);

  return (
    <div className="border-2 border-white/10 bg-[#0d0d0d] p-5 transition-colors hover:border-[#22c55e]/40 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="retro text-sm break-words text-white">{event.title}</h2>
          <p className="retro mt-2 text-[9px] text-muted-foreground">
            {[event.dateLabel, event.location, event.type].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span
          className={`retro shrink-0 border-2 px-2 py-1 text-[8px] tracking-wider ${chip.className}`}
        >
          {chip.label}
        </span>
      </div>

      <p className="retro mt-4 text-[10px] text-zinc-300">
        <span className="text-[#22c55e]">{event.registeredCount}</span> REGISTERED
        {" · "}
        <span className="text-[#22c55e]">{event.attendedCount}</span> ATTENDED
      </p>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="retro mt-4 cursor-pointer text-[9px] tracking-widest text-[#22c55e] transition-colors hover:text-white"
      >
        {open ? "▾ HIDE ROSTER" : `▸ VIEW ROSTER (${event.registeredCount})`}
      </button>

      {open && <Roster roster={event.roster} />}
    </div>
  );
}

export function MyEventsList({ events }: { events: MyEvent[] }) {
  return (
    <section className="relative mx-auto min-h-screen w-full max-w-5xl px-6 pt-16 pb-24">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="retro text-xl tracking-wider text-white">YOUR EVENTS</h1>
          <span aria-hidden="true" className="mt-3 block h-[3px] w-24 bg-[#22c55e]" />
        </div>
        <p className="retro text-[9px] tracking-widest text-muted-foreground">
          {events.length} CREATED
        </p>
      </div>

      {events.length === 0 ? (
        <div className="mx-auto max-w-md border-2 border-white/10 p-12 text-center">
          <span className="retro text-3xl text-[#22c55e]/30">▞▚</span>
          <h2 className="retro mt-4 text-sm text-white">NO EVENTS YET</h2>
          <p className="retro mt-3 text-[9px] leading-relaxed text-muted-foreground">
            CREATE ONE WITH THE NEW EVENT BUTTON ON THE HOME PAGE — IT&apos;LL SHOW
            UP HERE WITH ITS REGISTRATIONS.
          </p>
          <Button asChild size="sm" className="mt-6 text-[9px]">
            <Link href="/">← BACK HOME</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}
