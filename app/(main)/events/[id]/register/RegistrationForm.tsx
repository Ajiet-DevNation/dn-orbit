"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/8bit-button";
import { Card } from "@/components/ui/8bit-card";
import { Input } from "@/components/ui/8bit-input";
import { toast } from "@/components/ui/8bit-toast";
import { PixelArrow, PixelCheck } from "@/components/ui/PixelIcons";
import {
  AUDIENCE_BADGE_LABELS,
  type EventAudience,
  type FormFieldDef,
  isFieldVisible,
  usnRequiredFor,
  validateSubmission,
} from "@/lib/forms";
import { smoothScrollTo } from "@/lib/smooth-scroll";
import {
  TEAM_ERROR_KEYS,
  type TeamChoice,
  validateTeamChoice,
} from "@/lib/teams";
import { FieldCard } from "./FieldCard";
import { PixelFormField } from "./PixelFormField";
import {
  AlreadyRegistered,
  type ExistingRegistration,
  type TeamAction,
  TeamDone,
  type TeamInfo,
  type TeamResult,
  TeamStep,
} from "./TeamStep";

export function RegistrationForm({
  eventId,
  title,
  audience,
  isMember,
  closed,
  schema,
  existing,
  team,
  dateLabel,
  timeLabel,
  location,
  description,
  capacityLabel,
  deadlineLabel,
  prefill,
}: {
  eventId: string;
  title: string;
  audience: EventAudience;
  isMember: boolean;
  closed: boolean;
  schema: FormFieldDef[];
  /** This browser's (or account's) registration, if any. On a team event
   *  without a team yet, the page opens on the team step. */
  existing: ExistingRegistration | null;
  /** Team rules for a team event; null for individual sign-up. */
  team: TeamInfo | null;
  dateLabel: string;
  timeLabel: string;
  location: string | null;
  description: string | null;
  capacityLabel: string | null;
  deadlineLabel: string | null;
  prefill: { name: string; email: string; usn?: string } | null;
}) {
  const meta: EventMeta = {
    audience,
    dateLabel,
    timeLabel,
    location,
    description,
    capacityLabel,
    deadlineLabel,
  };
  const [name, setName] = useState(prefill?.name ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [usn, setUsn] = useState(prefill?.usn ?? "");
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Editing a field clears its error; the full check runs again on submit.
  const clearError = (key: string) =>
    setErrors((p) => {
      if (!(key in p)) return p;
      const { [key]: _, ...rest } = p;
      return rest;
    });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  // Team events take two saves: step 1 registers the person, step 2 puts them
  // in a team. Once step 1 is saved (now, or on an earlier visit) this holds
  // who registered, and the page shows step 2.
  const [registered, setRegistered] = useState<{
    name: string;
    matchValue: string | null;
  } | null>(
    existing && !existing.team
      ? { name: existing.name, matchValue: existing.matchValue }
      : null,
  );
  const step: "details" | "team" = team && registered ? "team" : "details";
  const [teamAction, setTeamAction] = useState<TeamAction | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [teamResult, setTeamResult] = useState<TeamResult | null>(null);
  // After step 1 saves, bring the step 2 heading into view and focus it so
  // screen readers announce it.
  const stepHeading = useRef<HTMLParagraphElement>(null);
  const focusStepHeading = () =>
    requestAnimationFrame(() => {
      const el = stepHeading.current;
      if (!el) return;
      smoothScrollTo(el);
      el.focus({ preventScroll: true });
    });
  // Hidden (unmet-condition) fields are dropped by validateSubmission on both
  // client and server, so a stale answer is never submitted or stored — no
  // pruning needed here, and toggling back keeps a previously typed answer.

  if (done && teamResult && team) {
    return (
      <Shell title={title} meta={meta}>
        <TeamDone result={teamResult} team={team} />
      </Shell>
    );
  }

  // Already registered (and, on a team event, already in a team): show that
  // instead of the form.
  if (existing && !done && (!team || existing.team)) {
    return (
      <Shell title={title} meta={meta}>
        <AlreadyRegistered registration={existing} team={team} />
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell title={title} meta={meta}>
        <Card className="w-full items-center gap-4 border-brand/30 p-10 text-center">
          <PixelCheck className="text-4xl text-brand-light" />
          <p className="retro text-sm text-white">YOU&apos;RE REGISTERED!</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            We&apos;ve saved your spot. See you there.
          </p>
        </Card>
      </Shell>
    );
  }

  if (closed) {
    return (
      <Shell title={title} meta={meta}>
        <Card className="w-full items-start gap-4 border-white/10 p-8">
          <p className="retro text-sm text-white/70">REGISTRATION IS CLOSED.</p>
          {registered && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              You registered as {registered.name} but aren&apos;t in a team.
              Contact the organizers.
            </p>
          )}
        </Card>
      </Shell>
    );
  }

  /** Shows the server's field errors, or its message when it sent none. */
  const showServerError = (
    status: number,
    data: { error?: string; fields?: Record<string, string> },
    fallback: string,
  ) => {
    if (data.fields && Object.keys(data.fields).length > 0) {
      setErrors(data.fields);
      toast.error(
        status === 422
          ? "Please fix the highlighted fields"
          : (data.error ?? fallback),
      );
    } else {
      toast.error(data.error ?? fallback);
    }
  };

  // Step 1 (or the only step): save the registrant.
  const submitDetails = async () => {
    const local = validateSubmission({
      audience,
      isMember,
      schema,
      input: { name, email, usn, responses },
    });
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
        if (team) {
          const v = team.matchFieldId ? responses[team.matchFieldId] : null;
          setRegistered({ name, matchValue: v == null ? null : String(v) });
          focusStepHeading();
        } else {
          setDone(true);
        }
        return;
      }
      showServerError(
        res.status,
        await res.json().catch(() => ({})),
        "Registration failed",
      );
    } catch {
      toast.error("Network error · try again");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: create a team or join one.
  const submitTeam = async () => {
    const choice: TeamChoice | null =
      teamAction === "create"
        ? { action: "create", name: teamName }
        : teamAction === "join"
          ? { action: "join", code: teamCode }
          : null;
    const checked = validateTeamChoice(choice);
    if (!checked.ok) {
      setErrors(checked.errors);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checked.value),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.team) {
        setTeamResult(data.team);
        setDone(true);
        return;
      }
      showServerError(res.status, data, "Couldn't save your team");
    } catch {
      toast.error("Network error · try again");
    } finally {
      setSubmitting(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void (step === "team" ? submitTeam() : submitDetails());
  };

  const emailLocked = isMember && !!prefill;
  const showUsn = usnRequiredFor(audience, isMember);
  // Members already gave their USN at onboarding — fill it from the account and
  // lock it, so they don't have to re-type it (same as email).
  const usnLocked = isMember && !!prefill?.usn;

  return (
    <Shell title={title} meta={meta}>
      <form onSubmit={submit} noValidate className="flex w-full flex-col gap-5">
        {team && (
          <div className="flex flex-col gap-2">
            <p
              ref={stepHeading}
              tabIndex={-1}
              className="retro scroll-mt-28 text-[9px] tracking-widest text-brand-light outline-none"
            >
              {step === "details"
                ? "STEP 1 OF 2 · YOUR DETAILS"
                : "STEP 2 OF 2 · YOUR TEAM"}
            </p>
            {registered && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Registered as {registered.name}. Your details are saved; now
                create a team or join one.
              </p>
            )}
          </div>
        )}
        {step === "team" && team ? (
          <TeamStep
            team={team}
            matchValue={registered?.matchValue ?? null}
            action={teamAction}
            onAction={(a) => {
              setTeamAction(a);
              clearError(TEAM_ERROR_KEYS.choice);
            }}
            teamName={teamName}
            onTeamName={(v) => {
              setTeamName(v);
              clearError(TEAM_ERROR_KEYS.name);
            }}
            teamCode={teamCode}
            onTeamCode={(v) => {
              setTeamCode(v);
              clearError(TEAM_ERROR_KEYS.code);
            }}
            errors={errors}
          />
        ) : (
          <>
            <FieldCard
              htmlFor="reg-name"
              label="NAME"
              required
              error={errors.name}
            >
              <Input
                id="reg-name"
                value={name}
                autoComplete="name"
                placeholder="Your full name"
                aria-invalid={!!errors.name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError("name");
                }}
              />
            </FieldCard>

            <FieldCard
              htmlFor="reg-email"
              label="EMAIL"
              required
              error={errors.email}
              description={emailLocked ? "Linked to your account." : undefined}
            >
              <Input
                id="reg-email"
                type="email"
                value={email}
                disabled={emailLocked}
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError("email");
                }}
              />
            </FieldCard>

            {showUsn && (
              <FieldCard
                htmlFor="reg-usn"
                label="USN / COLLEGE ID"
                required
                error={errors.usn}
                description={usnLocked ? "Linked to your account." : undefined}
              >
                <Input
                  id="reg-usn"
                  value={usn}
                  disabled={usnLocked}
                  placeholder="e.g. 4JK24CS069"
                  aria-invalid={!!errors.usn}
                  onChange={(e) => {
                    setUsn(e.target.value);
                    clearError("usn");
                  }}
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
                  onChange={(v) => {
                    setResponses((p) => ({ ...p, [f.id]: v }));
                    clearError(f.id);
                  }}
                />
              ) : null,
            )}
          </>
        )}

        <div className="mt-1 flex flex-col gap-3">
          <p className="retro text-[9px] tracking-[0.14em] text-muted-foreground">
            <span className="text-brand-light">*</span> REQUIRED
          </p>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full text-[11px] !bg-brand hover:!bg-brand-light !text-black sm:w-fit sm:px-10"
          >
            {submitting
              ? "SAVING…"
              : !team
                ? "SUBMIT REGISTRATION"
                : step === "details"
                  ? "SAVE & PICK YOUR TEAM"
                  : teamAction === "join"
                    ? "JOIN TEAM"
                    : teamAction === "create"
                      ? "CREATE TEAM"
                      : "CONFIRM TEAM"}
            {team && step === "details" && !submitting && <PixelArrow />}
          </Button>
        </div>
      </form>
    </Shell>
  );
}

