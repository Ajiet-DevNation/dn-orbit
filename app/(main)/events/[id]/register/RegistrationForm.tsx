"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "@/components/ui/8bit-toast";
import { Card } from "@/components/ui/8bit-card";
import { Button } from "@/components/ui/8bit-button";
import { Input } from "@/components/ui/8bit-input";
import {
  AUDIENCE_BADGE_LABELS,
  isFieldVisible,
  usnRequiredFor,
  validateSubmission,
  type EventAudience,
  type FormFieldDef,
} from "@/lib/forms";
import { PixelFormField } from "./PixelFormField";
import { FieldCard } from "./FieldCard";

export function RegistrationForm({
  eventId,
  title,
  audience,
  isMember,
  closed,
  schema,
  dateLabel,
  location,
  description,
  capacityLabel,
  prefill,
}: {
  eventId: string;
  title: string;
  audience: EventAudience;
  isMember: boolean;
  closed: boolean;
  schema: FormFieldDef[];
  dateLabel: string;
  location: string | null;
  description: string | null;
  capacityLabel: string | null;
  prefill: { name: string; email: string; usn?: string } | null;
}) {
  const meta: EventMeta = { audience, dateLabel, location, description, capacityLabel };
  const [name, setName] = useState(prefill?.name ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [usn, setUsn] = useState(prefill?.usn ?? "");
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  // Hidden (unmet-condition) fields are dropped by validateSubmission on both
  // client and server, so a stale answer is never submitted or stored — no
  // pruning needed here, and toggling back keeps a previously typed answer.

  if (closed) {
    return (
      <Shell title={title} meta={meta}>
        <Card className="w-full items-start gap-4 border-white/10 p-8">
          <p className="retro text-sm text-white/70">REGISTRATION IS CLOSED.</p>
        </Card>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell title={title} meta={meta}>
        <Card className="w-full items-center gap-4 border-[#22c55e]/30 p-10 text-center">
          <span className="retro text-4xl text-[#22c55e]">✓</span>
          <p className="retro text-sm text-white">YOU&apos;RE REGISTERED!</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            We&apos;ve saved your spot. See you there.
          </p>
        </Card>
      </Shell>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const local = validateSubmission({ audience, isMember, schema, input: { name, email, usn, responses } });
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
      toast.error("Network error · try again");
    } finally {
      setSubmitting(false);
    }
  };

  const emailLocked = isMember && !!prefill;
  const showUsn = usnRequiredFor(audience, isMember);
  // Members already gave their USN at onboarding — fill it from the account and
  // lock it, so they don't have to re-type it (same as email).
  const usnLocked = isMember && !!prefill?.usn;

  return (
    <Shell title={title} meta={meta}>
      <form onSubmit={submit} noValidate className="flex w-full flex-col gap-5">
        <FieldCard label="NAME" required error={errors.name}>
          <Input
            font="normal"
            value={name}
            autoComplete="name"
            placeholder="Your full name"
            aria-invalid={!!errors.name}
            onChange={(e) => setName(e.target.value)}
          />
        </FieldCard>

        <FieldCard
          label="EMAIL"
          required
          error={errors.email}
          description={emailLocked ? "Linked to your account." : undefined}
        >
          <Input
            font="normal"
            type="email"
            value={email}
            disabled={emailLocked}
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FieldCard>

        {showUsn && (
          <FieldCard
            label="USN / COLLEGE ID"
            required
            error={errors.usn}
            description={usnLocked ? "Linked to your account." : undefined}
          >
            <Input
              font="normal"
              value={usn}
              disabled={usnLocked}
              placeholder="e.g. 4JK24CS069"
              aria-invalid={!!errors.usn}
              onChange={(e) => setUsn(e.target.value)}
            />
          </FieldCard>
        )}

        {schema.map((f) =>
          isFieldVisible(f, responses) ? (
            <PixelFormField
              key={f.id}
              field={f}
              value={responses[f.id]}
              error={errors[f.id]}
              onChange={(v) => setResponses((p) => ({ ...p, [f.id]: v }))}
            />
          ) : null,
        )}

        <div className="mt-1 flex flex-col gap-3">
          <p className="retro text-[8px] tracking-widest text-muted-foreground">
            <span className="text-[#ef4444]">*</span> REQUIRED
          </p>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full text-[11px] !bg-[#22c55e] hover:!bg-[#16a34a] !text-black sm:w-fit sm:px-10"
          >
            {submitting ? "SUBMITTING…" : "SUBMIT REGISTRATION"}
          </Button>
        </div>
      </form>
    </Shell>
  );
}

type EventMeta = {
  audience: EventAudience;
  dateLabel: string;
  location: string | null;
  description: string | null;
  capacityLabel: string | null;
};

function Shell({
  title,
  meta,
  children,
}: {
  title: string;
  meta: EventMeta;
  children: React.ReactNode;
}) {
  const when = [meta.dateLabel, meta.location].filter(Boolean).join(" · ");
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-5 py-24 sm:gap-8 sm:px-6 sm:py-28">
      <Back />
      {/* Google-Forms-style header card: a green top accent bar + the event
          identity, sitting above the question cards. */}
      <div className="flex flex-col gap-3 border-2 border-white/10 border-t-[6px] border-t-[#22c55e] bg-[#0a0a0a] p-6 sm:p-8">
        <span className="retro text-[9px] tracking-widest text-[#22c55e]">EVENT REGISTRATION</span>
        <h1 className="retro text-lg leading-relaxed text-white sm:text-xl">{title}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <AudienceBadge audience={meta.audience} />
          {when && <p className="retro text-[10px] text-[#22c55e]">{when}</p>}
        </div>
        {meta.capacityLabel && (
          <p className="retro text-[9px] text-muted-foreground">{meta.capacityLabel}</p>
        )}
        {meta.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{meta.description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function AudienceBadge({ audience }: { audience: EventAudience }) {
  const label = AUDIENCE_BADGE_LABELS[audience];
  return (
    <span className="retro border-2 border-[#22c55e] px-2 py-1 text-[8px] text-[#22c55e]">
      {label}
    </span>
  );
}

function Back() {
  return (
    <Link
      href="/#events"
      className="retro flex w-fit items-center gap-2 text-[9px] text-[#22c55e] transition-colors duration-200 hover:text-white"
    >
      ◂ BACK TO EVENTS
    </Link>
  );
}
