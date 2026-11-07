"use client";

import { useState } from "react";
import {
  type PixelColumn,
  PixelDataTable,
} from "@/components/admin/PixelDataTable";
import { toast } from "@/components/ui/8bit-toast";
import { PixelArrow } from "@/components/ui/PixelIcons";
import { errorMessage } from "@/lib/utils";

interface RosterEntry {
  id: string;
  name: string;
  email: string;
  usn: string;
  attended: boolean;
  registeredAt: string;
  responses: Record<string, unknown>;
}

interface FormFieldMeta {
  id: string;
  label: string;
}

export default function EventRosterClient({
  eventId,
  registrations: initial,
  totalRegistrations,
  formFields,
}: {
  eventId: string;
  registrations: RosterEntry[];
  totalRegistrations: number;
  formFields: FormFieldMeta[];
}) {
  // Optimistic: flip the row at once and only roll back on failure. Each click
  // used to router.refresh() the whole roster, re-sending every row (answers
  // included) on every tap at the door.
  const [registrations, setRegistrations] = useState(initial);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());

  const setAttended = (id: string, attended: boolean) =>
    setRegistrations((rows) =>
      rows.map((r) => (r.id === id ? { ...r, attended } : r)),
    );
  const setRowPending = (id: string, on: boolean) =>
    setPending((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const toggle = async (registrationId: string, current: boolean) => {
    setAttended(registrationId, !current);
    setRowPending(registrationId, true);
    try {
      const res = await fetch(`/api/events/${eventId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId, attended: !current }),
      });
      if (!res.ok) throw new Error(await errorMessage(res));
    } catch (err) {
      setAttended(registrationId, current);
      toast.error(
        `Attendance update failed: ${err instanceof Error ? err.message : "unknown"}`,
      );
    } finally {
      setRowPending(registrationId, false);
    }
  };

  // Mirrors formatAnswer() on the organizer-facing roster so the same
  // registration renders identically in both places.
  const fmtValue = (v: unknown) => {
    if (Array.isArray(v)) return v.length ? v.map(String).join(", ") : "—";
    if (v == null || v === "") return "—";
    return String(v);
  };

  const columns: PixelColumn<RosterEntry>[] = [
    {
      key: "name",
      header: "NAME",
      render: (r) => <span className="text-white">{r.name}</span>,
    },
    {
      key: "email",
      header: "EMAIL",
      render: (r) => <span className="text-white/70">{r.email}</span>,
    },
    {
      key: "usn",
      header: "USN",
      render: (r) => <span className="text-white/70">{r.usn}</span>,
    },
    ...formFields.map(
      (f): PixelColumn<RosterEntry> => ({
        key: `resp_${f.id}`,
        header: f.label.toUpperCase(),
        render: (r) => (
          <span className="text-white/70">{fmtValue(r.responses[f.id])}</span>
        ),
      }),
    ),
    {
      key: "status",
      header: "STATUS",
      render: (r) => (
        <span
          className={`retro inline-block border-2 px-2 py-1 text-[8px] ${r.attended ? "border-brand text-brand-light" : "border-white/15 text-zinc-500"}`}
        >
          {r.attended ? "ATTENDED" : "ABSENT"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "ACTIONS",
      align: "right",
      render: (r) => (
        <button
          type="button"
          disabled={pending.has(r.id)}
          onClick={() => toggle(r.id, r.attended)}
          aria-label={`${r.name} attended`}
          aria-pressed={r.attended}
          className="retro border-2 border-white/15 px-3 py-1 text-[8px] text-white/70 transition-colors hover:border-brand hover:text-brand-light disabled:opacity-50"
        >
          {r.attended ? "REVOKE" : "MARK ATTENDED"}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="retro text-[9px] tracking-widest text-zinc-500">
          TOTAL REGISTERED: {totalRegistrations}
          {totalRegistrations > registrations.length &&
            ` · SHOWING FIRST ${registrations.length} · FULL LIST IN CSV`}
        </span>
        <a
          href={`/api/events/${eventId}/registrations.csv`}
          className="retro inline-flex items-center gap-2 border-2 border-brand/40 px-3 py-2 text-[8px] text-brand-light transition-colors hover:bg-brand/10"
        >
          <PixelArrow dir="down" /> EXPORT CSV
        </a>
      </div>
      <PixelDataTable
        data={registrations}
        columns={columns}
        empty="NO REGISTRATIONS YET"
      />
    </div>
  );
}
