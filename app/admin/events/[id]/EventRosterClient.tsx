"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  type PixelColumn,
  PixelDataTable,
} from "@/components/admin/PixelDataTable";
import { toast } from "@/components/ui/8bit-toast";
import { useConfirm } from "@/components/ui/PixelConfirm";
import { PixelArrow } from "@/components/ui/PixelIcons";
import type { TeamStatus } from "@/lib/teams";
import { errorMessage } from "@/lib/utils";

interface RosterEntry {
  id: string;
  name: string;
  email: string;
  usn: string;
  attended: boolean;
  registeredAt: string;
  responses: Record<string, unknown>;
  /** Team name on a team event; null otherwise or if the team was removed. */
  team: string | null;
}

interface TeamRow {
  id: string;
  name: string;
  code: string;
  matchValue: string;
  size: number;
  status: TeamStatus;
}

interface TeamsInfo {
  minSize: number;
  maxSize: number;
  maxTeams: number | null;
  /** Label of the field all members share (e.g. "Branch"), or null. */
  matchLabel: string | null;
  /** Registrants who never created or joined a team. */
  withoutTeam: number;
  rows: TeamRow[];
}

const TEAM_STATUS_LABEL: Record<TeamStatus, string> = {
  incomplete: "INCOMPLETE",
  complete: "COMPLETE",
  full: "FULL",
};

interface FormFieldMeta {
  id: string;
  label: string;
}

export default function EventRosterClient({
  eventId,
  registrations: initial,
  totalRegistrations,
  formFields,
  teams,
}: {
  eventId: string;
  registrations: RosterEntry[];
  totalRegistrations: number;
  formFields: FormFieldMeta[];
  /** Team rules and teams for a team event; null for individual sign-up. */
  teams: TeamsInfo | null;
}) {
  // Optimistic: flip the row at once and only roll back on failure. Each click
  // used to router.refresh() the whole roster, re-sending every row (answers
  // included) on every tap at the door.
  const [registrations, setRegistrations] = useState(initial);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const router = useRouter();
  const { confirm, dialog } = useConfirm();

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

  // drop the row here, then refresh so team sizes and totals catch up
  const remove = async (r: RosterEntry) => {
    const ok = await confirm({
      title: "DELETE REGISTRATION",
      message: `Delete ${r.name}'s registration? ${r.team ? `They leave team "${r.team}", and the team is deleted if nobody is left in it. ` : ""}This can't be undone.`,
      confirmLabel: "DELETE",
    });
    if (!ok) return;
    setRowPending(r.id, true);
    try {
      const res = await fetch(`/api/events/${eventId}/registrations/${r.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await errorMessage(res));
      const data = (await res.json()) as { teamRemoved?: boolean };
      setRegistrations((rows) => rows.filter((x) => x.id !== r.id));
      toast.success(
        data.teamRemoved
          ? `${r.name} deleted. Team "${r.team}" was empty, so it was deleted too.`
          : `${r.name} deleted`,
      );
      router.refresh();
    } catch (err) {
      toast.error(
        `Delete failed: ${err instanceof Error ? err.message : "unknown"}`,
      );
    } finally {
      setRowPending(r.id, false);
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
    ...(teams
      ? [
          {
            key: "team",
            header: "TEAM",
            // A badge, not plain text: "NO TEAM" in the name's place read as
            // a team called that.
            render: (r: RosterEntry) =>
              r.team ? (
                <span className="text-white">{r.team}</span>
              ) : (
                <span className="retro inline-block whitespace-nowrap border-2 border-dashed border-[#eab308]/60 px-2 py-1 text-[8px] text-[#facc15]">
                  NOT IN A TEAM
                </span>
              ),
          },
        ]
      : []),
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
        <div className="flex justify-end gap-2">
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
          <button
            type="button"
            disabled={pending.has(r.id)}
            onClick={() => remove(r)}
            aria-label={`Delete ${r.name}'s registration`}
            className="retro border-2 border-red-500/40 px-3 py-1 text-[8px] text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
          >
            DELETE
          </button>
        </div>
      ),
    },
  ];

  const teamColumns: PixelColumn<TeamRow>[] = teams
    ? [
        {
          key: "name",
          header: "TEAM",
          render: (t) => <span className="text-white">{t.name}</span>,
        },
        {
          key: "code",
          header: "INVITE CODE",
          render: (t) => (
            <span className="font-mono tracking-widest text-white/70">
              {t.code}
            </span>
          ),
        },
        ...(teams.matchLabel
          ? [
              {
                key: "match",
                header: teams.matchLabel.toUpperCase(),
                render: (t: TeamRow) => (
                  <span className="text-white/70">{t.matchValue}</span>
                ),
              },
            ]
          : []),
        {
          key: "size",
          header: "MEMBERS",
          render: (t) => (
            <span className="text-white/70">
              {t.size} / {teams.maxSize}
            </span>
          ),
        },
        {
          key: "status",
          header: "STATUS",
          align: "right",
          render: (t) => (
            <span
              className={`retro inline-block border-2 px-2 py-1 text-[8px] ${t.status === "incomplete" ? "border-[#eab308]/60 text-[#facc15]" : "border-brand text-brand-light"}`}
              title={
                t.status === "incomplete"
                  ? `Needs at least ${teams.minSize} members`
                  : undefined
              }
            >
              {TEAM_STATUS_LABEL[t.status]}
            </span>
          ),
        },
      ]
    : [];
  const incomplete = teams?.rows.filter((t) => t.status === "incomplete");

  return (
    <div className="space-y-4">
      {teams && (
        <div className="space-y-4 pb-4">
          <span className="retro block text-[9px] tracking-widest text-zinc-500">
            TEAMS: {teams.rows.length}
            {teams.maxTeams != null && ` / ${teams.maxTeams}`} · SIZE{" "}
            {teams.minSize}–{teams.maxSize}
            {incomplete && incomplete.length > 0 && (
              <span className="text-[#facc15]">
                {" "}
                · {incomplete.length} BELOW {teams.minSize} MEMBERS
              </span>
            )}
            {teams.withoutTeam > 0 && (
              <span className="text-[#facc15]">
                {" "}
                · {teams.withoutTeam} REGISTERED WITHOUT A TEAM
              </span>
            )}
          </span>
          <PixelDataTable
            data={teams.rows}
            columns={teamColumns}
            empty="NO TEAMS YET"
          />
        </div>
      )}
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
      {dialog}
    </div>
  );
}
