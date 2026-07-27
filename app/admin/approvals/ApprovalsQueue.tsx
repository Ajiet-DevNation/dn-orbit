"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  type PixelColumn,
  PixelDataTable,
} from "@/components/admin/PixelDataTable";
import { toast } from "@/components/ui/8bit-toast";
import { useConfirm } from "@/components/ui/PixelConfirm";

interface ProjectRow {
  id: string;
  title: string;
  description: string | null;
  submittedAt: Date;
  authorName: string;
  authorGithub: string | null;
}

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  eventDate: Date;
  isPublished: boolean;
  authorName: string;
  authorGithub: string | null;
}

type Tab = "projects" | "events";

const btn =
  "retro border-2 px-3 py-1 text-[8px] transition-colors disabled:opacity-50";

function Author({ name, github }: { name: string; github: string | null }) {
  return (
    <div className="flex flex-col">
      <span className="font-black text-white">{name.toUpperCase()}</span>
      <span className="text-[9px] tracking-widest text-zinc-700">
        {github ? `@${github}` : "—"}
      </span>
    </div>
  );
}

export function ApprovalsQueue({
  projects,
  events,
}: {
  projects: ProjectRow[];
  events: EventRow[];
}) {
  const [tab, setTab] = useState<Tab>(
    projects.length === 0 && events.length > 0 ? "events" : "projects",
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { confirm, dialog } = useConfirm();

  const submit = (
    kind: Tab,
    id: string,
    action: "approve" | "reject",
    title: string,
  ) =>
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/${kind}/${id}/approve`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) throw new Error(await res.text());
        router.refresh();
        toast.success(
          `${action === "approve" ? "Approved" : "Rejected"} "${title}"`,
        );
      } catch (err) {
        toast.error(
          `${action === "approve" ? "Approve" : "Reject"} failed: ${
            err instanceof Error ? err.message : "unknown"
          }`,
        );
      }
    });

  // Rejecting hides a member's submission from the site and is not something
  // they can undo themselves, so it asks first — matching the delete flows on
  // the events and projects tables. Approving is additive and does not.
  const review = async (
    kind: Tab,
    id: string,
    action: "approve" | "reject",
    title: string,
  ) => {
    if (action === "reject") {
      const ok = await confirm({
        title: kind === "projects" ? "REJECT PROJECT" : "REJECT EVENT",
        message: `Reject "${title}"? The submitter will need to resubmit.`,
        confirmLabel: "REJECT",
      });
      if (!ok) return;
    }
    submit(kind, id, action, title);
  };

  const actionCell = (kind: Tab, id: string, title: string) => (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => review(kind, id, "approve", title)}
        className={`${btn} border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e] hover:text-black`}
      >
        APPROVE
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => review(kind, id, "reject", title)}
        className={`${btn} border-red-500/40 text-red-400 hover:bg-red-500/10`}
      >
        REJECT
      </button>
    </div>
  );

  const projectCols: PixelColumn<ProjectRow>[] = [
    {
      key: "title",
      header: "PROJECT",
      render: (p) => (
        <div className="flex max-w-[18rem] flex-col sm:max-w-[26rem]">
          <span className="truncate font-black text-white">{p.title}</span>
          <span className="line-clamp-1 break-all text-[9px] uppercase tracking-tighter text-zinc-600">
            {p.description || "NO DESCRIPTION"}
          </span>
        </div>
      ),
    },
    {
      key: "author",
      header: "SUBMITTED BY",
      render: (p) => <Author name={p.authorName} github={p.authorGithub} />,
    },
    {
      key: "when",
      header: "SUBMITTED",
      render: (p) => (
        <span className="text-[9px] text-zinc-500">
          {new Date(p.submittedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "ACTIONS",
      align: "right",
      render: (p) => actionCell("projects", p.id, p.title),
    },
  ];

  const eventCols: PixelColumn<EventRow>[] = [
    {
      key: "title",
      header: "EVENT",
      render: (e) => (
        <div className="flex max-w-[18rem] flex-col sm:max-w-[26rem]">
          <span className="truncate font-black text-white">{e.title}</span>
          <span className="line-clamp-1 break-all text-[9px] uppercase tracking-tighter text-zinc-600">
            {e.description || "NO DESCRIPTION"}
          </span>
        </div>
      ),
    },
    {
      key: "author",
      header: "SUBMITTED BY",
      render: (e) => <Author name={e.authorName} github={e.authorGithub} />,
    },
    {
      key: "when",
      header: "EVENT DATE",
      render: (e) => (
        <span className="text-[9px] text-zinc-500">
          {new Date(e.eventDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "publish",
      header: "DRAFT?",
      render: (e) => (
        <span
          className={`retro text-[8px] ${e.isPublished ? "text-[#22c55e]" : "text-amber-400"}`}
        >
          {e.isPublished ? "WILL GO LIVE" : "DRAFT"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "ACTIONS",
      align: "right",
      render: (e) => actionCell("events", e.id, e.title),
    },
  ];

  const tabBtn = (t: Tab, label: string, count: number) => (
    <button
      type="button"
      onClick={() => setTab(t)}
      className={`retro border-2 px-4 py-2 text-[9px] tracking-widest transition-colors ${
        tab === t
          ? "border-[#22c55e] bg-[#22c55e]/[0.08] text-[#22c55e]"
          : "border-white/10 text-zinc-500 hover:border-[#22c55e]/30 hover:text-[#22c55e]"
      }`}
    >
      {label} [{count}]
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        {tabBtn("projects", "PROJECTS", projects.length)}
        {tabBtn("events", "EVENTS", events.length)}
      </div>

      {dialog}

      {tab === "projects" ? (
        <PixelDataTable
          data={projects}
          columns={projectCols}
          empty="NO PENDING PROJECTS"
        />
      ) : (
        <PixelDataTable
          data={events}
          columns={eventCols}
          empty="NO PENDING EVENTS"
        />
      )}
    </div>
  );
}
