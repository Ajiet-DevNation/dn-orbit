"use client";

import Link from "next/link";
import { useState } from "react";
import { FieldCard } from "@/app/(main)/events/[id]/register/FieldCard";
import { Button } from "@/components/ui/8bit-button";
import { Card } from "@/components/ui/8bit-card";
import { Input } from "@/components/ui/8bit-input";
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
  countWords,
  fieldErrors,
  type RecruitmentApplicationInput,
  recruitmentApplicationSchema,
  YEARS,
} from "@/lib/recruitment";

type Values = Record<keyof RecruitmentApplicationInput, string>;

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

// Text inputs, in display order. Branch, year and about are rendered by hand
// between them because they aren't plain inputs.
const TEXT_FIELDS: {
  key: keyof Values;
  label: string;
  required?: boolean;
  type?: string;
  placeholder: string;
  autoComplete?: string;
}[] = [
  {
    key: "usn",
    label: "USN",
    required: true,
    placeholder: "e.g. 4JK24CS069",
  },
  {
    key: "email",
    label: "EMAIL",
    required: true,
    type: "email",
    placeholder: "you@example.com",
    autoComplete: "email",
  },
  {
    key: "whatsapp",
    label: "WHATSAPP NUMBER",
    required: true,
    type: "tel",
    placeholder: "+91 98765 43210",
    autoComplete: "tel",
  },
  {
    key: "githubUsername",
    label: "GITHUB USERNAME",
    required: true,
    placeholder: "octocat",
  },
  {
    key: "lcUsername",
    label: "LEETCODE USERNAME",
    required: true,
    placeholder: "your-leetcode-id",
  },
  {
    key: "linkedinUrl",
    label: "LINKEDIN",
    type: "url",
    placeholder: "https://linkedin.com/in/you",
  },
  {
    key: "xHandle",
    label: "X (TWITTER)",
    placeholder: "@handle",
  },
];

const REVIEW_LABELS: Record<keyof Values, string> = {
  name: "NAME",
  branch: "BRANCH",
  year: "YEAR",
  usn: "USN",
  email: "EMAIL",
  whatsapp: "WHATSAPP",
  githubUsername: "GITHUB",
  lcUsername: "LEETCODE",
  linkedinUrl: "LINKEDIN",
  xHandle: "X",
  about: "ABOUT YOU",
};

