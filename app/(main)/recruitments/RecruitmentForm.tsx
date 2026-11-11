"use client";

import Link from "next/link";
import { useCallback, useRef, useState, ViewTransition } from "react";
import {
  RECRUIT_CARD_TRANSITION,
  RECRUIT_MORPH,
} from "@/components/home/RecruitmentBanner";
import { Button } from "@/components/ui/8bit-button";
import {
  FIELD_ERROR,
  FIELD_FRAME,
  FIELD_FRAME_SIDES,
  Input,
} from "@/components/ui/8bit-input";
import { Label } from "@/components/ui/8bit-label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/8bit-select";
import { Textarea } from "@/components/ui/8bit-textarea";
import { toast } from "@/components/ui/8bit-toast";
import { PixelFrame } from "@/components/ui/PixelFrame";
import { PixelArrow } from "@/components/ui/PixelIcons";
import { useSpriteSheet } from "@/hooks/useSpriteSheet";
import {
  ABOUT_MAX_WORDS,
  BRANCHES,
  CV_MAX_BYTES,
  countWords,
  fieldErrors,
  isValidYear,
  type RecruitmentApplicationInput,
  recruitmentApplicationSchema,
  yearsFor,
} from "@/lib/recruitment";
import { loopFrame } from "@/lib/sprite";
import { cn } from "@/lib/utils";
import { MissionProgress } from "./MissionProgress";
import { RecruitHeaderCard, SignalBars, type Step } from "./RecruitHeaderCard";

type Key = keyof RecruitmentApplicationInput;
type Values = Record<Key, string>;

const EMPTY: Values = {
  name: "",
  email: "",
  usn: "",
  branch: "",
  year: "",
  whatsapp: "",
  about: "",
  githubUsername: "",
  lcUsername: "",
  linkedinUrl: "",
  xHandle: "",
};

const FIELDS: Record<
  Key,
  {
    label: string;
    required?: boolean;
    type?: string;
    placeholder?: string;
    autoComplete?: string;
    /** Spans both columns of the section grid. */
    wide?: boolean;
  }
> = {
  name: {
    label: "FULL NAME",
    required: true,
    placeholder: "Your full name",
    autoComplete: "name",
    wide: true,
  },
  branch: { label: "BRANCH", required: true },
  year: { label: "YEAR OF STUDY", required: true },
  usn: {
    label: "USN",
    required: true,
    placeholder: "e.g. 4JK24CS069",
    wide: true,
  },
  email: {
    label: "EMAIL",
    required: true,
    type: "email",
    placeholder: "you@example.com",
    autoComplete: "email",
  },
  whatsapp: {
    label: "WHATSAPP NUMBER",
    required: true,
    type: "tel",
    placeholder: "+91 98765 43210",
    autoComplete: "tel",
  },
  githubUsername: {
    label: "GITHUB USERNAME",
    required: true,
    placeholder: "octocat",
  },
  lcUsername: {
    label: "LEETCODE USERNAME",
    required: true,
    placeholder: "your-leetcode-id",
  },
  linkedinUrl: {
    label: "LINKEDIN",
    type: "url",
    placeholder: "https://linkedin.com/in/you",
  },
  xHandle: { label: "X (TWITTER)", placeholder: "@handle" },
  about: {
    label: `TELL US ABOUT YOURSELF (MAX ${ABOUT_MAX_WORDS} WORDS)`,
    required: true,
    wide: true,
  },
};

// Grouping replaces the old one-card-per-field stack: four panels, two columns.
// `cv` marks the panel that also carries the (non-text) CV upload.
const SECTIONS: { title: string; keys: Key[]; cv?: true }[] = [
  { title: "ABOUT YOU", keys: ["name", "branch", "year", "usn"] },
  { title: "CONTACT", keys: ["email", "whatsapp"] },
  {
    title: "PROFILES & CV",
    keys: ["githubUsername", "lcUsername", "linkedinUrl", "xHandle"],
    cv: true,
  },
  { title: "IN YOUR WORDS", keys: ["about"] },
];

