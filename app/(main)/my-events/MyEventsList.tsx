"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/8bit-button";
import { toast } from "@/components/ui/8bit-toast";

export interface RosterEntry {
  id: string;
  name: string;
  email: string;
  usn: string | null;
  attended: boolean;
  registeredAt: string; // ISO
  /** Answers to the organizer's custom questions, keyed by form field id. */
  responses: Record<string, unknown>;
}

/** Column header for one custom question, taken from the event's form schema. */
export interface FormFieldMeta {
  id: string;
  label: string;
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
  formFields: FormFieldMeta[];
  roster: RosterEntry[];
}

// Status chip copy + colour derived from the two moderation flags. "Approved"
// alone isn't public — it also has to be published — so the two are shown as one
// combined state the organizer can act on.
function statusChip(
  reviewStatus: MyEvent["reviewStatus"],
  isPublished: boolean,
) {
  if (reviewStatus === "pending")
    return {
      label: "PENDING REVIEW",
      className: "border-amber-500/50 text-amber-400",
    };
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

// Checkbox answers arrive as arrays; numbers and dates as scalars. An
// unanswered optional question has no key at all, which reads as an em dash
// rather than "undefined".
function formatAnswer(v: unknown): string {
  if (Array.isArray(v)) return v.length ? v.map(String).join(", ") : "—";
  if (v == null || v === "") return "—";
  return String(v);
}

/** Shared attendance mutation + pending flag for both roster layouts. */
function useAttendance(eventId: string) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const toggle = (registrationId: string, current: boolean) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/attendance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registrationId, attended: !current }),
        });
        if (!res.ok) throw new Error(await res.text());
        router.refresh();
      } catch (err) {
        toast.error(
          `Attendance update failed: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    });
  };

  return { toggle, isPending };
}

const attendBtn =
  "retro border-2 px-2 py-1 text-[8px] tracking-wider transition-colors disabled:opacity-50";

function AttendButton({
  attended,
  disabled,
  onClick,
}: {
  attended: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${attendBtn} ${
        attended
          ? "border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e]/10"
          : "border-white/15 text-white/60 hover:border-[#22c55e] hover:text-[#22c55e]"
      }`}
    >
      {attended ? "✓ ATTENDED" : "MARK ATTENDED"}
    </button>
  );
}