export function RecruitmentForm({ open }: { open: boolean }) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"form" | "review" | "done">("form");
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof Values) => (v: string) =>
    setValues((p) => ({ ...p, [key]: v }));

  if (!open) {
    return (
      <Shell>
        <Card className="w-full items-start gap-4 border-white/10 p-8">
          <p className="retro text-sm text-white/70">RECRUITMENT IS CLOSED.</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            We&apos;re not taking applications right now. Keep an eye on the
            home page for the next drive.
          </p>
        </Card>
      </Shell>
    );
  }

  if (step === "done") {
    return (
      <Shell>
        <Card className="w-full items-center gap-4 border-[#22c55e]/30 p-10 text-center">
          <span className="retro text-4xl text-[#22c55e]">✓</span>
          <p className="retro text-sm text-white">APPLICATION SENT!</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Thanks for applying. The team will review it and reach out on
            WhatsApp or email.
          </p>
        </Card>
      </Shell>
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
      const res = await fetch("/api/recruitments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.status === 201) {
        setStep("done");
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

  if (step === "review") {
    return (
      <Shell>
        <div className="flex w-full flex-col gap-5 border-2 border-white/10 bg-[#0a0a0a] p-6 sm:p-8">
          <span className="retro text-[9px] tracking-widest text-[#22c55e]">
            REVIEW YOUR ANSWERS
          </span>
          <dl className="flex flex-col gap-4">
            {(Object.keys(REVIEW_LABELS) as (keyof Values)[]).map((key) => (
              <div
                key={key}
                className="flex flex-col gap-1 border-b border-white/5 pb-3"
              >
                <dt className="retro text-[8px] tracking-widest text-muted-foreground">
                  {REVIEW_LABELS[key]}
                </dt>
                <dd className="whitespace-pre-wrap break-words font-mono text-sm text-white">
                  {values[key].trim() || "—"}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-col gap-3 sm:flex-row">
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
        </div>
      </Shell>
    );
  }

  const words = countWords(values.about);

  return (
    <Shell>
      <form onSubmit={review} noValidate className="flex w-full flex-col gap-5">
        <FieldCard label="FULL NAME" required error={errors.name}>
          <Input
            font="normal"
            value={values.name}
            autoComplete="name"
            placeholder="Your full name"
            aria-invalid={!!errors.name}
            onChange={(e) => set("name")(e.target.value)}
          />
        </FieldCard>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FieldCard label="BRANCH" required error={errors.branch}>
            <Select value={values.branch} onValueChange={set("branch")}>
              <SelectTrigger aria-invalid={!!errors.branch}>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent className="z-[200] dark">
                {BRANCHES.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldCard>
          <FieldCard label="YEAR OF STUDY" required error={errors.year}>
            <Select value={values.year} onValueChange={set("year")}>
              <SelectTrigger aria-invalid={!!errors.year}>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent className="z-[200] dark">
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    YEAR {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldCard>
        </div>

        {TEXT_FIELDS.map((f) => (
          <FieldCard
            key={f.key}
            label={f.label}
            required={f.required}
            error={errors[f.key]}
          >
            <Input
              font="normal"
              type={f.type ?? "text"}
              value={values[f.key]}
              autoComplete={f.autoComplete}
              placeholder={f.placeholder}
              aria-invalid={!!errors[f.key]}
              onChange={(e) => set(f.key)(e.target.value)}
            />
          </FieldCard>
        ))}

        <FieldCard
          label={`TELL US ABOUT YOURSELF (MAX ${ABOUT_MAX_WORDS} WORDS)`}
          required
          error={errors.about}
        >
          {/* Same pixel frame as the event form's paragraph field. */}
          <div className="relative flex border-y-[6px] border-foreground dark:border-ring">
            <textarea
              value={values.about}
              placeholder="I am a…"
              aria-invalid={!!errors.about}
              onChange={(e) => set("about")(e.target.value)}
              rows={5}
              className="min-h-[140px] w-full resize-y rounded-none bg-transparent px-3 py-2.5 font-mono text-sm leading-relaxed text-white outline-none placeholder:text-zinc-600"
            />
            <div
              className="pointer-events-none absolute inset-0 -mx-[6px] border-x-[6px] border-foreground dark:border-ring"
              aria-hidden="true"
            />
          </div>
          <p
            className={`retro text-right text-[8px] ${
              words > ABOUT_MAX_WORDS
                ? "text-[#ef4444]"
                : "text-muted-foreground"
            }`}
          >
            {words} / {ABOUT_MAX_WORDS} WORDS
          </p>
        </FieldCard>

        <div className="mt-1 flex flex-col gap-3">
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
    </Shell>
  );
}

// Page frame matching the event registration form: back link, then a header
// card with the green top accent bar.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-5 py-24 sm:gap-8 sm:px-6 sm:py-28">
      <Link
        href="/"
        className="retro flex w-fit items-center gap-2 text-[9px] text-[#22c55e] transition-colors duration-200 hover:text-white"
      >
        ◂ BACK TO ORBIT
      </Link>
      <div className="flex flex-col gap-3 border-2 border-white/10 border-t-[6px] border-t-[#22c55e] bg-[#0a0a0a] p-6 sm:p-8">
        <span className="retro text-[9px] tracking-widest text-[#22c55e]">
          RECRUITMENT
        </span>
        <h1 className="retro text-lg leading-relaxed text-white sm:text-xl">
          JOIN DEVNATION
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Think you could be part of DevNation? Tell us who you are and what you
          build. Open to AJIET students.
        </p>
      </div>
      {children}
    </div>
  );
}
