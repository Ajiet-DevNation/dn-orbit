"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
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

const toast = rawToast as unknown as (message: ReactNode) => void;
function notify(kind: "success" | "error", message: string) {
  const color = kind === "success" ? "text-green-500" : "text-red-500";
  toast(<span className={color}>{message}</span>);
}

const EVENT_TYPES = [
  "WORKSHOP",
  "HACKATHON",
  "TECH_TALK",
  "CODEATHON",
  "MEETUP",
  "OTHER",
];

interface EventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}

export function EventModal({ open, onOpenChange, isAdmin }: EventModalProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [publishNow, setPublishNow] = useState(false);
  const [saving, setSaving] = useState(false);

  function reset() {
    setTitle("");
    setEventType("");
    setEventDate("");
    setLocation("");
    setDescription("");
    setBannerUrl("");
    setPublishNow(false);
  }

  async function handleCreate() {
    if (!title.trim() || !eventDate) {
      notify("error", "✗ Title and date are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description || null,
          bannerUrl: bannerUrl || null,
          eventType: eventType || null,
          eventDate,
          location: location || null,
          isPublished: isAdmin ? publishNow : false,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);

      notify(
        "success",
        isAdmin && publishNow
          ? "✓ Event published"
          : "✓ Event submitted for admin review"
      );
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
          <h2 className="retro text-lg tracking-wider text-white">NEW EVENT</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="retro text-lg text-muted-foreground hover:text-white"
            aria-label="Close"
          >
            X
          </button>
        </div>

        {!isAdmin && (
          <p className="retro mb-8 border-2 border-[#22c55e]/40 p-3 text-[10px] leading-relaxed text-muted-foreground">
            Heads up — your event goes to an admin for review before it&apos;s
            published.
          </p>
        )}

        <div className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="ev-title" className="text-[10px]">
              TITLE *
            </Label>
            <Input
              id="ev-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Hackathon 2026"
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="grid gap-2">
              <Label className="text-[10px]">TYPE</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="SELECT" />
                </SelectTrigger>
                <SelectContent className="z-[200] dark">
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ev-date" className="text-[10px]">
                DATE &amp; TIME *
              </Label>
              <Input
                id="ev-date"
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="text-[10px]"
                style={{ colorScheme: "dark" }}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ev-loc" className="text-[10px]">
              LOCATION
            </Label>
            <Input
              id="ev-loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Main Auditorium"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ev-desc" className="text-[10px]">
              DESCRIPTION
            </Label>
            {/* Multiline — same pixel-border frame as the 8bit Input, but a
                textarea so text wraps onto new lines instead of scrolling. */}
            <div className="relative flex border-y-6 border-foreground dark:border-ring">
              <textarea
                id="ev-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's it about?"
                rows={4}
                className="retro w-full resize-none rounded-none bg-transparent px-3 py-2 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
              />
              <div
                className="pointer-events-none absolute inset-0 -mx-1.5 border-x-6 border-foreground dark:border-ring"
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-[10px]">BANNER (16:9)</Label>
            <ImageCropUpload
              aspect={16 / 9}
              kind="event"
              value={bannerUrl}
              onChange={setBannerUrl}
            />
          </div>

          {isAdmin && (
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={publishNow}
                onChange={(e) => setPublishNow(e.target.checked)}
                className="size-4 accent-[#22c55e]"
              />
              <span className="text-[10px] tracking-wider text-muted-foreground">
                PUBLISH IMMEDIATELY
              </span>
            </label>
          )}

          <Button
            className="mt-2 w-full text-[10px]"
            disabled={saving}
            onClick={handleCreate}
          >
            {saving
              ? "SUBMITTING"
              : isAdmin
                ? "CREATE EVENT"
                : "SUBMIT FOR REVIEW"}
          </Button>
        </div>
      </div>
    </div>
  );
}
