"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PixelPanel } from "@/components/admin/PixelPanel";
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
import { toast } from "@/components/ui/8bit-toast";
import { ImageCropUpload } from "@/components/ui/ImageCropUpload";
import {
  AUDIENCE_OPTIONS,
  type EventAudience,
  type FormFieldDef,
} from "@/lib/forms";
import { FormBuilder } from "../_form/FormBuilder";

const EVENT_TYPES = [
  "GENERAL_ASSEMBLY",
  "HACKATHON",
  "WORKSHOP",
  "TECHNICAL_SEMINAR",
];

interface EventFormState {
  title: string;
  eventType: string;
  description: string;
  eventDate: string;
  location: string;
  audience: string;
  capacity: string;
  registrationDeadline: string;
  bannerUrl: string;
  isPublished: string;
}

const DEFAULTS: EventFormState = {
  title: "",
  eventType: "WORKSHOP",
  description: "",
  eventDate: "",
  location: "",
  audience: "public",
  capacity: "",
  registrationDeadline: "",
  bannerUrl: "",
  isPublished: "false",
};

export default function EventCreationForm({
  eventId,
  initial,
}: {
  eventId?: string;
  initial?: Partial<EventFormState> & { formSchema?: FormFieldDef[] };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [f, setF] = useState<EventFormState>({ ...DEFAULTS, ...initial });
  const [schema, setSchema] = useState<FormFieldDef[]>(
    initial?.formSchema ?? [],
  );
  const isEdit = !!eventId;

  const set = (k: keyof EventFormState, v: string) =>
    setF((prev) => ({ ...prev, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title || !f.eventDate) {
      toast.error("Title and date are required");
      return;
    }
    if (schema.some((q) => !q.label.trim())) {
      toast.error("Every custom question needs a label");
      return;
    }
    startTransition(async () => {
      try {
        const payload = {
          title: f.title,
          eventType: f.eventType,
          description: f.description,
          eventDate: new Date(f.eventDate).toISOString(),
          location: f.location,
          audience: f.audience,
          capacity: f.capacity ? Number(f.capacity) : null,
          registrationDeadline: f.registrationDeadline
            ? new Date(f.registrationDeadline).toISOString()
            : null,
          bannerUrl: f.bannerUrl || null,
          formSchema: schema,
          isPublished: f.isPublished === "true",
        };
        const res = await fetch(
          isEdit ? `/api/events/${eventId}` : "/api/events",
          {
            method: isEdit ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        if (!res.ok) throw new Error(await res.text());
        toast.success(isEdit ? "Event updated" : "Event created");
        router.push("/admin/events");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save event",
        );
      }
    });
  };

  return (
    <form onSubmit={submit} className="flex max-w-6xl flex-col gap-8">
      <PixelPanel title="01 · DETAILS">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 [&>div]:min-w-0">
          <div className="grid gap-2">
            <Label className="text-[10px]">EVENT TITLE *</Label>
            <Input
              value={f.title}
              placeholder="Enter title…"
              onChange={(e) => set("title", e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-[10px]">TYPE</Label>
            <Select
              value={f.eventType}
              onValueChange={(v) => set("eventType", v)}
              disabled={isPending}
            >
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
            <Label className="text-[10px]">DATE &amp; TIME *</Label>
            <Input
              type="datetime-local"
              className="text-[10px]"
              style={{ colorScheme: "dark" }}
              value={f.eventDate}
              onChange={(e) => set("eventDate", e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-[10px]">LOCATION</Label>
            <Input
              value={f.location}
              placeholder="Room or URL…"
              onChange={(e) => set("location", e.target.value)}
              disabled={isPending}
            />
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <Label className="text-[10px]">DESCRIPTION</Label>
          {/* Multiline pixel-frame textarea — matches the 8bit Input border. */}
          <div className="relative flex border-y-[4px] border-foreground dark:border-ring">
            <textarea
              value={f.description}
              placeholder="What is this event about?"
              rows={5}
              onChange={(e) => set("description", e.target.value)}
              disabled={isPending}
              className="retro w-full resize-none rounded-none bg-transparent px-3 py-2 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
            />
            <div
              className="pointer-events-none absolute inset-0 -mx-1 border-x-[4px] border-foreground dark:border-ring"
              aria-hidden="true"
            />
          </div>
        </div>
      </PixelPanel>

      <PixelPanel title="02 · AUDIENCE & CAPACITY">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 [&>div]:min-w-0">
          <div className="grid gap-2">
            <Label className="text-[10px]">WHO CAN REGISTER</Label>
            <Select
              value={f.audience}
              onValueChange={(v) => set("audience", v)}
              disabled={isPending}
            >
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
            <Label className="text-[10px]">CAPACITY (INF IF BLANK)</Label>
            <Input
              type="number"
              min={1}
              value={f.capacity}
              placeholder="Unlimited"
              onChange={(e) => set("capacity", e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-[10px]">REG. DEADLINE</Label>
            <Input
              type="datetime-local"
              className="text-[10px]"
              style={{ colorScheme: "dark" }}
              value={f.registrationDeadline}
              onChange={(e) => set("registrationDeadline", e.target.value)}
              disabled={isPending}
            />
          </div>
        </div>
      </PixelPanel>

      <PixelPanel title="03 · BANNER">
        <Label className="mb-2 block text-[10px]">BANNER IMAGE (16:9)</Label>
        <ImageCropUpload
          aspect={16 / 9}
          kind="event"
          value={f.bannerUrl}
          onChange={(url) => set("bannerUrl", url)}
        />
      </PixelPanel>

      <PixelPanel title="04 · REGISTRATION FORM">
        <FormBuilder
          value={schema}
          onChange={setSchema}
          audience={f.audience as EventAudience}
        />
      </PixelPanel>

      <PixelPanel title="05 · DEPLOYMENT">
        <div className="grid gap-2">
          <Label className="text-[10px]">INITIAL STATE</Label>
          <Select
            value={f.isPublished}
            onValueChange={(v) => set("isPublished", v)}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[200] dark">
              <SelectItem value="false">SAVE AS DRAFT (OFFLINE)</SelectItem>
              <SelectItem value="true">PUBLISH IMMEDIATELY (LIVE)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PixelPanel>

      <Button type="submit" disabled={isPending} className="w-fit text-[10px]">
        {isPending
          ? isEdit
            ? "SAVING…"
            : "CREATING…"
          : isEdit
            ? "SAVE CHANGES"
            : "CREATE EVENT"}
      </Button>
    </form>
  );
}
