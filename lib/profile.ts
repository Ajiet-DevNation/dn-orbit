import { z } from "zod";
import {
  BRANCHES,
  isValidYear,
  YEAR_FOR_BRANCH_ISSUE,
} from "@/lib/recruitment";

// Onboarding + profile-edit rules, shared by both server actions. DB-free so
// the tests can drive them. The dropdowns are only a hint: these are the gate.

const name = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name is too long");

const branch = z.enum(BRANCHES, { message: "Select your branch" });

// empty means "no bio", so clearing the field actually clears it
const bio = z
  .string()
  .trim()
  .max(160, "Bio must be 160 characters or fewer")
  .optional()
  .transform((v) => v || null);

const studentSchema = z
  .object({
    name,
    branch,
    bio,
    usn: z
      .string()
      .trim()
      .min(5, "USN must be valid")
      .max(20, "USN is too long"),
    year: z.coerce
      .number({ message: "Select your year" })
      .int("Select your year")
      .min(1, "Select your year")
      .max(4, "Select your year"),
    lc_username: z
      .string()
      .min(1, "LeetCode username is required")
      .max(40, "LeetCode username is too long")
      .regex(/^[a-zA-Z0-9_.-]+$/, "Invalid LeetCode username format"),
  })
  .refine((v) => isValidYear(v.branch, v.year), YEAR_FOR_BRANCH_ISSUE);

const facultySchema = z.object({ name, branch, bio });

export type StudentProfile = z.output<typeof studentSchema>;
export type FacultyProfile = z.output<typeof facultySchema>;

export type ParsedProfile =
  | { ok: true; faculty: true; data: FacultyProfile }
  | { ok: true; faculty: false; data: StudentProfile }
  | { ok: false; error: string };

// faculty fill name, department and bio only; everyone else the full form
export function parseProfileForm(
  role: string | null | undefined,
  form: FormData,
): ParsedProfile {
  const field = (k: string) => form.get(k) ?? undefined;
  const common = {
    name: field("name"),
    branch: field("branch"),
    bio: field("bio"),
  };

  if (role === "faculty") {
    const r = facultySchema.safeParse(common);
    return r.success
      ? { ok: true, faculty: true, data: r.data }
      : { ok: false, error: r.error.issues[0].message };
  }

  const r = studentSchema.safeParse({
    ...common,
    usn: field("usn"),
    year: field("year"),
    lc_username: field("lc_username"),
  });
  return r.success
    ? { ok: true, faculty: false, data: r.data }
    : { ok: false, error: r.error.issues[0].message };
}
