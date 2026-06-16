"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/8bit-toast";
import { PixelDataTable, type PixelColumn } from "@/components/admin/PixelDataTable";

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
  registrations,
  formFields,
}: {
  eventId: string;
  registrations: RosterEntry[];
  formFields: FormFieldMeta[];
}) {
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
        toast.error("Attendance update failed: " + (err instanceof Error ? err.message : "unknown"));
      }
    });
  };

  const fmtValue = (v: unknown) =>
    Array.isArray(v) ? v.join(", ") : v == null ? "—" : String(v);

  const columns: PixelColumn<RosterEntry>[] = [
    { key: "name", header: "NAME", render: (r) => <span className="text-white">{r.name}</span> },
    { key: "email", header: "EMAIL", render: (r) => <span className="text-white/70">{r.email}</span> },
    { key: "usn", header: "USN", render: (r) => <span className="text-white/70">{r.usn}</span> },
    ...formFields.map((f): PixelColumn<RosterEntry> => ({
      key: `resp_${f.id}`,
      header: f.label.toUpperCase(),
      render: (r) => <span className="text-white/70">{fmtValue(r.responses[f.id])}</span>,
    })),
    {
      key: "status",
      header: "STATUS",
      render: (r) => (
        <span className={`retro inline-block border-2 px-2 py-1 text-[8px] ${r.attended ? "border-[#22c55e] text-[#22c55e]" : "border-white/15 text-zinc-500"}`}>
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
          disabled={isPending}
          onClick={() => toggle(r.id, r.attended)}
          className="retro border-2 border-white/15 px-3 py-1 text-[8px] text-white/70 transition-colors hover:border-[#22c55e] hover:text-[#22c55e] disabled:opacity-50"
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
          TOTAL REGISTERED: {registrations.length}
        </span>
        <a
          href={`/api/events/${eventId}/registrations.csv`}
          className="retro border-2 border-[#22c55e]/40 px-3 py-2 text-[8px] text-[#22c55e] transition-colors hover:bg-[#22c55e]/10"
        >
          ↓ EXPORT CSV
        </a>
      </div>
      <PixelDataTable data={registrations} columns={columns} empty="NO REGISTRATIONS YET" />
    </div>
  );
}
