"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/8bit-toast";
import { PixelPanel } from "@/components/admin/PixelPanel";
import { ImageCropUpload } from "@/components/ui/ImageCropUpload";
import { FormBuilder } from "../_form/FormBuilder";
import type { FormFieldDef } from "@/lib/forms";

const ctl =
  "w-full bg-black border-2 border-white/15 px-4 py-3 text-xs font-mono text-white placeholder:text-zinc-700 focus:outline-none focus:border-[#22c55e] transition-colors disabled:opacity-50";
const labelCls =
  "retro mb-2 block text-[9px] tracking-widest text-[#22c55e]";

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
  const [schema, setSchema] = useState<FormFieldDef[]>(initial?.formSchema ?? []);
  const isEdit = !!eventId;

  const set = (k: keyof EventFormState, v: string) =>
    setF((prev) => ({ ...prev, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title || !f.eventDate) {
      toast.error("Title and date are required");
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
    <form onSubmit={submit} className="flex max-w-3xl flex-col gap-8">
      <PixelPanel title="01 · DETAILS">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelCls}>EVENT TITLE</label>
            <input
              className={ctl}
              value={f.title}
              placeholder="Enter title…"
              onChange={(e) => set("title", e.target.value)}
              disabled={isPending}
            />
          </div>
          <div>
            <label className={labelCls}>TYPE</label>
            <select
              className={`${ctl} appearance-none uppercase`}
              value={f.eventType}
              onChange={(e) => set("eventType", e.target.value)}
              disabled={isPending}
            >
              <option value="GENERAL_ASSEMBLY">GENERAL_ASSEMBLY</option>
              <option value="HACKATHON">HACKATHON</option>
              <option value="WORKSHOP">WORKSHOP</option>
              <option value="TECHNICAL_SEMINAR">TECHNICAL_SEMINAR</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>DATE &amp; TIME</label>
            <input
              type="datetime-local"
              className={ctl}
              value={f.eventDate}
              onChange={(e) => set("eventDate", e.target.value)}
              disabled={isPending}
            />
          </div>
          <div>
            <label className={labelCls}>LOCATION</label>
            <input
              className={ctl}
              value={f.location}
              placeholder="Room or URL…"
              onChange={(e) => set("location", e.target.value)}
              disabled={isPending}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className={labelCls}>DESCRIPTION</label>
          <textarea
            className={`${ctl} min-h-[140px] resize-none`}
            value={f.description}
            placeholder="What is this event about?"
            onChange={(e) => set("description", e.target.value)}
            disabled={isPending}
          />
        </div>
      </PixelPanel>

      <PixelPanel title="02 · AUDIENCE & CAPACITY">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className={labelCls}>WHO CAN REGISTER</label>
            <select
              className={`${ctl} appearance-none`}
              value={f.audience}
              onChange={(e) => set("audience", e.target.value)}
              disabled={isPending}
            >
              <option value="public">Anyone (public)</option>
              <option value="college">College only (USN required)</option>
              <option value="members">Members only</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>CAPACITY (BLANK = ∞)</label>
            <input
              type="number"
              min="1"
              className={ctl}
              value={f.capacity}
              placeholder="Unlimited"
              onChange={(e) => set("capacity", e.target.value)}
              disabled={isPending}
            />
          </div>
          <div>
            <label className={labelCls}>REG. DEADLINE (OPTIONAL)</label>
            <input
              type="datetime-local"
              className={ctl}
              value={f.registrationDeadline}
              onChange={(e) => set("registrationDeadline", e.target.value)}
              disabled={isPending}
            />
          </div>
        </div>
      </PixelPanel>

      <PixelPanel title="03 · BANNER">
        <label className={labelCls}>BANNER IMAGE (16:9)</label>
        <ImageCropUpload
          aspect={16 / 9}
          kind="event"
          value={f.bannerUrl}
          onChange={(url) => set("bannerUrl", url)}
        />
      </PixelPanel>

      <PixelPanel title="04 · REGISTRATION FORM">
        <FormBuilder value={schema} onChange={setSchema} />
      </PixelPanel>

      <PixelPanel title="05 · DEPLOYMENT">
        <label className={labelCls}>INITIAL STATE</label>
        <select
          className={`${ctl} appearance-none`}
          value={f.isPublished}
          onChange={(e) => set("isPublished", e.target.value)}
          disabled={isPending}
        >
          <option value="false">Save as draft (offline)</option>
          <option value="true">Publish immediately (live)</option>
        </select>
      </PixelPanel>

      <button
        type="submit"
        disabled={isPending}
        className="retro w-fit border-2 border-[#22c55e] px-6 py-3 text-[10px] text-[#22c55e] transition-colors hover:bg-[#22c55e] hover:text-black disabled:opacity-50"
      >
        {isPending
          ? isEdit
            ? "SAVING…"
            : "CREATING…"
          : isEdit
            ? "SAVE CHANGES"
            : "CREATE EVENT"}
      </button>
    </form>
  );
}