// Review read-back: the form's label style, dimmed, above each answer.
const REVIEW_LABEL =
  "retro text-[10px] leading-relaxed tracking-[0.14em] text-muted-foreground";

const REQUIRED = (Object.keys(FIELDS) as Key[]).filter(
  (k) => FIELDS[k].required,
);

export function RecruitmentForm({ open }: { open: boolean }) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [cv, setCv] = useState<File | null>(null);

  // Editing a field clears its error; the full check runs again on REVIEW.
  const set = (key: Key) => (v: string) => {
    setValues((p) => {
      const next = { ...p, [key]: v };
      // switching to a 2-year course drops a year it doesn't have
      if (key === "branch" && p.year && !isValidYear(v, Number(p.year)))
        next.year = "";
      return next;
    });
    setErrors((p) => {
      if (!(key in p)) return p;
      const { [key]: _, ...rest } = p;
      return rest;
    });
  };

  // Checked on pick so a bad file never reaches review. The server re-checks
  // the actual bytes; this only catches the obvious cases early.
  const pickCv = (file: File | null) => {
    const problem = !file
      ? undefined
      : file.type !== "application/pdf"
        ? "CV must be a PDF"
        : file.size > CV_MAX_BYTES
          ? "CV must be 2 MB or less"
          : undefined;
    setErrors(({ cv: _, ...rest }) =>
      problem ? { ...rest, cv: problem } : rest,
    );
    setCv(problem ? null : file);
  };

  if (!open) {
    return (
      <Layout step={null}>
        <StatusCard
          title="RECRUITMENT IS CLOSED"
          body="We're not taking applications right now. Keep an eye on the home page for the next drive."
        />
      </Layout>
    );
  }

  if (step === "done") {
    return (
      <Layout step="done">
        <StatusCard
          title="APPLICATION SENT!"
          body="Thanks for applying. The team will review it and reach out on WhatsApp or email."
          celebrate
        />
      </Layout>
    );
  }

  // Keyboard and screen-reader users land on the first field to fix, after
  // the errors have rendered.
  const focusFirstError = () =>
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>('form [aria-invalid="true"]')
        ?.focus(),
    );

  const review = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = recruitmentApplicationSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      toast.error("Please fix the highlighted fields");
      focusFirstError();
      return;
    }
    setErrors({});
    setStep("review");
    window.scrollTo({ top: 0 });
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      // Multipart so the optional CV travels with the application. No
      // Content-Type header: the browser sets it with the form boundary.
      const body = new FormData();
      body.set("data", JSON.stringify(values));
      if (cv) body.set("cv", cv);
      const res = await fetch("/api/recruitments", { method: "POST", body });
      if (res.status === 201) {
        setStep("done");
        window.scrollTo({ top: 0 });
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 422 && data.fields) {
        setErrors(data.fields);
        setStep("form");
        toast.error("Please fix the highlighted fields");
        focusFirstError();
      } else {
        toast.error(data.error ?? "Could not submit your application");
      }
    } catch {
      toast.error("Network error · try again");
    } finally {
      setSubmitting(false);
    }
  };

  const filled = REQUIRED.filter((k) => values[k].trim()).length;

  if (step === "review") {
    // Read back what will be stored (USN uppercased, email lowercased, "@"
    // dropped from the X handle), not the raw keystrokes. review() already
    // proved the parse succeeds.
    const parsed = recruitmentApplicationSchema.safeParse(values);
    const shown = parsed.success ? parsed.data : values;
    return (
      <Layout step="review" filled={filled}>
        {SECTIONS.map((s, i) => (
          <Panel key={s.title} index={i + 1} title={s.title}>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {s.keys.map((k) => (
                <div
                  key={k}
                  className={cn(
                    "flex flex-col gap-1",
                    FIELDS[k].wide && "sm:col-span-2",
                  )}
                >
                  <dt className={REVIEW_LABEL}>
                    {k === "about" ? "ABOUT YOU" : FIELDS[k].label}
                  </dt>
                  <dd className="whitespace-pre-wrap break-words font-mono text-sm text-white">
                    {String(shown[k] ?? "").trim() || "—"}
                  </dd>
                </div>
              ))}
              {s.cv && (
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <dt className={REVIEW_LABEL}>CV</dt>
                  <dd className="break-all font-mono text-sm text-white">
                    {cv ? cv.name : "—"}
                  </dd>
                </div>
              )}
            </dl>
          </Panel>
        ))}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => setStep("form")}
            className="text-[11px] sm:px-8"
          >
            <PixelArrow dir="left" /> EDIT
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={submit}
            className="text-[11px] !bg-brand hover:!bg-brand-light !text-black sm:px-10"
          >
            {submitting ? "SUBMITTING…" : "SUBMIT APPLICATION"}
          </Button>
        </div>
      </Layout>
    );
  }

  const control = (k: Key) => {
    const id = `rec-${k}`;
    const invalid = !!errors[k];
    const describedBy = invalid ? `${id}-error` : undefined;
    if (k === "branch" || k === "year") {
      const options =
        k === "branch"
          ? BRANCHES.map((b) => ({ value: b, label: b }))
          : yearsFor(values.branch).map((y) => ({
              value: String(y),
              label: `YEAR ${y}`,
            }));
      return (
        <Select value={values[k]} onValueChange={set(k)}>
          <SelectTrigger
            id={id}
            aria-invalid={invalid}
            aria-describedby={describedBy}
          >
            <SelectValue
              placeholder={k === "branch" ? "Select branch" : "Select year"}
            />
          </SelectTrigger>
          <SelectContent className="z-[200] dark">
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    if (k === "about") {
      const words = countWords(values.about);
      return (
        <>
          <Textarea
            id={id}
            value={values.about}
            placeholder="I am a…"
            aria-invalid={invalid}
            aria-describedby={describedBy}
            onChange={(e) => set("about")(e.target.value)}
            rows={6}
            className="[&_textarea]:min-h-[160px]"
          />
          <p
            className={cn(
              "text-right font-mono text-xs",
              words > ABOUT_MAX_WORDS
                ? "text-[#ef4444]"
                : "text-muted-foreground",
            )}
          >
            {words} / {ABOUT_MAX_WORDS} WORDS
          </p>
        </>
      );
    }
    const f = FIELDS[k];
    return (
      <Input
        id={id}
        type={f.type ?? "text"}
        value={values[k]}
        autoComplete={f.autoComplete}
        placeholder={f.placeholder}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onChange={(e) => set(k)(e.target.value)}
      />
    );
  };

  return (
    <Layout step="form" filled={filled}>
      <form onSubmit={review} noValidate className="flex flex-col gap-6">
        {SECTIONS.map((s, i) => (
          <Panel key={s.title} index={i + 1} title={s.title}>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              {s.keys.map((k) => (
                <Field
                  key={k}
                  id={`rec-${k}`}
                  label={FIELDS[k].label}
                  required={FIELDS[k].required}
                  error={errors[k]}
                  wide={FIELDS[k].wide}
                >
                  {control(k)}
                </Field>
              ))}
              {s.cv && (
                <Field
                  id="rec-cv"
                  label="CV (PDF, MAX 2 MB)"
                  error={errors.cv}
                  wide
                >
                  <CvPicker file={cv} onPick={pickCv} />
                </Field>
              )}
            </div>
          </Panel>
        ))}

        {/* Phones: the row sticks to the bottom and carries the progress the
            desktop rail shows, so it stays in view the whole way down. */}
        <div className="sticky bottom-0 z-10 -mx-5 flex flex-col gap-3 border-t-2 border-brand/30 bg-black/95 px-5 py-4 sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
          <div className="flex items-center gap-3 lg:hidden">
            <div
              role="progressbar"
              aria-label="Required fields completed"
              aria-valuemin={0}
              aria-valuemax={REQUIRED.length}
              aria-valuenow={filled}
              className="flex flex-1 gap-[2px] border-2 border-brand bg-brand p-[2px] sm:w-40 sm:flex-none"
            >
              {REQUIRED.map((k, i) => (
                <span
                  key={k}
                  className={cn(
                    "h-2 flex-1",
                    i < filled ? "bg-brand-light" : "bg-[#1a1838]",
                  )}
                />
              ))}
            </div>
            <span className="retro whitespace-nowrap text-[9px] text-brand-light">
              {filled} / {REQUIRED.length}
            </span>
          </div>
          <p className="retro hidden text-[9px] tracking-[0.14em] text-muted-foreground lg:block">
            <span className="text-brand-light">*</span> REQUIRED
          </p>
          <Button
            type="submit"
            className="w-full text-[11px] !bg-brand hover:!bg-brand-light !text-black sm:w-fit sm:px-10"
          >
            REVIEW INFORMATION <PixelArrow />
          </Button>
        </div>
      </form>
    </Layout>
  );
}

// Hero card across the top, then two columns on desktop: a sticky rail (mission
// progress, how it works) on the left, the form on the right. Phones get one
// column with the rail's extras hidden.
function Layout({
  step,
  filled,
  children,
}: {
  step: Step | null;
  filled?: number;
  children: React.ReactNode;
}) {
  return (
    // Arriving from the landing page's RECRUITING strip, the page rises in
    // under the card's morph; leaving by BACK TO ORBIT it fades out fast.
    // Every other navigation leaves it alone (default="none").
    <ViewTransition
      enter={{ "recruit-in": "recruit-rise", default: "none" }}
      exit={{ "recruit-out": "recruit-sink", default: "none" }}
      default="none"
    >
      <div className="mx-auto w-full max-w-6xl px-5 pt-6 pb-24 sm:px-6 sm:pt-8 sm:pb-28">
        <Link
          href="/"
          transitionTypes={["recruit-out"]}
          // 14px of text; the pseudo-element grows the hit area to 44px tall
          // without moving the layout (same trick as the 8-bit Button).
          className="retro relative flex w-fit items-center gap-2 text-[9px] text-brand-light transition-colors duration-200 before:absolute before:-inset-x-2 before:-inset-y-[15px] before:content-[''] hover:text-white"
        >
          <PixelArrow dir="left" /> BACK TO ORBIT
        </Link>
        {/* Full width, like the mock: the rail is too narrow for this card. */}
        <ViewTransition
          name={RECRUIT_CARD_TRANSITION}
          share={RECRUIT_MORPH}
          default="none"
        >
          <div className="mt-6">
            <RecruitHeaderCard current={step} />
          </div>
        </ViewTransition>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-10">
          <aside className="flex flex-col gap-6 lg:sticky lg:top-28 lg:col-span-2 lg:self-start">
            {filled !== undefined && (
              // Desktop only, like before: on phones the form should start fast.
              <div className="hidden lg:block">
                <MissionProgress filled={filled} total={REQUIRED.length} />
              </div>
            )}
            <PixelFrame className="hidden lg:block">
              <div className="flex flex-col gap-4 px-1 py-1">
                <span className="retro flex items-center gap-2.5 text-[9px] tracking-widest text-white">
                  <SignalBars />
                  HOW IT WORKS
                </span>
                <ol className="flex flex-col gap-3">
                  {[
                    "Fill in the form and review your answers.",
                    "The core team reviews every application.",
                    "We reach out on WhatsApp or email.",
                  ].map((text, i) => (
                    <li key={text} className="flex gap-3">
                      <span className="retro shrink-0 text-[9px] leading-5 text-brand-light">
                        0{i + 1}
                      </span>
                      <span className="text-xs leading-5 text-[#bdb8d9]">
                        {text}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </PixelFrame>
          </aside>

          <div className="flex flex-col gap-6 lg:col-span-3">{children}</div>
        </div>
      </div>
    </ViewTransition>
  );
}

function Panel({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-2 border-brand/25 bg-[#0a0a0a] transition-colors duration-200 focus-within:border-brand/70">
      <header className="flex items-center gap-3 border-b-2 border-brand/20 bg-brand/[0.06] px-5 py-3 sm:px-6">
        <span className="retro text-[9px] text-brand-light">0{index}</span>
        <h2 className="retro text-[9px] tracking-widest text-white/80">
          {"// "}
          {title}
        </h2>
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

// Borderless field: the section panel is the card now, so each field is just a
// label, the control and an inline error. Label style matches FieldCard.
function Field({
  id,
  label,
  required,
  error,
  wide,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-3", wide && "sm:col-span-2")}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-brand-light">*</span>}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} className={FIELD_ERROR}>
          {error}
        </p>
      )}
    </div>
  );
}

// Pixel-styled file picker. The real <input type="file"> stays in the DOM
// (sr-only) so keyboard focus, the native dialog and the label all still work.
function CvPicker({
  file,
  onPick,
}: {
  file: File | null;
  onPick: (file: File | null) => void;
}) {
  // Same frame and height as every other field: the file name sits where typed
  // text would, and the actions are segments joined on the right edge, split
  // off by the frame's own 4px bar (which turns purple with it on focus).
  const segment =
    "retro flex shrink-0 cursor-pointer items-center border-l-4 border-ring px-4 text-[8px] transition-colors duration-150 group-focus-within/field:border-brand group-has-[[aria-invalid=true]]/field:border-[#ef4444]";
  return (
    <div className={cn(FIELD_FRAME, "h-11 items-stretch dark:bg-input/30")}>
      <span
        className={cn(
          "flex min-w-0 flex-1 items-center px-3.5 font-mono text-base md:text-sm",
          file ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <span className="truncate">
          {file ? file.name : "Optional · no file chosen"}
        </span>
        {file && (
          <span className="ml-2 shrink-0 text-muted-foreground">
            {(file.size / 1024).toFixed(0)} KB
          </span>
        )}
      </span>
      {file && (
        <button
          type="button"
          onClick={() => onPick(null)}
          className={cn(
            segment,
            "text-[#f87171] hover:bg-[#ef4444]/15 focus-visible:bg-[#ef4444]/15 focus-visible:outline-none",
          )}
        >
          REMOVE
        </button>
      )}
      <label
        className={cn(
          segment,
          "text-brand-light hover:bg-brand hover:text-[#0a0a0a] has-[:focus-visible]:bg-brand has-[:focus-visible]:text-[#0a0a0a]",
        )}
      >
        {file ? "CHANGE PDF" : "CHOOSE PDF"}
        <input
          id="rec-cv"
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={(e) => {
            onPick(e.target.files?.[0] ?? null);
            // Reset so re-picking the same file after REMOVE fires onChange.
            e.target.value = "";
          }}
        />
      </label>
      <div className={FIELD_FRAME_SIDES} aria-hidden="true" />
    </div>
  );
}

// Pluton's flag-hop sheet, reused from the progress walkway.
const JUMP_FRAMES = 9;

// Closed / sent screen: the purple pixel frame, and on success Pluton hopping
// with his flag. Sprite steps on rAF; reduced motion holds frame 0.
function StatusCard({
  title,
  body,
  celebrate = false,
}: {
  title: string;
  body: string;
  celebrate?: boolean;
}) {
  const spriteRef = useRef<HTMLDivElement>(null);
  const frameAt = useCallback((t: number) => loopFrame(t, JUMP_FRAMES, 90), []);
  useSpriteSheet(spriteRef, JUMP_FRAMES, frameAt, celebrate);

  return (
    <PixelFrame>
      <div className="flex flex-col items-center gap-4 px-2 py-6 text-center sm:py-8">
        {celebrate && (
          <div
            ref={spriteRef}
            aria-hidden
            className="pixelated size-[96px] bg-[url(/assets/pluton/pluton-flag-jump.png)] bg-[length:900%_100%] bg-no-repeat"
          />
        )}
        <p
          className={cn(
            "retro text-sm sm:text-base",
            celebrate ? "text-brand-light" : "text-white",
          )}
        >
          {title}
        </p>
        <p className="max-w-sm font-mono text-sm leading-relaxed text-[#d4d0ea]">
          {body}
        </p>
        <Button asChild variant="outline" className="mt-2 text-[10px]">
          <Link href="/">
            <PixelArrow dir="left" /> BACK TO ORBIT
          </Link>
        </Button>
      </div>
    </PixelFrame>
  );
}
