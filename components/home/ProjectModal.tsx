"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/8bit-button";
import { Input } from "@/components/ui/8bit-input";
import { Label } from "@/components/ui/8bit-label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/8bit-select";
import { toast as rawToast } from "@/components/ui/8bit-toast";
import { ImageCropUpload } from "@/components/ui/ImageCropUpload";
import { useModalBehavior } from "@/hooks/useModalBehavior";
import { TechStackSelect } from "./TechStackSelect";

const toast = rawToast as unknown as (message: ReactNode) => void;
function notify(kind: "success" | "error", message: string) {
  const color = kind === "success" ? "text-green-500" : "text-red-500";
  toast(<span className={color}>{message}</span>);
}

// DB enum (prisma ProjectStatus) paired with the same friendly labels the admin
// panel uses, so a member sees consistent wording. Values must stay in sync with
// the enum and the /api/projects whitelist.
type ProjectStatus = "planning" | "active" | "completed" | "stalled";
const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "planning", label: "PLANNING" },
  { value: "active", label: "BUILDING" },
  { value: "completed", label: "COMPLETED" },
  { value: "stalled", label: "STALLED" },
];

interface ProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectModal({ open, onOpenChange }: ProjectModalProps) {
  useModalBehavior(open, onOpenChange);

  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [status, setStatus] = useState<ProjectStatus>("planning");
  const [progressPct, setProgressPct] = useState("0");
  const [saving, setSaving] = useState(false);

  function reset() {
    setTitle("");
    setDescription("");
    setImageUrl("");
    setGithubRepoUrl("");
    setDemoUrl("");
    setTechStack([]);
    setStatus("planning");
    setProgressPct("0");
  }

  async function handleCreate() {
    if (!title.trim()) {
      notify("error", "✗ Title is required");
      return;
    }
    if (!githubRepoUrl.trim()) {
      notify("error", "✗ GitHub repo URL is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description || null,
          imageUrl: imageUrl || null,
          githubRepoUrl: githubRepoUrl.trim(),
          demoUrl: demoUrl.trim() || null,
          techStack,
          status,
          progressPct: Math.max(
            0,
            Math.min(100, Math.round(Number(progressPct) || 0)),
          ),
          milestones: [],
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);

      notify("success", "✓ Project submitted for review");
      reset();
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      notify("error", `✗ ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto border-4 border-white/80 bg-[#0a0a0a] p-6 sm:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-8 flex items-center justify-between">
          <h2 className="retro text-2xl tracking-wider text-white">
            NEW PROJECT
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="retro text-lg text-muted-foreground hover:text-white"
            aria-label="Close"
          >
            X
          </button>
        </div>

        <p className="retro mb-8 border-2 border-[#22c55e]/40 p-3 text-[10px] leading-relaxed text-muted-foreground">
          Heads up — your project goes to an admin for review before it&apos;s
          listed.
        </p>

        <div className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="pr-title" className="text-[10px]">
              TITLE *
            </Label>
            <Input
              id="pr-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ORBIT"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pr-desc" className="text-[10px]">
              DESCRIPTION
            </Label>
            <div className="relative flex border-y-[4px] border-foreground dark:border-ring">
              <textarea
                id="pr-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does it do?"
                rows={4}
                className="retro w-full resize-none rounded-none bg-transparent px-3 py-2 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
              />
              <div
                className="pointer-events-none absolute inset-0 -mx-1 border-x-[4px] border-foreground dark:border-ring"
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-[10px]">COVER IMAGE (5:4)</Label>
            <ImageCropUpload
              aspect={5 / 4}
              kind="project"
              value={imageUrl}
              onChange={setImageUrl}
            />
          </div>

          <div className="grid gap-4">
            <Label htmlFor="pr-repo" className="text-[10px]">
              GITHUB REPO URL *
            </Label>
            <Input
              id="pr-repo"
              type="url"
              value={githubRepoUrl}
              onChange={(e) => setGithubRepoUrl(e.target.value)}
              placeholder="https://github.com/your/repo"
            />
          </div>

          <div className="grid gap-4">
            <Label htmlFor="pr-demo" className="text-[10px]">
              DEMO LINK
            </Label>
            <Input
              id="pr-demo"
              type="url"
              value={demoUrl}
              onChange={(e) => setDemoUrl(e.target.value)}
              placeholder="https://your-demo.app  (optional)"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-[10px]">STATUS</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as ProjectStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[200] dark">
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pr-progress" className="text-[10px]">
                PROGRESS %
              </Label>
              <Input
                id="pr-progress"
                type="number"
                min={0}
                max={100}
                value={progressPct}
                onChange={(e) => setProgressPct(e.target.value)}
                onBlur={(e) =>
                  setProgressPct(
                    String(
                      Math.max(
                        0,
                        Math.min(100, Math.round(Number(e.target.value) || 0)),
                      ),
                    ),
                  )
                }
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid gap-6">
            <Label className="text-[10px] gap-1">TECH STACK</Label>
            <TechStackSelect value={techStack} onChange={setTechStack} />
          </div>

          <Button
            className="mt-2 w-full text-[10px]"
            disabled={saving}
            onClick={handleCreate}
          >
            {saving ? "SUBMITTING" : "SUBMIT FOR REVIEW"}
          </Button>
        </div>
      </div>
    </div>
  );
}
