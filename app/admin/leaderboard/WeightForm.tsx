"use client";

import React, { useState, useTransition } from "react";
import { toast } from "@/components/ui/8bit-toast";
import { useRouter } from "next/navigation";
import { PixelSlider } from "@/components/ui/PixelSlider";
import { Button } from "@/components/ui/8bit-button";
import { Input } from "@/components/ui/8bit-input";

interface WeightFormProps {
  initialWeights: {
    githubWeight: number;
    lcWeight: number;
    eventWeight: number;
    ghOpenSourceMinStars: number;
    ghOpenSourcePerPrPoints: number;
  };
}

export function WeightForm({ initialWeights }: WeightFormProps) {
  const [isPending, startTransition] = useTransition();
  const [weights, setWeights] = useState({
    githubWeight: initialWeights.githubWeight,
    lcWeight: initialWeights.lcWeight,
    eventWeight: initialWeights.eventWeight,
  });
  // Open-source knobs are kept as raw input strings so the fields can be cleared
  // mid-edit without snapping to 0; they're parsed on submit.
  const [minStars, setMinStars] = useState(String(initialWeights.ghOpenSourceMinStars));
  const [perPr, setPerPr] = useState(String(initialWeights.ghOpenSourcePerPrPoints));
  const router = useRouter();

  const total = parseFloat(
    (weights.githubWeight + weights.lcWeight + weights.eventWeight).toFixed(2)
  );
  const isValid = Math.abs(total - 1.0) < 0.01;

  const parsedMinStars = Math.max(0, Math.round(Number(minStars)));
  const parsedPerPr = Math.max(0, Number(perPr));
  const ossValid =
    Number.isFinite(Number(minStars)) &&
    minStars.trim() !== "" &&
    Number.isFinite(Number(perPr)) &&
    perPr.trim() !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !ossValid) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/config/weights", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...weights,
            ghOpenSourceMinStars: parsedMinStars,
            ghOpenSourcePerPrPoints: parsedPerPr,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        router.refresh();
        toast.success("Weights saved");
      } catch (err) {
        toast.error("Failed to save: " + (err instanceof Error ? err.message : "UNKNOWN"));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-6">
        {[
          { label: "GITHUB", key: "githubWeight" as const },
          { label: "LEETCODE", key: "lcWeight" as const },
          { label: "EVENT ATTENDANCE", key: "eventWeight" as const },
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
            <PixelSlider
              aria-label={item.label}
              value={Math.round(weights[item.key] * 100)}
              onChange={(v) =>
                setWeights({ ...weights, [item.key]: v / 100 })
              }
              min={0}
              max={100}
              step={1}
            />
          </div>
        ))}

        <div className="border-t-2 border-white/10 pt-4 flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <span className="retro text-[8px] text-zinc-600 uppercase tracking-widest">
              TOTAL
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
            {isValid ? "BALANCED" : "OFF"}
          </span>
        </div>
      </div>

      {/* Open-source contribution tuning — folds into the GITHUB component above
          (not a separate weight). min stars filters which merged PRs to other
          people's repos count; points/PR is how much each adds to the raw GitHub
          score before normalisation. */}
      <div className="space-y-4 border-t-2 border-white/10 pt-6">
        <div className="space-y-1">
          <span className="retro text-[9px] uppercase tracking-widest text-[#22c55e]">
            OPEN SOURCE · GITHUB
          </span>
          <p className="retro text-[8px] leading-relaxed text-zinc-600 uppercase tracking-widest">
            Merged PRs to repos a member doesn&apos;t own. Boosts their GitHub score.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="retro text-[8px] uppercase tracking-widest text-zinc-500">
              MIN UPSTREAM STARS
            </label>
            <Input
              type="number"
              min={0}
              step={1}
              value={minStars}
              disabled={isPending}
              onChange={(e) => setMinStars(e.target.value)}
              aria-label="Minimum upstream stars"
              className="text-[10px]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="retro text-[8px] uppercase tracking-widest text-zinc-500">
              POINTS PER PR
            </label>
            <Input
              type="number"
              min={0}
              step={1}
              value={perPr}
              disabled={isPending}
              onChange={(e) => setPerPr(e.target.value)}
              aria-label="Points per merged PR"
              className="text-[10px]"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Button
          type="submit"
          disabled={isPending || !isValid || !ossValid}
          className="w-full text-[9px] !bg-[#22c55e] !text-black hover:!bg-[#16a34a]"
        >
          {isPending ? "SAVING…" : "SAVE WEIGHTS"}
        </Button>
        <p className="retro text-[8px] text-zinc-600 text-center uppercase tracking-widest leading-relaxed">
          Changing these triggers a full leaderboard recalculation on the next cron run.
        </p>
      </div>
    </form>
  );
}