type EventMeta = {
  audience: EventAudience;
  dateLabel: string;
  timeLabel: string;
  location: string | null;
  description: string | null;
  capacityLabel: string | null;
  deadlineLabel: string | null;
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
  const when = [meta.dateLabel, meta.timeLabel, meta.location]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-5 py-24 sm:gap-8 sm:px-6 sm:py-28">
      <Back />
      {/* Google-Forms-style header card: a purple top accent bar + the event
          identity, sitting above the question cards. */}
      <div className="flex flex-col gap-3 border-2 border-white/10 border-t-[6px] border-t-brand bg-[#0a0a0a] p-6 sm:p-8">
        <span className="retro text-[9px] tracking-widest text-brand-light">
          EVENT REGISTRATION
        </span>
        <h1 className="retro text-lg leading-relaxed text-white sm:text-xl">
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <AudienceBadge audience={meta.audience} />
          {when && <p className="retro text-[10px] text-brand-light">{when}</p>}
        </div>
        {meta.capacityLabel && (
          <p className="retro text-[9px] text-muted-foreground">
            {meta.capacityLabel}
          </p>
        )}
        {/* Mirrors the REGISTER BY row on the home-page detail panel, so the
            deadline the organizer set is visible on the page where it binds. */}
        {meta.deadlineLabel && (
          <p className="retro text-[9px] text-muted-foreground">
            REGISTER BY {meta.deadlineLabel}
          </p>
        )}
        {meta.description && (
          // pre-line: organizers write these in a textarea (bullets, breaks).
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {meta.description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function AudienceBadge({ audience }: { audience: EventAudience }) {
  const label = AUDIENCE_BADGE_LABELS[audience];
  return (
    <span className="retro border-2 border-brand px-2 py-1 text-[8px] text-brand-light">
      {label}
    </span>
  );
}

function Back() {
  return (
    <Link
      href="/#events"
      // 14px of text; the pseudo-element grows the hit area to 44px tall
      // without moving the layout (same trick as the 8-bit Button).
      className="retro relative flex w-fit items-center gap-2 text-[9px] text-brand-light transition-colors duration-200 before:absolute before:-inset-x-2 before:-inset-y-[15px] before:content-[''] hover:text-white"
    >
      <PixelArrow dir="left" /> BACK TO EVENTS
    </Link>
  );
}