// ── Phone layout ─────────────────────────────────────────────────────────────
// One stacked block per registrant. A table with N custom-question columns can't
// fit a phone (the screenshot showed the built-in columns already clipping), so
// below `md` each row becomes a label/value list that wraps instead of scrolls.
function RosterCards({
  roster,
  formFields,
  onToggle,
  isPending,
}: {
  roster: RosterEntry[];
  formFields: FormFieldMeta[];
  onToggle: (id: string, current: boolean) => void;
  isPending: boolean;
}) {
  return (
    <ul className="mt-4 space-y-3 md:hidden">
      {roster.map((r) => (
        <li key={r.id} className="border-2 border-white/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="min-w-0 text-[12px] break-words text-zinc-100">
              {r.name}
            </span>
            <span className="retro shrink-0 text-[8px] text-zinc-500">
              {formatRegisteredAt(r.registeredAt)}
            </span>
          </div>

          <dl className="mt-3 space-y-2">
            <Row label="USN" value={r.usn || "—"} mono />
            <Row label="EMAIL" value={r.email} />
            {formFields.map((f) => (
              <Row
                key={f.id}
                label={f.label.toUpperCase()}
                value={formatAnswer(r.responses[f.id])}
              />
            ))}
          </dl>

          <div className="mt-4">
            <AttendButton
              attended={r.attended}
              disabled={isPending}
              onClick={() => onToggle(r.id, r.attended)}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3">
      <dt className="retro text-[8px] leading-relaxed tracking-widest text-zinc-500">
        {label}
      </dt>
      <dd
        className={`min-w-0 break-words text-zinc-300 ${mono ? "retro text-[9px]" : "text-[11px]"}`}
      >
        {value}
      </dd>
    </div>
  );
}

// ── Desktop layout ───────────────────────────────────────────────────────────
function RosterTable({
  roster,
  formFields,
  onToggle,
  isPending,
}: {
  roster: RosterEntry[];
  formFields: FormFieldMeta[];
  onToggle: (id: string, current: boolean) => void;
  isPending: boolean;
}) {
  return (
    <div className="mt-4 hidden overflow-x-auto border-2 border-white/10 md:block">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="retro border-b-2 border-white/10 text-[8px] tracking-widest text-zinc-500">
            <th className="px-3 py-2 font-normal">NAME</th>
            <th className="px-3 py-2 font-normal">USN</th>
            <th className="px-3 py-2 font-normal">EMAIL</th>
            {formFields.map((f) => (
              <th key={f.id} className="px-3 py-2 font-normal">
                {f.label.toUpperCase()}
              </th>
            ))}
            <th className="px-3 py-2 font-normal whitespace-nowrap">
              REGISTERED
            </th>
            <th className="px-3 py-2 text-right font-normal">ATTENDANCE</th>
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
              {formFields.map((f) => (
                <td
                  key={f.id}
                  className="px-3 py-2 text-[11px] text-zinc-400"
                  // Long free-text answers get a sane ceiling so one paragraph
                  // can't stretch the table past every other column.
                  style={{ maxWidth: "16rem" }}
                >
                  <span className="line-clamp-3 break-words">
                    {formatAnswer(r.responses[f.id])}
                  </span>
                </td>
              ))}
              <td className="retro px-3 py-2 text-[9px] whitespace-nowrap text-zinc-400">
                {formatRegisteredAt(r.registeredAt)}
              </td>
              <td className="px-3 py-2 text-right">
                <AttendButton
                  attended={r.attended}
                  disabled={isPending}
                  onClick={() => onToggle(r.id, r.attended)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Roster({ event }: { event: MyEvent }) {
  const { toggle, isPending } = useAttendance(event.id);

  if (event.roster.length === 0) {
    return (
      <p className="retro mt-4 border-2 border-white/10 p-4 text-center text-[9px] tracking-widest text-zinc-600">
        NO REGISTRATIONS YET
      </p>
    );
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="retro text-[8px] tracking-widest text-zinc-500">
          {event.formFields.length > 0
            ? `${event.formFields.length} CUSTOM QUESTION${event.formFields.length === 1 ? "" : "S"}`
            : "NAME · EMAIL ONLY"}
        </span>
        {/* The page ships a bounded slice of the roster; say so rather than
            letting the organizer believe they are looking at everyone. */}
        {event.roster.length < event.registeredCount && (
          <span className="retro text-[8px] tracking-widest text-amber-400/80">
            SHOWING {event.roster.length} OF {event.registeredCount} · EXPORT
            FOR ALL
          </span>
        )}
        {/* Server-side authorization scopes this to events the caller created. */}
        <a
          href={`/api/events/${event.id}/registrations.csv`}
          className="retro border-2 border-[#22c55e]/40 px-3 py-2 text-[8px] tracking-wider text-[#22c55e] transition-colors hover:bg-[#22c55e]/10"
        >
          ↓ EXPORT CSV
        </a>
      </div>

      <RosterCards
        roster={event.roster}
        formFields={event.formFields}
        onToggle={toggle}
        isPending={isPending}
      />
      <RosterTable
        roster={event.roster}
        formFields={event.formFields}
        onToggle={toggle}
        isPending={isPending}
      />
    </>
  );
}

function EventCard({ event }: { event: MyEvent }) {
  const [open, setOpen] = useState(false);
  const chip = statusChip(event.reviewStatus, event.isPublished);

  return (
    <div className="border-2 border-white/10 bg-[#0d0d0d] p-5 transition-colors hover:border-[#22c55e]/40 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="retro text-sm break-words text-white">
            {event.title}
          </h2>
          <p className="retro mt-2 text-[9px] text-muted-foreground">
            {[event.dateLabel, event.location, event.type]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <span
          className={`retro shrink-0 border-2 px-2 py-1 text-[8px] tracking-wider ${chip.className}`}
        >
          {chip.label}
        </span>
      </div>

      <p className="retro mt-4 text-[10px] text-zinc-300">
        <span className="text-[#22c55e]">{event.registeredCount}</span>{" "}
        REGISTERED
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

      {open && <Roster event={event} />}
    </div>
  );
}

export function MyEventsList({ events }: { events: MyEvent[] }) {
  return (
    <section className="relative mx-auto min-h-screen w-full max-w-5xl px-6 pt-16 pb-24">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="retro text-xl tracking-wider text-white">
            YOUR EVENTS
          </h1>
          <span
            aria-hidden="true"
            className="mt-3 block h-[3px] w-24 bg-[#22c55e]"
          />
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
            CREATE ONE WITH THE NEW EVENT BUTTON ON THE HOME PAGE · IT&apos;LL
            SHOW UP HERE WITH ITS REGISTRATIONS.
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
