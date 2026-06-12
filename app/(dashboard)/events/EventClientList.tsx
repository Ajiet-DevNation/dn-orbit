"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TacticalCard } from "@/components/ui/TacticalCard";
import { TacticalButton } from "@/components/ui/TacticalButton";

interface Event {
  id: string;
  title: string;
  description: string | null;
  eventType: string | null;
  eventDate: string; 
  location: string | null;
}

interface EventClientListProps {
  initialEvents: Event[];
}

export default function EventClientList({ initialEvents }: EventClientListProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"UPCOMING" | "PAST">("UPCOMING");
  
  // Interaction State Management
  const [isPending, startTransition] = useTransition();
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  
  // Local state tracking to render UPLINK_ESTABLISHED instantly
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(new Set());

  const now = new Date();
  
  const filteredEvents = initialEvents.filter((event) => {
    const eventDate = new Date(event.eventDate);
    if (activeTab === "UPCOMING") return eventDate >= now;
    return eventDate < now;
  });

  // Handle API POST to register for an event
  const handleRegistration = async (eventId: string) => {
    setActiveTargetId(eventId);
    
    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        
        if (!res.ok) throw new Error(await res.text());
        
        alert("REGISTRATION_SUCCESSFUL // UPLINK_ESTABLISHED");
        
        // Add to local state so the badge renders immediately
        setRegisteredEventIds((prev) => new Set(prev).add(eventId));
        
        router.refresh(); // Refresh server data downstream
      } catch (err) {
        alert("REGISTRATION_FAILURE // " + (err instanceof Error ? err.message : "UNKNOWN_ERROR"));
      } finally {
        setActiveTargetId(null);
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* 01_NAVIGATION_TABS */}
      <div className="flex items-center gap-4 border-b border-zinc-900 pb-4">
        <button
          onClick={() => setActiveTab("UPCOMING")}
          className={`text-xs font-black uppercase tracking-widest px-4 py-2 transition-colors ${
            activeTab === "UPCOMING" 
              ? "text-black bg-white" 
              : "text-zinc-500 hover:text-white"
          }`}
        >
          [ UPCOMING_OPERATIONS ]
        </button>
        <button
          onClick={() => setActiveTab("PAST")}
          className={`text-xs font-black uppercase tracking-widest px-4 py-2 transition-colors ${
            activeTab === "PAST" 
              ? "text-black bg-white" 
              : "text-zinc-500 hover:text-white"
          }`}
        >
          [ ARCHIVED_RECORDS ]
        </button>
      </div>

      {/* 02_DATA_GRID */}
      {filteredEvents.length === 0 ? (
        <div className="text-xs text-zinc-500 font-mono uppercase tracking-widest p-8 border border-dashed border-zinc-800 text-center">
          NO_{activeTab}_EVENTS_SCHEDULED
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const formattedDate = new Date(event.eventDate).toLocaleDateString("en-CA").replace(/-/g, '.');
            const eventIdHex = `0x${event.id.substring(0, 6).toUpperCase()}`;
            const isTargetingThisEvent = isPending && activeTargetId === event.id;

            return (
              <TacticalCard
                key={event.id}
                id={`EVT_ID: ${eventIdHex}`}
                title={event.title}
                subtitle={event.eventType || "GENERAL_ASSEMBLY"}
                status={activeTab === "UPCOMING" ? "ACTIVE" : "ARCHIVED"}
                timestamp={formattedDate}
                className="flex flex-col h-full hover:border-zinc-700 transition-colors"
              >
                <div className="flex-1 space-y-4 mb-6">
                  {/* Metadata Block */}
                  <div className="grid grid-cols-2 gap-4 border-b border-zinc-900 pb-4">
                     <div>
                        <p className="text-[8px] text-zinc-600 uppercase tracking-widest font-black mb-1">LOCATION</p>
                        <p className="text-xs text-zinc-300 truncate">{event.location || "VIRTUAL_UPLINK"}</p>
                     </div>
                     <div>
                        <p className="text-[8px] text-zinc-600 uppercase tracking-widest font-black mb-1">DATE</p>
                        <p className="text-xs text-zinc-300 truncate">{formattedDate}</p>
                     </div>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-3">
                    {event.description || "NO_MISSION_BRIEFING_PROVIDED_IN_ARCHIVE."}
                  </p>
                </div>

                {/* 03_ACTIONS_BLOCK */}
                <div className="mt-auto pt-4 border-t border-zinc-900">
                  {activeTab === "UPCOMING" ? (
                    registeredEventIds.has(event.id) ? (
                      <div className="w-full text-center py-3 text-[10px] text-emerald-500 font-bold tracking-widest uppercase border border-emerald-500/30 bg-emerald-500/10">
                        UPLINK_ESTABLISHED
                      </div>
                    ) : (
                      <TacticalButton 
                        variant="primary" 
                        className="w-full justify-center"
                        onClick={() => handleRegistration(event.id)}
                        disabled={isTargetingThisEvent}
                      >
                        {isTargetingThisEvent ? "ESTABLISHING_UPLINK..." : "INITIATE_REGISTRATION"}
                      </TacticalButton>
                    )
                  ) : (
                    <TacticalButton 
                      variant="ghost" 
                      className="w-full justify-center text-zinc-500 hover:text-white"
                      onClick={() => router.push(`/events/${event.id}`)}
                    >
                      VIEW_ARCHIVE_DATA
                    </TacticalButton>
                  )}
                </div>
              </TacticalCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
