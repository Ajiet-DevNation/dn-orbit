"use client";

import React, { useTransition } from "react";
import { TacticalTable } from "@/components/ui/TacticalTable";
import { TacticalButton } from "@/components/ui/TacticalButton";
import { useRouter } from "next/navigation";

interface Event {
  id: string;
  title: string;
  eventType: string | null;
  eventDate: Date;
  location: string | null;
  isPublished: boolean;
}

interface EventTableProps {
  initialEvents: Event[];
}

export function EventTable({ initialEvents }: EventTableProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleTogglePublish = async (id: string, current: boolean) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublished: !current }),
        });
        if (!res.ok) throw new Error(await res.text());
        router.refresh();
      } catch (err) {
        alert("PUBLISH_FAILURE: " + (err instanceof Error ? err.message : "UNKNOWN"));
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("CONFIRM_DELETION: THIS ACTION IS IRREVERSIBLE. CONTINUE?")) return;
    
    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error(await res.text());
        router.refresh();
      } catch (err) {
        alert("DELETION_FAILURE: " + (err instanceof Error ? err.message : "UNKNOWN"));
      }
    });
  };

  const columns = [
    { 
      key: "title",
      header: "IDENTIFIER", 
      render: (e: Event) => (
        <div className="flex flex-col">
          <span className="text-white font-black">{e.title}</span>
          <span className="text-[9px] text-zinc-600 tracking-tighter uppercase">{e.eventType || "GENERAL_ASSEMBLY"}</span>
        </div>
      ) 
    },
    { 
      key: "eventDate",
      header: "DATE", 
      render: (e: Event) => new Date(e.eventDate).toLocaleDateString() 
    },
    { 
      key: "location",
      header: "LOCATION", 
      render: (e: Event) => e.location || "VIRTUAL" 
    },
    { 
      key: "status",
      header: "STATUS", 
      render: (e: Event) => (
        <div className={`px-2 py-0.5 inline-block text-[9px] font-black border ${
          e.isPublished 
            ? 'bg-white text-black border-white' 
            : 'bg-transparent text-zinc-500 border-zinc-800 italic'
        }`}>
          {e.isPublished ? "PUBLISHED" : "DRAFT"}
        </div>
      ) 
    },
    { 
      key: "actions",
      header: "ACTIONS", 
      render: (e: Event) => (
        <div className="flex justify-end gap-2 text-right">
          <TacticalButton 
            variant="outline" 
            size="sm" 
            prefix=""
            disabled={isPending}
            onClick={() => handleTogglePublish(e.id, e.isPublished)}
          >
            {e.isPublished ? "UNPUBLISH" : "DEPLOY"}
          </TacticalButton>
          <TacticalButton 
            variant="danger" 
            size="sm" 
            prefix=""
            disabled={isPending}
            onClick={() => handleDelete(e.id)}
          >
            DELETE
          </TacticalButton>
        </div>
      ) 
    }
  ];

  return <TacticalTable data={initialEvents} columns={columns} id="EVE_DIR_ROOT" />;
}
