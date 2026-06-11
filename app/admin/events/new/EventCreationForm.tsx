"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TacticalCard } from "@/components/ui/TacticalCard";
import { TacticalButton } from "@/components/ui/TacticalButton";

export default function EventCreationForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    title: "",
    eventType: "GENERAL_ASSEMBLY",
    description: "",
    eventDate: "",
    location: "",
    isPublished: "false", // Stored as string for the native select element
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.eventDate) {
      alert("SYSTEM_ERROR: TITLE_AND_DATE_STAMP_REQUIRED");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title,
            eventType: formData.eventType,
            description: formData.description,
            eventDate: new Date(formData.eventDate).toISOString(),
            location: formData.location,
            isPublished: formData.isPublished === "true",
          }),
        });

        if (!res.ok) throw new Error(await res.text());

        alert("UPLOAD_SUCCESS // EVENT_INJECTED_INTO_ARCHIVE");
        router.push("/admin/events");
        router.refresh();
      } catch (err) {
        alert(
          "UPLOAD_FAILURE // " +
            (err instanceof Error ? err.message : "UNKNOWN_ERROR"),
        );
      }
    });
  };

  return (
    <TacticalCard id="EVENT_GENERATOR" variant="dashed" className="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-12">
        {/* SECTION 01 */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black tracking-widest uppercase text-zinc-500 border-b border-zinc-900 pb-2">
            01_IDENTIFICATION
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black tracking-widest uppercase text-zinc-500 block mb-2">
                MISSION_TITLE
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="ENTER_IDENTIFIER..."
                className="w-full bg-black border border-zinc-800 px-4 py-3 text-xs font-mono text-white placeholder:text-zinc-700 placeholder:uppercase focus:outline-none focus:border-white transition-colors"
                disabled={isPending}
              />
            </div>
            <div>
              <label className="text-[9px] font-black tracking-widest uppercase text-zinc-500 block mb-2">
                EVENT_CLASSIFICATION
              </label>
              <select
                name="eventType"
                value={formData.eventType}
                onChange={handleChange}
                className="w-full bg-black border border-zinc-800 px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-white transition-colors appearance-none uppercase"
                disabled={isPending}
              >
                <option value="GENERAL_ASSEMBLY">GENERAL_ASSEMBLY</option>
                <option value="HACKATHON">HACKATHON</option>
                <option value="WORKSHOP">WORKSHOP</option>
                <option value="TECHNICAL_SEMINAR">TECHNICAL_SEMINAR</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 02 */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black tracking-widest uppercase text-zinc-500 border-b border-zinc-900 pb-2">
            02_LOGISTICAL_PARAMETERS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black tracking-widest uppercase text-zinc-500 block mb-2">
                DATE_STAMP
              </label>
              <input
                type="datetime-local"
                name="eventDate"
                value={formData.eventDate}
                onChange={handleChange}
                className="w-full bg-black border border-zinc-800 px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-white transition-colors"
                disabled={isPending}
              />
            </div>
            <div>
              <label className="text-[9px] font-black tracking-widest uppercase text-zinc-500 block mb-2">
                LOCATION_COORDS
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="PHYSICAL_ROOM_OR_URL..."
                className="w-full bg-black border border-zinc-800 px-4 py-3 text-xs font-mono text-white placeholder:text-zinc-700 placeholder:uppercase focus:outline-none focus:border-white transition-colors"
                disabled={isPending}
              />
            </div>
          </div>
        </div>

        {/* SECTION 03 */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black tracking-widest uppercase text-zinc-500 border-b border-zinc-900 pb-2">
            03_MISSION_BRIEFING
          </h3>
          <div>
            <label className="text-[9px] font-black tracking-widest uppercase text-zinc-500 block mb-2">
              FULL_DESCRIPTION
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="INPUT_MISSION_PARAMETERS_AND_REQUIREMENTS..."
              className="w-full bg-black border border-zinc-800 px-4 py-3 text-xs font-mono text-white placeholder:text-zinc-700 placeholder:uppercase focus:outline-none focus:border-white transition-colors min-h-[160px] resize-none"
              disabled={isPending}
            />
          </div>
        </div>

        {/* SECTION 04 */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black tracking-widest uppercase text-zinc-500 border-b border-zinc-900 pb-2">
            04_DEPLOYMENT_CONFIG
          </h3>
          <div>
            <label className="text-[9px] font-black tracking-widest uppercase text-zinc-500 block mb-2">
              INITIAL_STATE
            </label>
            <select
              name="isPublished"
              value={formData.isPublished}
              onChange={handleChange}
              className="w-full bg-black border border-zinc-800 px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-white transition-colors appearance-none uppercase"
              disabled={isPending}
            >
              <option value="false">SAVE_AS_DRAFT (OFFLINE)</option>
              <option value="true">PUBLISH_IMMEDIATELY (LIVE)</option>
            </select>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-900 flex justify-end">
          <TacticalButton variant="primary" disabled={isPending}>
            {isPending ? "INJECTING_DATA..." : "EXECUTE_CREATION"}
          </TacticalButton>
        </div>
      </form>
    </TacticalCard>
  );
}
