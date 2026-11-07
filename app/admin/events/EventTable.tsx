"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  type PixelColumn,
  PixelDataTable,
} from "@/components/admin/PixelDataTable";
import { toast } from "@/components/ui/8bit-toast";
import { useConfirm } from "@/components/ui/PixelConfirm";
import { formatEventDateLong } from "@/lib/event-format";
import { AUDIENCE_BADGE_LABELS, type EventAudience } from "@/lib/forms";
import { errorMessage } from "@/lib/utils";

interface EventRow {
  id: string;
  title: string;
  eventType: string | null;
  eventDate: Date;
  location: string | null;
  isPublished: boolean;
  audience: string;
  reviewStatus: "pending" | "approved" | "rejected";
}

export function EventTable({ initialEvents }: { initialEvents: EventRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirm();

  const togglePublish = (id: string, current: boolean) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublished: !current }),
        });
        if (!res.ok) throw new Error(await errorMessage(res));
        toast.success(current ? "Event unpublished" : "Event published");
        router.refresh();
      } catch (err) {
        toast.error(
          `Publish failed: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    });
  };

  const remove = async (id: string) => {
    const ok = await confirm({
      title: "DELETE EVENT",
      message: "Delete this event? This is irreversible.",
      confirmLabel: "DELETE",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(await errorMessage(res));
        toast.success("Event deleted");
        router.refresh();
      } catch (err) {
        toast.error(
          `Delete failed: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    });
  };

  const btn =
    "retro border-2 px-3 py-1 text-[8px] transition-colors disabled:opacity-50";

  const columns: PixelColumn<EventRow>[] = [
    {
      key: "title",
      header: "EVENT",
      render: (e) => (
        <div className="flex max-w-[18rem] flex-col sm:max-w-[26rem]">
          <span className="truncate text-white">{e.title}</span>
          <span className="retro truncate text-[8px] text-zinc-500">
            {e.eventType ?? "—"}
          </span>
        </div>
      ),
    },
    {
      key: "date",
      header: "DATE",
      render: (e) => (
        <span className="text-white/70">
          {formatEventDateLong(new Date(e.eventDate))}
        </span>
      ),
    },
    {
      key: "audience",
      header: "AUDIENCE",
      render: (e) => (
        <span className="retro text-[8px] text-brand-light">
          {AUDIENCE_BADGE_LABELS[e.audience as EventAudience] ??
            e.audience.toUpperCase()}
        </span>
      ),
    },
    {
      key: "location",
      header: "LOCATION",
      render: (e) => <span className="text-white/70">{e.location || "—"}</span>,
    },
    {
      key: "review",
      header: "REVIEW",
      render: (e) => (
        <span
          className={`retro inline-block border-2 px-2 py-1 text-[8px] uppercase ${
            e.reviewStatus === "approved"
              ? "border-brand/30 text-brand-light"
              : e.reviewStatus === "rejected"
                ? "border-red-900 bg-red-900/20 text-red-500"
                : "border-amber-500/40 text-amber-400"
          }`}
        >
          {e.reviewStatus}
        </span>
      ),
    },
    {
      key: "status",
      header: "PUBLISH",
      render: (e) => (
        <span
          className={`retro inline-block border-2 px-2 py-1 text-[8px] ${e.isPublished ? "border-brand text-brand-light" : "border-white/15 text-zinc-500"}`}
        >
          {e.isPublished ? "PUBLISHED" : "DRAFT"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "ACTIONS",
      align: "right",
      render: (e) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push(`/admin/events/${e.id}`)}
            className={`${btn} border-white/15 text-white/70 hover:border-brand hover:text-brand-light`}
          >
            ROSTER
          </button>
          <button
            type="button"
            onClick={() => router.push(`/admin/events/${e.id}/edit`)}
            className={`${btn} border-white/15 text-white/70 hover:border-brand hover:text-brand-light`}
          >
            EDIT
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => togglePublish(e.id, e.isPublished)}
            className={`${btn} border-white/15 text-white/70 hover:border-brand hover:text-brand-light`}
          >
            {e.isPublished ? "UNPUBLISH" : "PUBLISH"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => remove(e.id)}
            className={`${btn} border-red-500/40 text-red-400 hover:bg-red-500/10`}
          >
            DELETE
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PixelDataTable
        data={initialEvents}
        columns={columns}
        empty="NO EVENTS"
      />
      {dialog}
    </>
  );
}
