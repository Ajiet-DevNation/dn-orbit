"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card } from "@/components/ui/8bit-card";
import { Label } from "@/components/ui/8bit-label";
import {
  validateSubmission,
  type EventAudience,
  type FormFieldDef,
} from "@/lib/forms";
import { PixelFormField } from "./PixelFormField";

const inputBase =
  "w-full bg-black border-2 border-white/15 px-4 py-3 text-xs font-mono text-white placeholder:text-zinc-700 focus:outline-none focus:border-[#22c55e] transition-colors disabled:opacity-50";

export function RegistrationForm({
  eventId,
  title,
  audience,
  closed,
  schema,
  prefill,
}: {
  eventId: string;
  title: string;
  audience: EventAudience;
  closed: boolean;
  schema: FormFieldDef[];
  prefill: { name: string; email: string } | null;
}) {
  const [name, setName] = useState(prefill?.name ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [usn, setUsn] = useState("");
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (closed) {
    return (
      <Shell title={title}>
        <p className="retro text-sm text-white/70">REGISTRATION IS CLOSED.</p>
        <Back />
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell title={title}>
        <span className="retro text-4xl text-[#22c55e]">✓</span>
        <p className="retro text-sm text-white">YOU&apos;RE REGISTERED!</p>
        <Back />
      </Shell>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const local = validateSubmission({ audience, schema, input: { name, email, usn, responses } });
    if (!local.ok) {
      setErrors(local.errors);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, usn, responses }),
      });
      if (res.status === 201) {
        setDone(true);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 422 && data.fields) {
        setErrors(data.fields);
        toast.error("Please fix the highlighted fields");
      } else {
        toast.error(data.error ?? "Registration failed");
      }
    } catch {
      toast.error("Network error — try again");
    } finally {
      setSubmitting(false);
    }
  };

  const emailLocked = audience === "members" && !!prefill;

  return (
    <Shell title={title}>
      <form onSubmit={submit} className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label className="retro text-[9px] tracking-widest text-[#22c55e]">NAME *</Label>
          <input className={inputBase} value={name} onChange={(e) => setName(e.target.value)} />
          {errors.name && <p className="retro text-[8px] text-red-400">{errors.name}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label className="retro text-[9px] tracking-widest text-[#22c55e]">EMAIL *</Label>
          <input
            className={inputBase}
            type="email"
            value={email}
            disabled={emailLocked}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && <p className="retro text-[8px] text-red-400">{errors.email}</p>}
        </div>
        {audience === "college" && (
          <div className="flex flex-col gap-2">
            <Label className="retro text-[9px] tracking-widest text-[#22c55e]">USN / COLLEGE ID *</Label>
            <input className={inputBase} value={usn} onChange={(e) => setUsn(e.target.value)} />
            {errors.usn && <p className="retro text-[8px] text-red-400">{errors.usn}</p>}
          </div>
        )}
        {schema.map((f) => (
          <PixelFormField
            key={f.id}
            field={f}
            value={responses[f.id]}
            error={errors[f.id]}
            onChange={(v) => setResponses((p) => ({ ...p, [f.id]: v }))}
          />
        ))}
        <button
          type="submit"
          disabled={submitting}
          className="retro mt-2 w-fit cursor-pointer border-2 border-[#22c55e] px-6 py-3 text-[10px] text-[#22c55e] transition-colors hover:bg-[#22c55e] hover:text-black disabled:opacity-50"
        >
          {submitting ? "SUBMITTING…" : "SUBMIT REGISTRATION"}
        </button>
      </form>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-6 py-28">
      <div className="flex flex-col gap-2">
        <span className="retro text-[9px] tracking-widest text-[#22c55e]">EVENT REGISTRATION</span>
        <h1 className="retro text-xl text-white">{title}</h1>
      </div>
      <Card className="flex flex-col items-start gap-4 border-white/10 p-8">{children}</Card>
    </div>
  );
}

function Back() {
  return (
    <Link href="/#events" className="retro text-[9px] text-[#22c55e] underline">
      ◂ BACK TO EVENTS
    </Link>
  );
}
