"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/8bit-button";
import { Card } from "@/components/ui/8bit-card";
import { Input } from "@/components/ui/8bit-input";
import { Label } from "@/components/ui/8bit-label";
import { Progress } from "@/components/ui/8bit-progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/8bit-select";
import { toast } from "@/components/ui/8bit-toast";
import {
  ABOUT_MAX_WORDS,
  BRANCHES,
  CV_MAX_BYTES,
  countWords,
  fieldErrors,
  type RecruitmentApplicationInput,
  recruitmentApplicationSchema,
  YEARS,
} from "@/lib/recruitment";
import { cn } from "@/lib/utils";

type Key = keyof RecruitmentApplicationInput;
type Values = Record<Key, string>;
type Step = "form" | "review" | "done";

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

const REQUIRED = (Object.keys(FIELDS) as Key[]).filter(
  (k) => FIELDS[k].required,
);

export function RecruitmentForm({ open }: { open: boolean }) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [cv, setCv] = useState<File | null>(null);

  const set = (key: Key) => (v: string) =>
    setValues((p) => ({ ...p, [key]: v }));

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
        <Card className="w-full items-start gap-4 border-white/10 p-8">
          <p className="retro text-sm text-white/70">RECRUITMENT IS CLOSED.</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            We&apos;re not taking applications right now. Keep an eye on the
            home page for the next drive.
          </p>
        </Card>
      </Layout>
    );
  }

  if (step === "done") {
    return (
      <Layout step="done">
        <Card className="w-full items-center gap-4 border-[#22c55e]/30 p-10 text-center">
          <span className="retro text-4xl text-[#22c55e]">✓</span>
          <p className="retro text-sm text-white">APPLICATION SENT!</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Thanks for applying. The team will review it and reach out on
            WhatsApp or email.
          </p>
        </Card>
      </Layout>
    );
  }

  const review = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = recruitmentApplicationSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      toast.error("Please fix the highlighted fields");
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
                  <dt className="retro text-[8px] tracking-widest text-muted-foreground">
                    {k === "about" ? "ABOUT YOU" : FIELDS[k].label}
                  </dt>
                  <dd className="whitespace-pre-wrap break-words font-mono text-sm text-white">
                    {values[k].trim() || "—"}
                  </dd>
                </div>
              ))}
              {s.cv && (
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <dt className="retro text-[8px] tracking-widest text-muted-foreground">
                    CV
                  </dt>
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
            ◂ EDIT
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={submit}
            className="text-[11px] !bg-[#22c55e] hover:!bg-[#16a34a] !text-black sm:px-10"
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
    if (k === "branch" || k === "year") {
      const options =
        k === "branch"
          ? BRANCHES.map((b) => ({ value: b, label: b }))
          : YEARS.map((y) => ({ value: String(y), label: `YEAR ${y}` }));
      return (
        <Select value={values[k]} onValueChange={set(k)}>
          <SelectTrigger id={id} aria-invalid={invalid}>
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
          {/* Same pixel frame as the event form's paragraph field. */}
          <div className="relative flex border-y-[6px] border-foreground dark:border-ring">
            <textarea
              id={id}
              value={values.about}
              placeholder="I am a…"
              aria-invalid={invalid}
              onChange={(e) => set("about")(e.target.value)}
              rows={6}
              className="min-h-[160px] w-full resize-y rounded-none bg-transparent px-3 py-2.5 font-mono text-sm leading-relaxed text-white outline-none placeholder:text-zinc-600"
            />
            <div
              className="pointer-events-none absolute inset-0 -mx-[6px] border-x-[6px] border-foreground dark:border-ring"
              aria-hidden="true"
            />
          </div>
          <p
            className={cn(
              "retro text-right text-[8px]",
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
        font="normal"
        type={f.type ?? "text"}
        value={values[k]}
        autoComplete={f.autoComplete}
        placeholder={f.placeholder}
        aria-invalid={invalid}
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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="retro text-[8px] tracking-widest text-muted-foreground">
            <span className="text-[#ef4444]">*</span> REQUIRED
          </p>
          <Button
            type="submit"
            className="w-full text-[11px] !bg-[#22c55e] hover:!bg-[#16a34a] !text-black sm:w-fit sm:px-10"
          >
            REVIEW INFORMATION ▸
          </Button>
        </div>
      </form>
    </Layout>
  );
}

// Two columns on desktop: a sticky intro rail on the left, the form on the
// right. Phones get one column with the rail's extras hidden.
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
    <div className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-6 sm:py-28">
      <Link
        href="/"
        className="retro flex w-fit items-center gap-2 text-[9px] text-[#22c55e] transition-colors duration-200 hover:text-white"
      >
        ◂ BACK TO ORBIT
      </Link>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-10">
        <aside className="flex flex-col gap-6 lg:sticky lg:top-28 lg:col-span-2 lg:self-start">
          <div className="flex flex-col gap-3 border-2 border-white/10 border-t-[6px] border-t-[#22c55e] bg-[#0a0a0a] p-6 sm:p-8">
            <span className="retro text-[9px] tracking-widest text-[#22c55e]">
              RECRUITMENT
            </span>
            <h1 className="retro text-lg leading-relaxed text-white sm:text-xl">
              JOIN DEVNATION
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Think you could be part of DevNation? Tell us who you are and what
              you build. Open to AJIET students.
            </p>
            {step && <Steps current={step} />}
          </div>

          <div className="hidden flex-col gap-4 border-2 border-white/10 bg-[#0a0a0a] p-6 lg:flex">
            <span className="retro text-[9px] tracking-widest text-white/80">
              HOW IT WORKS
            </span>
            <ol className="flex flex-col gap-3">
              {[
                "Fill in the form and review your answers.",
                "The core team reviews every application.",
                "We reach out on WhatsApp or email.",
              ].map((text, i) => (
                <li key={text} className="flex gap-3">
                  <span className="retro shrink-0 text-[9px] leading-5 text-[#22c55e]">
                    0{i + 1}
                  </span>
                  <span className="text-xs leading-5 text-muted-foreground">
                    {text}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {filled !== undefined && (
            <div className="hidden flex-col gap-3 border-2 border-white/10 bg-[#0a0a0a] p-6 lg:flex">
              <div className="flex items-center justify-between">
                <span className="retro text-[9px] tracking-widest text-white/80">
                  PROGRESS
                </span>
                <span className="retro text-[9px] text-[#22c55e]">
                  {filled} / {REQUIRED.length} REQUIRED
                </span>
              </div>
              <Progress
                value={Math.round((filled / REQUIRED.length) * 100)}
                variant="retro"
                progressBg="bg-[#22c55e]"
                className="h-4"
              />
            </div>
          )}
        </aside>

        <div className="flex flex-col gap-6 lg:col-span-3">{children}</div>
      </div>
    </div>
  );
}

const STEPS: Step[] = ["form", "review", "done"];

function Steps({ current }: { current: Step }) {
  const at = STEPS.indexOf(current);
  return (
    <ol className="mt-2 flex items-center gap-2 border-t-2 border-white/10 pt-4">
      {STEPS.map((s, i) => (
        <li
          key={s}
          aria-current={i === at ? "step" : undefined}
          className={cn(
            "retro text-[8px] tracking-widest",
            i === at
              ? "text-[#22c55e]"
              : i < at
                ? "text-white/60"
                : "text-white/25",
          )}
        >
          {i > 0 && <span className="mr-2 text-white/25">▸</span>}
          {s.toUpperCase()}
        </li>
      ))}
    </ol>
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
    <section className="border-2 border-white/10 bg-[#0a0a0a] transition-colors duration-200 focus-within:border-[#22c55e]/40">
      <header className="flex items-center gap-3 border-b-2 border-white/10 px-5 py-3 sm:px-6">
        <span className="retro text-[9px] text-[#22c55e]">0{index}</span>
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
    <div className={cn("flex flex-col gap-2.5", wide && "sm:col-span-2")}>
      <Label
        htmlFor={id}
        className="font-mono text-sm font-semibold leading-relaxed tracking-wide text-[#22c55e]"
      >
        {label}
        {required && <span className="text-[#ef4444]"> *</span>}
      </Label>
      {children}
      {error && (
        <p className="font-mono text-[11px] leading-relaxed text-[#ef4444]">
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
  return (
    <div className="flex flex-wrap items-center gap-3 border-2 border-dashed border-white/15 bg-black/40 px-4 py-3 has-[:focus-visible]:border-[#22c55e]/70">
      <label className="retro cursor-pointer border-2 border-[#22c55e] px-3 py-2 text-[8px] text-[#22c55e] transition-colors hover:bg-[#22c55e] hover:text-black">
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
      {file ? (
        <>
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-white">
            {file.name}
            <span className="ml-2 text-muted-foreground">
              {(file.size / 1024).toFixed(0)} KB
            </span>
          </span>
          <button
            type="button"
            onClick={() => onPick(null)}
            className="retro text-[8px] text-red-400 transition-colors hover:text-red-300"
          >
            REMOVE
          </button>
        </>
      ) : (
        <span className="font-mono text-xs text-muted-foreground">
          Optional · no file chosen
        </span>
      )}
    </div>
  );
}
