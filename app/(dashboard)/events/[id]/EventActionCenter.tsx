"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TacticalCard } from "@/components/ui/TacticalCard";
import { TacticalButton } from "@/components/ui/TacticalButton";

interface EventActionCenterProps {
  eventId: string;
  isPast: boolean;
  isRegistered: boolean;
  hasProvidedFeedback: boolean;
}

export default function EventActionCenter({
  eventId,
  isPast,
  isRegistered,
  hasProvidedFeedback,
}: EventActionCenterProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Feedback Form State
  const [rating, setRating] = useState("5");
  const [comments, setComments] = useState("");

  const handleRegistration = async () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(await res.text());
        alert("UPLINK_ESTABLISHED // REGISTRATION_CONFIRMED");
        router.refresh();
      } catch (err) {
        alert(
          "REGISTRATION_FAILURE // " +
            (err instanceof Error ? err.message : "UNKNOWN_ERROR"),
        );
      }
    });
  };

  const handleFeedbackSubmit = async () => {
    if (!comments.trim()) {
      alert("ERROR: COMMENTS_REQUIRED_FOR_POST_MORTEM");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: parseInt(rating), comments }),
        });
        if (!res.ok) throw new Error(await res.text());
        alert("FEEDBACK_LOGGED // TRANSMISSION_SUCCESSFUL");
        router.refresh();
      } catch (err) {
        alert(
          "TRANSMISSION_FAILURE // " +
            (err instanceof Error ? err.message : "UNKNOWN_ERROR"),
        );
      }
    });
  };

  // SCENARIO 1: Upcoming Event
  if (!isPast) {
    return (
      <TacticalCard
        id="ACTION_CENTER"
        variant="accent"
        className="sticky top-8"
      >
        <div className="space-y-4 text-center pb-4">
          <h3 className="text-xl font-black uppercase tracking-tighter text-white">
            STATUS
          </h3>
          {isRegistered ? (
            <div className="text-emerald-500 font-bold text-sm tracking-widest uppercase border border-emerald-500/30 bg-emerald-500/10 py-3">
              UPLINK_ESTABLISHED
            </div>
          ) : (
            <div className="text-zinc-500 font-bold text-sm tracking-widest uppercase border border-zinc-800 bg-zinc-950 py-3">
              AWAITING_REGISTRATION
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-zinc-900">
          <TacticalButton
            variant={isRegistered ? "ghost" : "primary"}
            className="w-full justify-center"
            onClick={handleRegistration}
            disabled={isPending || isRegistered}
          >
            {isPending
              ? "PROCESSING_REQUEST..."
              : isRegistered
                ? "ALREADY_REGISTERED"
                : "INITIATE_REGISTRATION"}
          </TacticalButton>
        </div>
      </TacticalCard>
    );
  }

  // SCENARIO 2: Past Event (Feedback Form)
  return (
    <TacticalCard
      id="POST_MORTEM_EVAL"
      variant="dashed"
      className="sticky top-8"
    >
      {hasProvidedFeedback ? (
        <div className="text-center py-8 space-y-4">
          <div className="text-emerald-500 font-black tracking-widest uppercase text-xs">
            EVALUATION_LOCKED
          </div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
            YOUR_FEEDBACK_HAS_BEEN_RECORDED_IN_THE_ARCHIVE.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <h3 className="text-[10px] font-black tracking-widest uppercase text-zinc-500 border-b border-zinc-900 pb-2">
            01_EVALUATION_METRICS
          </h3>

          <div>
            <label className="text-[9px] font-black tracking-widest uppercase text-zinc-500 block mb-2">
              RATING_LEVEL (1-5)
            </label>
            <select
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-full bg-black border border-zinc-800 px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-white transition-colors appearance-none"
              disabled={isPending}
            >
              <option value="5">5 - OUTSTANDING_EXECUTION</option>
              <option value="4">4 - SATISFACTORY_PARAMETERS</option>
              <option value="3">3 - ADEQUATE_OPERATION</option>
              <option value="2">2 - SUBOPTIMAL_PERFORMANCE</option>
              <option value="1">1 - CRITICAL_MISSION_FAILURE</option>
            </select>
          </div>

          <h3 className="text-[10px] font-black tracking-widest uppercase text-zinc-500 border-b border-zinc-900 pb-2 pt-2">
            02_OPERATIONAL_REMARKS
          </h3>

          <div>
            <label className="text-[9px] font-black tracking-widest uppercase text-zinc-500 block mb-2">
              POST_MORTEM_COMMENTS
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full bg-black border border-zinc-800 px-4 py-3 text-xs font-mono text-white placeholder:text-zinc-700 placeholder:uppercase focus:outline-none focus:border-white transition-colors min-h-[120px] resize-none"
              placeholder="ENTER_OBSERVATIONS_AND_DEBRIEF_DATA..."
              disabled={isPending}
            />
          </div>

          <div className="pt-4 border-t border-zinc-900">
            <TacticalButton
              variant="outline"
              className="w-full justify-center"
              onClick={handleFeedbackSubmit}
              disabled={isPending}
            >
              {isPending ? "TRANSMITTING_DATA..." : "SUBMIT_POST_MORTEM"}
            </TacticalButton>
          </div>
        </div>
      )}
    </TacticalCard>
  );
}
