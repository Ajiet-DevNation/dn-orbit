"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TacticalCard } from "@/components/ui/TacticalCard";
import { TacticalButton } from "@/components/ui/TacticalButton";
import { Circle, X } from "lucide-react";

const INPUT =
  "w-full bg-black border border-zinc-800 px-4 py-3 text-xs font-mono text-white placeholder:text-zinc-700 placeholder:uppercase focus:outline-none focus:border-white transition-colors";

export function ProjectSubmitForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");

  const [techStack, setTechStack] = useState<string[]>([]);
  const [techInput, setTechInput] = useState("");

  const [milestones, setMilestones] = useState<string[]>([]);
  const [milestoneInput, setMilestoneInput] = useState("");

  function addTech() {
    const val = techInput.trim().toUpperCase();
    if (val && !techStack.includes(val)) {
      setTechStack((prev) => [...prev, val]);
    }
    setTechInput("");
  }

  function removeTech(tech: string) {
    setTechStack((prev) => prev.filter((t) => t !== tech));
  }

  function addMilestone() {
    const val = milestoneInput.trim();
    if (val) {
      setMilestones((prev) => [...prev, val]);
    }
    setMilestoneInput("");
  }

  function removeMilestone(index: number) {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("SYSTEM_ERROR: PROJECT_TITLE_REQUIRED");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || undefined,
            githubRepoUrl: githubRepoUrl.trim() || undefined,
            techStack,
            milestones: milestones.map((label) => ({ label, done: false })),
          }),
        });

        if (!res.ok) throw new Error(await res.text());

        alert("TRANSMISSION_COMPLETE // PROJECT_SUBMITTED_FOR_REVIEW");
        router.push("/projects");
        router.refresh();
      } catch (err) {
        alert(
          "TRANSMISSION_FAILURE // " +
            (err instanceof Error ? err.message : "UNKNOWN_ERROR"),
        );
      }
    });
  };

  return (
    <TacticalCard id="PROJECT_UPLINK" variant="dashed" className="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-12">

        {/* 01 — IDENTIFICATION */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black tracking-widest uppercase text-zinc-500 border-b border-zinc-900 pb-2">
            01_PROJECT_IDENTIFICATION
          </h3>
          <div>
            <label className="text-[9px] font-black tracking-widest uppercase text-zinc-500 block mb-2">
              PROJECT_TITLE <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ENTER_PROJECT_NAME..."
              className={INPUT}
              disabled={isPending}
            />
          </div>
          <div>
            <label className="text-[9px] font-black tracking-widest uppercase text-zinc-500 block mb-2">
              MISSION_BRIEF
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="DESCRIBE_THE_PROJECT_OBJECTIVE..."
              className={`${INPUT} min-h-[120px] resize-none`}
              disabled={isPending}
            />
          </div>
        </div>

        {/* 02 — TECH STACK */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black tracking-widest uppercase text-zinc-500 border-b border-zinc-900 pb-2">
            02_TECH_STACK
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTech();
                }
              }}
              placeholder="E.G. REACT, PYTHON, DOCKER..."
              className={`${INPUT} flex-1`}
              disabled={isPending}
            />
            <button
              type="button"
              onClick={addTech}
              disabled={isPending || !techInput.trim()}
              className="px-4 py-3 border border-zinc-700 text-[9px] font-black tracking-widest uppercase text-zinc-400 hover:text-white hover:border-white transition-colors disabled:opacity-30"
            >
              ADD
            </button>
          </div>
          {techStack.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {techStack.map((tech) => (
                <span
                  key={tech}
                  className="inline-flex items-center gap-1.5 border border-zinc-700 px-2 py-1 text-[9px] font-black tracking-widest uppercase text-zinc-300"
                >
                  {tech}
                  <button
                    type="button"
                    onClick={() => removeTech(tech)}
                    className="text-zinc-600 hover:text-red-400 transition-colors"
                    aria-label={`Remove ${tech}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 03 — MILESTONES */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black tracking-widest uppercase text-zinc-500 border-b border-zinc-900 pb-2">
            03_MILESTONES
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={milestoneInput}
              onChange={(e) => setMilestoneInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addMilestone();
                }
              }}
              placeholder="E.G. DESIGN_DATABASE_SCHEMA..."
              className={`${INPUT} flex-1`}
              disabled={isPending}
            />
            <button
              type="button"
              onClick={addMilestone}
              disabled={isPending || !milestoneInput.trim()}
              className="px-4 py-3 border border-zinc-700 text-[9px] font-black tracking-widest uppercase text-zinc-400 hover:text-white hover:border-white transition-colors disabled:opacity-30"
            >
              ADD
            </button>
          </div>
          {milestones.length > 0 && (
            <div className="space-y-1">
              {milestones.map((label, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 py-2 border-b border-zinc-900 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Circle className="w-3 h-3 text-zinc-700 shrink-0" />
                    <span className="text-xs text-zinc-400 truncate">{label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMilestone(i)}
                    className="text-zinc-700 hover:text-red-400 transition-colors shrink-0"
                    aria-label="Remove milestone"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 04 — REPOSITORY */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black tracking-widest uppercase text-zinc-500 border-b border-zinc-900 pb-2">
            04_REPOSITORY
          </h3>
          <div>
            <label className="text-[9px] font-black tracking-widest uppercase text-zinc-500 block mb-2">
              GITHUB_REPO_URL
            </label>
            <input
              type="url"
              value={githubRepoUrl}
              onChange={(e) => setGithubRepoUrl(e.target.value)}
              placeholder="HTTPS://GITHUB.COM/ORG/REPO"
              className={INPUT}
              disabled={isPending}
            />
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-900 flex justify-end">
          <TacticalButton variant="primary" disabled={isPending}>
            {isPending ? "TRANSMITTING..." : "TRANSMIT_PROJECT"}
          </TacticalButton>
        </div>
      </form>
    </TacticalCard>
  );
}
