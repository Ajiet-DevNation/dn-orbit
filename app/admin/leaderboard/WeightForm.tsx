"use client";

import React, { useState, useTransition } from "react";
import { TacticalCard } from "@/components/ui/TacticalCard";
import { TacticalButton } from "@/components/ui/TacticalButton";
import { useRouter } from "next/navigation";

interface WeightFormProps {
  initialWeights: {
    githubWeight: number;
    lcWeight: number;
    eventWeight: number;
  };
}

export function WeightForm({ initialWeights }: WeightFormProps) {
  const [isPending, startTransition] = useTransition();
  const [weights, setWeights] = useState(initialWeights);
  const router = useRouter();

  const total = parseFloat((weights.githubWeight + weights.lcWeight + weights.eventWeight).toFixed(2));
  const isValid = Math.abs(total - 1.0) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/config/weights", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(weights)
        });
        if (!res.ok) throw new Error(await res.text());
        router.refresh();
        alert("WEIGHTS_COMMITTED: SYSTEM_STABLE");
      } catch (err) {
        alert("COMMIT_FAILURE: " + (err instanceof Error ? err.message : "UNKNOWN"));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-12 max-w-2xl">
      <TacticalCard title="ALGORITHM_PARAMETERS" subtitle="SCORING_WEIGHT_MATRIX" id="CAL_0xAF42">
        <div className="space-y-8">
          {[
            { label: "GITHUB_CONTRIBUTION", key: "githubWeight" as const },
            { label: "LEETCODE_PERFORMANCE", key: "lcWeight" as const },
            { label: "EVENT_ATTENDANCE", key: "eventWeight" as const },
          ].map((item) => (
            <div key={item.key} className="space-y-2 group">
              <div className="flex justify-between items-end">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 group-focus-within:text-white transition-colors">
                  {item.label}
                </label>
                <span className="text-xs font-black text-white">{(weights[item.key] * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range"
                min="0"
                max="100"
                step="1"
                value={weights[item.key] * 100}
                onChange={(e) => setWeights({ ...weights, [item.key]: parseInt(e.target.value) / 100 })}
                className="w-full accent-white bg-zinc-900 appearance-none h-1 border border-zinc-800"
              />
            </div>
          ))}

          <div className="pt-6 border-t border-zinc-900 flex justify-between items-center">
             <div className="flex flex-col">
                <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-black">TOTAL_NORMALIZATION</span>
                <span className={`text-xl font-black ${isValid ? 'text-white' : 'text-red-500 animate-pulse'}`}>
                   {total.toFixed(2)} / 1.00
                </span>
             </div>
             {isValid ? (
                <div className="bg-white text-black px-2 py-0.5 text-[10px] font-black uppercase">NOMINAL</div>
             ) : (
                <div className="bg-red-900 text-white px-2 py-0.5 text-[10px] font-black uppercase">SKEWED</div>
             )}
          </div>
        </div>
      </TacticalCard>

      <div className="pt-6 space-y-4">
        <TacticalButton 
          type="submit" 
          disabled={isPending || !isValid}
          size="lg" 
          className="w-full py-6"
        >
          {isPending ? "COMMITTING_ALGORITHM..." : "COMMIT_WEIGHT_MATRIX"}
        </TacticalButton>
        <p className="text-[8px] text-zinc-600 text-center uppercase tracking-widest leading-relaxed">
           CAUTION: MODIFYING THESE PARAMETERS WILL TRIGGER A PROJECT-WIDE RECALCULATION<br />OF ALL LEADERBOARD NODES IN THE NEXT CRON_CYCLE.
        </p>
      </div>
    </form>
  );
}
