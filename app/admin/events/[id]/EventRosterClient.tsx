"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { TacticalTable } from "@/components/ui/TacticalTable";
import { TacticalButton } from "@/components/ui/TacticalButton";

interface RosterEntry {
  id: string;
  userId: string;
  name: string;
  usn: string;
  attended: boolean;
}

interface EventRosterClientProps {
  eventId: string;
  registrations: RosterEntry[];
}

export default function EventRosterClient({ eventId, registrations }: EventRosterClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleToggleAttendance = (userId: string, currentStatus: boolean) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/attendance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Flip the current status and post it to the backend
          body: JSON.stringify({ userId, attended: !currentStatus }), 
        });

        if (!res.ok) throw new Error(await res.text());
        
        router.refresh(); // Sync UI with the updated DB state instantly
      } catch (err) {
        alert("ATTENDANCE_UPDATE_FAILED // " + (err instanceof Error ? err.message : "UNKNOWN_ERROR"));
      }
    });
  };

  const columns = [
    { 
      key: "operative",
      header: "OPERATIVE", 
      render: (r: RosterEntry) => (
        <div className="flex flex-col">
          <span className="text-white font-black">{r.name}</span>
          <span className="text-[9px] text-zinc-500 tracking-widest uppercase">{r.usn}</span>
        </div>
      ) 
    },
    { 
      key: "status",
      header: "STATUS", 
      render: (r: RosterEntry) => (
        <div className={`px-2 py-0.5 inline-block text-[9px] font-black border ${
          r.attended 
            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' 
            : 'bg-transparent text-zinc-500 border-zinc-800'
        }`}>
          {r.attended ? "ATTENDED" : "ABSENT"}
        </div>
      ) 
    },
    { 
      key: "actions",
      header: "ACTIONS", 
      render: (r: RosterEntry) => (
        <div className="flex justify-end text-right">
          <TacticalButton 
            variant={r.attended ? "ghost" : "outline"} 
            size="sm" 
            prefix=""
            disabled={isPending}
            onClick={() => handleToggleAttendance(r.userId, r.attended)}
          >
            {r.attended ? "REVOKE_STATUS" : "MARK_ATTENDED"}
          </TacticalButton>
        </div>
      ) 
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
        <div className="text-xl text-white font-black uppercase tracking-tighter">PERSONNEL_ROSTER</div>
        <div className="text-[8px] text-emerald-500 uppercase tracking-widest font-bold">
          TOTAL_REGISTERED: {registrations.length}
        </div>
      </div>
      
      {registrations.length === 0 ? (
        <div className="text-xs text-zinc-500 font-mono uppercase tracking-widest p-8 border border-dashed border-zinc-800 text-center">
          NO_OPERATIVES_REGISTERED_YET
        </div>
      ) : (
        <TacticalTable 
          data={registrations} 
          columns={columns} 
          id={`ROSTER_0x${eventId.substring(0,4).toUpperCase()}`} 
        />
      )}
    </div>
  );
}
