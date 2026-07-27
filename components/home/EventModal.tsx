"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { FormBuilder } from "@/app/admin/events/_form/FormBuilder";
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
import { PixelCheckbox } from "@/components/ui/PixelCheckbox";
import { PixelModal } from "@/components/ui/PixelModal";
import {
  AUDIENCE_OPTIONS,
  EVENT_TYPES,
  type EventAudience,
  eventTypeLabel,
  type FormFieldDef,
} from "@/lib/forms";

const toast = rawToast as unknown as (message: ReactNode) => void;
function notify(kind: "success" | "error", message: string) {
  const color = kind === "success" ? "text-green-500" : "text-red-500";
  toast(<span className={color}>{message}</span>);
}

interface EventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}

// ── Section divider — numbered pixel heading, mirroring the admin event-builder
// panels so the modal reads as the same "create event" surface. ──
function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="retro mt-2 border-b-2 border-white/10 pb-2 text-[10px] tracking-widest text-[#22c55e]">
      {children}
    </h3>
  );
}

export function EventModal({ open, onOpenChange, isAdmin }: EventModalProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [audience, setAudience] = useState("public");
  const [capacity, setCapacity] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [schema, setSchema] = useState<FormFieldDef[]>([]);
  const [publishNow, setPublishNow] = useState(false);
  const [saving, setSaving] = useState(false);

  function reset() {
    setTitle("");
    setEventType("");
    setEventDate("");
    setLocation("");
    setDescription("");
    setBannerUrl("");
    setAudience("public");
    setCapacity("");
    setRegistrationDeadline("");
    setSchema([]);
    setPublishNow(false);
  }

  async function handleCreate() {
    if (!title.trim() || !eventDate) {
      notify("error", "✗ Title and date are required");
      return;
    }
    // Every builder question needs a label; an "Untitled question" left in the
    // schema produces a confusing registration field, so block on it early.
    const blankLabel = schema.find((f) => !f.label.trim());
    if (blankLabel) {
      notify("error", "✗ Every custom question needs a label");
      return;
    }
    if (
      capacity &&
      (!Number.isInteger(Number(capacity)) || Number(capacity) < 1)
    ) {
      notify("error", "✗ Capacity must be a whole number ≥ 1");
      return;
    }
    if (
      registrationDeadline &&
      eventDate &&
      new Date(registrationDeadline) > new Date(eventDate)
    ) {
      notify("error", "✗ Registration deadline can't be after the event");
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
          audience,
          capacity: capacity ? Number(capacity) : null,
          registrationDeadline: registrationDeadline || null,
          formSchema: schema,
          isPublished: isAdmin ? publishNow : false,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);

      notify(
        "success",
        isAdmin && publishNow
          ? "✓ Event published"
          : "✓ Event submitted for admin review",
      );
      // First-ever event: point the user to where they can track it and see who
      // registers, since that page isn't obvious. Shown once (server flag).
      if (body.isFirstEvent) {
        notify("success", "✓ Find it under YOUR EVENTS in your profile");
      }
      reset();
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      notify("error", `✗ ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PixelModal
      open={open}
      onOpenChange={onOpenChange}
      title="NEW EVENT"
      size="lg"
      footer={
        <Button
          className="w-full text-[10px]"
          disabled={saving}
          onClick={handleCreate}
        >
          {saving
            ? "SUBMITTING"
            : isAdmin
              ? "CREATE EVENT"
              : "SUBMIT FOR REVIEW"}
        </Button>
      }
    >
      {!isAdmin && (
        <p className="retro mb-7 border-2 border-[#22c55e]/40 bg-[#22c55e]/[0.05] p-3 text-[10px] leading-relaxed text-muted-foreground">
          Heads up — your event goes to an admin for review before it&apos;s
          published.
        </p>
      )}

      <div className="grid gap-5">
        {/* ── 01 · DETAILS ── */}
        <SectionHeading>01 · DETAILS</SectionHeading>

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

        {/* [&>div]:min-w-0 lets each cell shrink to its track so the native
              datetime/number inputs (which have a wide intrinsic min-width)
              clip instead of overflowing the modal. */}
        <div className="grid grid-cols-2 gap-5 [&>div]:min-w-0">
          <div className="grid gap-2">
            <Label className="text-[10px]">TYPE</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger>
                <SelectValue placeholder="SELECT" />
              </SelectTrigger>
              <SelectContent className="z-[200] dark">
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {eventTypeLabel(t)}
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
          <div className="relative flex border-y-[4px] border-foreground dark:border-ring">
            <textarea
              id="ev-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's it about?"
              rows={4}
              className="retro w-full resize-none rounded-none bg-transparent px-3 py-2 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
            />
            <div
              className="pointer-events-none absolute inset-0 -mx-1 border-x-[4px] border-foreground dark:border-ring"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* ── 02 · AUDIENCE & CAPACITY ── */}
        <SectionHeading>02 · AUDIENCE &amp; CAPACITY</SectionHeading>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 [&>div]:min-w-0">
          <div className="grid gap-2">
            <Label className="text-[10px]">WHO CAN REGISTER</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger>
                <SelectValue placeholder="SELECT" />
              </SelectTrigger>
              <SelectContent className="z-[200] dark">
                {AUDIENCE_OPTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-cap" className="text-[10px]">
              CAPACITY (INF IF BLANK)
            </Label>
            <Input
              id="ev-cap"
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Unlimited"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-deadline" className="text-[10px]">
              REG. DEADLINE
            </Label>
            <Input
              id="ev-deadline"
              type="datetime-local"
              value={registrationDeadline}
              onChange={(e) => setRegistrationDeadline(e.target.value)}
              className="text-[10px]"
              style={{ colorScheme: "dark" }}
            />
          </div>
        </div>

        {/* ── 03 · BANNER ── */}
        <SectionHeading>03 · BANNER (16:9)</SectionHeading>
        <ImageCropUpload
          aspect={16 / 9}
          kind="event"
          value={bannerUrl}
          onChange={setBannerUrl}
        />

        {/* ── 04 · REGISTRATION FORM (Google-Forms-style builder) ── */}
        <SectionHeading>04 · REGISTRATION FORM</SectionHeading>
        <p className="retro -mt-1 text-[9px] leading-relaxed text-muted-foreground">
          Name &amp; email are always collected. Add your own questions below —
          registrants see them in order.
        </p>
        <FormBuilder
          value={schema}
          onChange={setSchema}
          audience={audience as EventAudience}
        />

        {/* ── 05 · DEPLOYMENT ── */}
        {isAdmin && (
          <>
            <SectionHeading>05 · DEPLOYMENT</SectionHeading>
            <div className="flex w-fit items-center gap-3">
              <PixelCheckbox
                checked={publishNow}
                onChange={setPublishNow}
                aria-label="Publish immediately"
              />
              <button
                type="button"
                onClick={() => setPublishNow(!publishNow)}
                className="retro cursor-pointer text-[10px] tracking-wider text-muted-foreground hover:text-white"
              >
                PUBLISH IMMEDIATELY
              </button>
            </div>
          </>
        )}
      </div>
    </PixelModal>
  );
}
