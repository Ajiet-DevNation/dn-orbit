import { z } from "zod";
import { isAjietUsn } from "./usn";

// Recruitment form rules — DB-free so the /recruitments client form and the
// public POST route validate with the exact same schema.

export const BRANCHES = [
  "CSE",
  "ISE",
  "ECE",
  "MECH",
  "CIVIL",
  "AIDS",
  "AIML",
  "CSD",
] as const;

export const YEARS = [1, 2, 3, 4] as const;

export const ABOUT_MAX_WORDS = 150;

export const CV_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/** True when the bytes start with the `%PDF-` header every PDF carries. */
export function looksLikePdf(bytes: Uint8Array): boolean {
  const magic = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  return magic.every((b, i) => bytes[i] === b);
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

// GitHub's own rule: alphanumerics and single inner hyphens, max 39 chars.
const GITHUB_USERNAME_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const LC_USERNAME_RE = /^[\w.-]{1,40}$/;
const X_HANDLE_RE = /^\w{1,15}$/;
// Optional leading +, then 10–15 digits once spaces and dashes are stripped.
const PHONE_RE = /^\+?\d{10,15}$/;

const optional = (schema: z.ZodTypeAny) =>
  z
    .union([z.literal(""), z.null(), z.undefined(), schema])
    .transform((v) => (v ? (v as string) : undefined));

export const recruitmentApplicationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  usn: z
    .string()
    .trim()
    .toUpperCase()
    .refine(isAjietUsn, "Enter a valid AJIET USN, e.g. 4JK24CS069"),
  branch: z.enum(BRANCHES, { message: "Select your branch" }),
  year: z.coerce
    .number({ message: "Select your year" })
    .int()
    .min(1, "Select your year")
    .max(4),
  whatsapp: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .refine((v) => PHONE_RE.test(v), "Enter a valid WhatsApp number"),
  about: z
    .string()
    .trim()
    .min(1, "Tell us something about yourself")
    .max(2000)
    .refine(
      (v) => countWords(v) <= ABOUT_MAX_WORDS,
      `Keep it under ${ABOUT_MAX_WORDS} words`,
    ),
  githubUsername: z
    .string()
    .trim()
    .regex(GITHUB_USERNAME_RE, "Enter your GitHub username, not a URL"),
  lcUsername: z
    .string()
    .trim()
    .regex(LC_USERNAME_RE, "Enter your LeetCode username, not a URL"),
  linkedinUrl: optional(
    z
      .string()
      .trim()
      .max(300)
      .url("Enter a full LinkedIn URL")
      .refine(
        (v) => /^https?:\/\/([\w-]+\.)?linkedin\.com\//i.test(v),
        "Enter a linkedin.com URL",
      ),
  ),
  xHandle: optional(
    z
      .string()
      .trim()
      .transform((v) => v.replace(/^@/, ""))
      .refine(
        (v) => X_HANDLE_RE.test(v),
        "Enter your X handle, e.g. @devnation",
      ),
  ),
});

export type RecruitmentApplicationInput = z.input<
  typeof recruitmentApplicationSchema
>;
export type RecruitmentApplication = z.output<
  typeof recruitmentApplicationSchema
>;

export const recruitmentConfigSchema = z.object({ isOpen: z.boolean() });

export const recruitmentReviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

/** Zod issues → `{ field: firstMessage }`, the shape the form renders inline. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
