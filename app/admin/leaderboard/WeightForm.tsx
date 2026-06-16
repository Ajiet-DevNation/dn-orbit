"use client";

import React, { useState, useTransition } from "react";
import { toast } from "@/components/ui/8bit-toast";
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

  const total = parseFloat(
    (weights.githubWeight + weights.lcWeight + weights.eventWeight).toFixed(2)
  );
  const isValid = Math.abs(total - 1.0) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/config/weights", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(weights),
        });
        if (!res.ok) throw new Error(await res.text());
        router.refresh();
        toast.success("WEIGHTS_COMMITTED: SYSTEM_STABLE");
      } catch (err) {
        toast.error("COMMIT_FAILURE: " + (err instanceof Error ? err.message : "UNKNOWN"));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-6">
        {[
          { label: "GITHUB_CONTRIBUTION", key: "githubWeight" as const },
          { label: "LEETCODE_PERFORMANCE", key: "lcWeight" as const },
          { label: "EVENT_ATTENDANCE", key: "eventWeight" as const },
        ].map((item) => (
          <div key={item.key} className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="retro text-[9px] uppercase tracking-widest text-zinc-500">
                {item.label}
              </label>
              <span className="retro text-[9px] text-white">
                {(weights[item.key] * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={weights[item.key] * 100}
              onChange={(e) =>
                setWeights({ ...weights, [item.key]: parseInt(e.target.value) / 100 })
              }
              className="w-full accent-[#22c55e] bg-zinc-900 appearance-none h-1 border border-white/10"
            />
          </div>
        ))}

        <div className="border-t-2 border-white/10 pt-4 flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <span className="retro text-[8px] text-zinc-600 uppercase tracking-widest">
              TOTAL_NORMALIZATION
            </span>
            <span
              className={`retro text-lg ${
                isValid ? "text-white" : "animate-pulse text-red-500"
              }`}
            >
              {total.toFixed(2)} / 1.00
            </span>
          </div>
          <span
            className={`retro border-2 px-2 py-1 text-[9px] uppercase ${
              isValid
                ? "border-[#22c55e] text-[#22c55e]"
                : "border-red-500/40 text-red-400"
            }`}
          >
            {isValid ? "NOMINAL" : "SKEWED"}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <button
          type="submit"
          disabled={isPending || !isValid}
          className="retro w-full border-2 border-[#22c55e] px-4 py-3 text-[9px] text-[#22c55e] transition-colors hover:bg-[#22c55e] hover:text-black disabled:opacity-50"
        >
          {isPending ? "COMMITTING_ALGORITHM..." : "COMMIT_WEIGHT_MATRIX"}
        </button>
        <p className="retro text-[8px] text-zinc-600 text-center uppercase tracking-widest leading-relaxed">
          CAUTION: MODIFYING THESE PARAMETERS WILL TRIGGER A PROJECT-WIDE RECALCULATION
          <br />
          OF ALL LEADERBOARD NODES IN THE NEXT CRON_CYCLE.
        </p>
      </div>
    </form>
  );
}
