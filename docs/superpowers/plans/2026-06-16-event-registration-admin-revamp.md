# Event Registration, Admin 8-bit Revamp & Carousel Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin-configurable event registration (public/guest capable) with a from-scratch 8-bit form, rebuild the admin dashboard in the 8-bit theme, and fix carousel image-drag interference.

**Architecture:** Per-event `formSchema` JSON + nullable-user `Registration` rows store Google-Forms-style submissions. A shared pure validator (`lib/forms.ts`) backs both the client renderer and the server route. Banners upload to Supabase Storage via an admin-gated route. The public events grid gains a FLIP master/detail overlay (extracted from `ProjectsSection`); the admin panel is rebuilt on new pixel primitives.

**Tech Stack:** Next.js 16 (App Router), React 19, Prisma 7 + Postgres (Neon), NextAuth v5, Supabase Storage (`@supabase/supabase-js`, `@supabase/ssr`), Tailwind v4, existing `components/ui/8bit-*`, sonner, `bun test`.

**Spec:** `docs/superpowers/specs/2026-06-16-event-registration-admin-revamp-design.md`

---

## Conventions for this plan

- Run tests with `bun test lib` (the repo's `test` script only collects `lib/**`).
- Lint with `bun run lint`. Typecheck with `bunx tsc --noEmit`.
- Dev server: `bun run dev` (http://localhost:3000).
- Accent green is `#22c55e`; pixel font utility class is `retro`; pixel components live in `components/ui/8bit-*`.
- Commit after every task. Branch is `feat/event-registration-admin-revamp` (already created).

---

# PHASE 0 — Task 3: Carousel drag fix (isolated, ship first)

### Task 0.1: Stop card images hijacking carousel drag

**Files:**
- Modify: `app/(main)/_sections/MembersSection.tsx` (the `<img>` ~line 44)
- Modify: `app/(main)/_sections/ProjectsSection.tsx` (the `<img>` ~line 68)
- Modify: `app/(main)/_sections/EventsSection.tsx` (the `<img>` ~line 44)

- [ ] **Step 1: Add `draggable={false}` + no-drag classes to the Members card image**

In `MembersSection.tsx`, the headshot `<img>` currently is:

```tsx
<img
  src={member.imageUrl}
  alt={member.name}
  loading="lazy"
  className="pixelated h-full w-full object-cover object-top"
/>
```

Change to:

```tsx
<img
  src={member.imageUrl}
  alt={member.name}
  loading="lazy"
  draggable={false}
  className="pixelated h-full w-full object-cover object-top select-none [-webkit-user-drag:none]"
/>
```

- [ ] **Step 2: Apply the same to the Projects card image**

In `ProjectsSection.tsx` `ProjectCard`, change the `<img>` to add `draggable={false}` and append `select-none [-webkit-user-drag:none]` to its `className` (keep existing `pixelated h-full w-full object-cover`).

- [ ] **Step 3: Apply the same to the Events card banner image**

In `EventsSection.tsx` `EventCard`, change the banner `<img>` to add `draggable={false}` and append `select-none [-webkit-user-drag:none]` to its `className` (keep `pixelated h-full w-full object-cover transition-transform ... group-hover:scale-110`).

- [ ] **Step 4: Manual verification**

Run `bun run dev`. On the Members section: click-and-hold over a member's **photo** and drag horizontally — the carousel must slide, with no ghost image. Repeat on touch (devtools device mode). Repeat on Projects.
Expected: smooth drag from anywhere on the card including over the image; no native drag ghost.

- [ ] **Step 5: Lint + commit**

```bash
bun run lint
git add "app/(main)/_sections/MembersSection.tsx" "app/(main)/_sections/ProjectsSection.tsx" "app/(main)/_sections/EventsSection.tsx"
git commit -m "fix: prevent card images from hijacking carousel drag"
```

---

# PHASE 1 — Data model + shared modules

### Task 1.1: Prisma schema — audience, registration fields, form schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the `EventAudience` enum**

After the `ProjectStatus` enum block, add:

```prisma
enum EventAudience {
  members
  college
  public
}
```

- [ ] **Step 2: Extend the `Event` model**

Add these fields inside `model Event` (after `isPublished`):

```prisma
  audience             EventAudience @default(public)
  capacity             Int?
  registrationDeadline DateTime?     @map("registration_deadline")
  formSchema           Json?         @map("form_schema")
```

- [ ] **Step 3: Rewrite the `Registration` model**

Replace the existing `model Registration { ... }` with:

```prisma
model Registration {
  id           String   @id @default(uuid())
  userId       String?  @map("user_id")
  eventId      String   @map("event_id")
  name         String
  email        String
  usn          String?
  responses    Json     @default("{}")
  attended     Boolean  @default(false)
  registeredAt DateTime @default(now()) @map("registered_at")

  user  User? @relation(fields: [userId], references: [id], onDelete: SetNull)
  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@unique([eventId, email])
  @@map("registrations")
}
```

- [ ] **Step 4: Fix the back-relation on `User`**

In `model User`, the `registrations Registration[]` relation stays as-is (the relation is now optional on the Registration side; the array field is unchanged).

- [ ] **Step 5: Create the migration**

Run: `bunx prisma migrate dev --name event_registration_forms --create-only`
Expected: a new folder under `prisma/migrations/` with generated SQL. Do NOT apply yet — we will edit it for the backfill in the next step.

- [ ] **Step 6: Edit the migration SQL for a safe backfill**

Open the new `prisma/migrations/<ts>_event_registration_forms/migration.sql`. Ensure the order is:
1. `CREATE TYPE "EventAudience" ...`
2. `ALTER TABLE "events" ADD COLUMN ...` (the four new columns).
3. `ALTER TABLE "registrations" ADD COLUMN "name" TEXT;` and `ADD COLUMN "email" TEXT;` and `ADD COLUMN "usn" TEXT;` and `ADD COLUMN "responses" JSONB NOT NULL DEFAULT '{}';` — add `name`/`email` as **nullable first**.
4. Backfill before enforcing NOT NULL:

```sql
UPDATE "registrations" r
SET "name" = u."name", "email" = u."email"
FROM "users" u
WHERE r."user_id" = u."id" AND r."name" IS NULL;
```

5. Then enforce NOT NULL on `name`/`email`:

```sql
ALTER TABLE "registrations" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "registrations" ALTER COLUMN "email" SET NOT NULL;
```

6. Relax `user_id` to nullable + switch FK to `ON DELETE SET NULL`, and swap the unique:

```sql
ALTER TABLE "registrations" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "registrations" DROP CONSTRAINT IF EXISTS "registrations_user_id_event_id_key";
ALTER TABLE "registrations" DROP CONSTRAINT IF EXISTS "registrations_user_id_fkey";
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "registrations_event_id_email_key" ON "registrations"("event_id", "email");
```

(Exact constraint names: check the generated SQL and the existing constraint names in your DB; adjust the `DROP CONSTRAINT` names to match.)

- [ ] **Step 7: Apply the migration + regenerate client**

Run: `bunx prisma migrate dev`
Expected: migration applies cleanly; `prisma generate` runs. If the DB is remote and migrate is blocked, use `bunx prisma migrate deploy`.

- [ ] **Step 8: Typecheck (expect breakage to fix in later tasks)**

Run: `bunx tsc --noEmit`
Expected: errors in `app/admin/events/[id]/page.tsx` (roster uses `reg.user.name`) and the register route — these are addressed in Tasks 3.x. Note them; do not fix here.

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): event audience, capacity, formSchema, guest registrations"
```

---

### Task 1.2: `lib/forms.ts` — field types + pure validator (TDD)

**Files:**
- Create: `lib/forms.ts`
- Test: `lib/forms.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/forms.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import {
  type FormFieldDef,
  type EventAudience,
  validateSubmission,
} from "./forms";

const field = (over: Partial<FormFieldDef>): FormFieldDef => ({
  id: "f1",
  type: "short_text",
  label: "Field",
  required: false,
  ...over,
});

const base = {
  audience: "public" as EventAudience,
  schema: [] as FormFieldDef[],
};

describe("validateSubmission", () => {
  test("requires name and email always", () => {
    const r = validateSubmission({ ...base, input: { name: "", email: "" } });
    expect(r.ok).toBe(false);
    expect(r.errors.name).toBeTruthy();
    expect(r.errors.email).toBeTruthy();
  });

  test("rejects malformed email", () => {
    const r = validateSubmission({
      ...base,
      input: { name: "A", email: "nope" },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.email).toBeTruthy();
  });

  test("accepts a minimal valid public submission", () => {
    const r = validateSubmission({
      ...base,
      input: { name: "A", email: "a@b.com" },
    });
    expect(r.ok).toBe(true);
    expect(Object.keys(r.errors)).toHaveLength(0);
  });

  test("college audience requires usn", () => {
    const r = validateSubmission({
      audience: "college",
      schema: [],
      input: { name: "A", email: "a@b.com" },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.usn).toBeTruthy();
  });

  test("college usn pattern enforced when provided", () => {
    const r = validateSubmission({
      audience: "college",
      schema: [],
      usnPattern: "^1MS\\d{2}[A-Z]{2}\\d{3}$",
      input: { name: "A", email: "a@b.com", usn: "BAD" },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.usn).toBeTruthy();
  });

  test("required custom field missing fails", () => {
    const r = validateSubmission({
      ...base,
      schema: [field({ id: "x", type: "short_text", required: true })],
      input: { name: "A", email: "a@b.com", responses: {} },
    });
    expect(r.ok).toBe(false);
    expect(r.errors["x"]).toBeTruthy();
  });

  test("single_choice value must be one of options", () => {
    const r = validateSubmission({
      ...base,
      schema: [
        field({ id: "x", type: "single_choice", required: true, options: ["A", "B"] }),
      ],
      input: { name: "N", email: "a@b.com", responses: { x: "C" } },
    });
    expect(r.ok).toBe(false);
    expect(r.errors["x"]).toBeTruthy();
  });

  test("multi_choice values must all be in options", () => {
    const r = validateSubmission({
      ...base,
      schema: [
        field({ id: "x", type: "multi_choice", required: true, options: ["A", "B"] }),
      ],
      input: { name: "N", email: "a@b.com", responses: { x: ["A", "Z"] } },
    });
    expect(r.ok).toBe(false);
  });

  test("number field rejects non-numeric", () => {
    const r = validateSubmission({
      ...base,
      schema: [field({ id: "x", type: "number", required: true })],
      input: { name: "N", email: "a@b.com", responses: { x: "abc" } },
    });
    expect(r.ok).toBe(false);
  });

  test("coerces and returns clean values", () => {
    const r = validateSubmission({
      ...base,
      schema: [field({ id: "x", type: "number", required: true })],
      input: { name: "N", email: "a@b.com", responses: { x: "42" } },
    });
    expect(r.ok).toBe(true);
    expect(r.value.responses.x).toBe(42);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test lib/forms.test.ts`
Expected: FAIL — `Cannot find module './forms'`.

- [ ] **Step 3: Implement `lib/forms.ts`**

```ts
// Single source of truth for registration form field definitions and the
// submission validator shared by the client renderer and the server route.

export type EventAudience = "members" | "college" | "public";

export type FieldType =
  | "short_text"
  | "paragraph"
  | "email"
  | "number"
  | "date"
  | "single_choice"
  | "multi_choice"
  | "dropdown";

export interface FormFieldDef {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  pattern?: string;
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  short_text: "Short answer",
  paragraph: "Paragraph",
  email: "Email",
  number: "Number",
  date: "Date",
  single_choice: "Multiple choice (one)",
  multi_choice: "Checkboxes (many)",
  dropdown: "Dropdown",
};

export const CHOICE_TYPES: FieldType[] = ["single_choice", "multi_choice", "dropdown"];

// A loose, pragmatic email check. The server is authoritative; this is shared.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Default USN pattern (RIT-style) used as a hint; admins may override per event.
export const DEFAULT_USN_PATTERN = "^1MS\\d{2}[A-Z]{2}\\d{3}$";

export interface SubmissionInput {
  name?: string;
  email?: string;
  usn?: string;
  responses?: Record<string, unknown>;
}

export interface ValidateArgs {
  audience: EventAudience;
  schema: FormFieldDef[];
  usnPattern?: string;
  input: SubmissionInput;
}

export interface CleanSubmission {
  name: string;
  email: string;
  usn?: string;
  responses: Record<string, unknown>;
}

export type ValidateResult =
  | { ok: true; errors: Record<string, never>; value: CleanSubmission }
  | { ok: false; errors: Record<string, string>; value?: undefined };

function isBlank(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export function validateSubmission(args: ValidateArgs): ValidateResult {
  const { audience, schema, input } = args;
  const errors: Record<string, string> = {};
  const responses: Record<string, unknown> = {};

  const name = (input.name ?? "").trim();
  const email = (input.email ?? "").trim();
  if (!name) errors.name = "Name is required";
  if (!email) errors.email = "Email is required";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email";

  let usn: string | undefined;
  if (audience === "college") {
    usn = (input.usn ?? "").trim();
    if (!usn) {
      errors.usn = "USN / College ID is required";
    } else if (args.usnPattern) {
      try {
        if (!new RegExp(args.usnPattern).test(usn)) {
          errors.usn = "USN format is invalid";
        }
      } catch {
        // An invalid admin-supplied pattern should not block submission.
      }
    }
  }

  const src = input.responses ?? {};
  for (const f of schema) {
    const raw = src[f.id];
    if (isBlank(raw)) {
      if (f.required) errors[f.id] = `${f.label} is required`;
      continue;
    }
    switch (f.type) {
      case "email": {
        const s = String(raw).trim();
        if (!EMAIL_RE.test(s)) errors[f.id] = "Enter a valid email";
        else responses[f.id] = s;
        break;
      }
      case "number": {
        const n = Number(raw);
        if (!Number.isFinite(n)) errors[f.id] = `${f.label} must be a number`;
        else responses[f.id] = n;
        break;
      }
      case "date": {
        const s = String(raw);
        if (Number.isNaN(Date.parse(s))) errors[f.id] = "Enter a valid date";
        else responses[f.id] = s;
        break;
      }
      case "single_choice":
      case "dropdown": {
        const s = String(raw);
        if (!(f.options ?? []).includes(s)) errors[f.id] = "Choose a valid option";
        else responses[f.id] = s;
        break;
      }
      case "multi_choice": {
        const arr = Array.isArray(raw) ? raw.map(String) : [String(raw)];
        const opts = f.options ?? [];
        if (!arr.every((v) => opts.includes(v))) errors[f.id] = "Invalid selection";
        else responses[f.id] = arr;
        break;
      }
      default: {
        const s = String(raw);
        if (f.pattern) {
          try {
            if (!new RegExp(f.pattern).test(s)) errors[f.id] = `${f.label} format is invalid`;
            else responses[f.id] = s;
          } catch {
            responses[f.id] = s;
          }
        } else {
          responses[f.id] = s;
        }
      }
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    errors: {} as Record<string, never>,
    value: { name, email, usn, responses },
  };
}

// Narrowing helper: parse arbitrary JSON into a FormFieldDef[] (skips bad rows).
export function parseFormSchema(value: unknown): FormFieldDef[] {
  if (!Array.isArray(value)) return [];
  const out: FormFieldDef[] = [];
  for (const r of value) {
    if (
      r && typeof r === "object" &&
      typeof (r as FormFieldDef).id === "string" &&
      typeof (r as FormFieldDef).label === "string" &&
      typeof (r as FormFieldDef).type === "string"
    ) {
      out.push(r as FormFieldDef);
    }
  }
  return out;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test lib/forms.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add lib/forms.ts lib/forms.test.ts
git commit -m "feat(forms): shared field types + submission validator"
```

---

### Task 1.3: Supabase client helpers + env

**Files:**
- Create: `utils/supabase/server.ts`
- Create: `utils/supabase/client.ts`
- Modify: `.env.example`

- [ ] **Step 1: Install packages**

Run: `bun add @supabase/supabase-js @supabase/ssr`
Expected: both added to `package.json` dependencies.

- [ ] **Step 2: Create `utils/supabase/server.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = (
  cookieStore: Awaited<ReturnType<typeof cookies>>,
) => {
  return createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // setAll called from a Server Component — safe to ignore.
        }
      },
    },
  });
};
```

- [ ] **Step 3: Create `utils/supabase/client.ts`**

```ts
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = () => createBrowserClient(supabaseUrl!, supabaseKey!);
```

- [ ] **Step 4: Document env vars in `.env.example`**

Append:

```
# Supabase Storage (event banners)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
# Service-role key — server-side admin uploads only. NEVER expose to the client.
SUPABASE_SERVICE_ROLE_KEY=
# Public storage bucket name for event banners
SUPABASE_BANNERS_BUCKET=event-banners
```

- [ ] **Step 5: Add local env values (manual, not committed)**

Tell the user to put real values in `.env.local` (already gitignored): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (provided), and `SUPABASE_SERVICE_ROLE_KEY` (from Supabase dashboard → Project Settings → API). Create a **public** bucket named `event-banners` in Supabase Storage.

- [ ] **Step 6: Commit**

```bash
git add utils/supabase package.json bun.lock .env.example
git commit -m "feat(supabase): storage client helpers + env scaffolding"
```

---

### Task 1.4: Admin-gated banner upload route

**Files:**
- Create: `app/api/admin/upload/route.ts`

- [ ] **Step 1: Implement the upload route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { auth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";

const BUCKET = process.env.SUPABASE_BANNERS_BUCKET ?? "event-banners";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !canAccessAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Storage is not configured" },
      { status: 500 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const key = `banners/${crypto.randomUUID()}.${ext}`;

  const supabase = createSupabaseAdmin(url, serviceKey, {
    auth: { persistSession: false },
  });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, bytes, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return NextResponse.json({ url: data.publicUrl }, { status: 201 });
}
```

- [ ] **Step 2: Typecheck**

Run: `bunx tsc --noEmit`
Expected: no new errors in this file (existing roster/register errors from Task 1.1 may remain).

- [ ] **Step 3: Manual smoke (after env + bucket exist)**

With `.env.local` set and dev running, from the browser console while signed in as admin:
`fetch('/api/admin/upload',{method:'POST',body:(()=>{const f=new FormData();return f})()}).then(r=>r.status)` → expect `400` (no file). A real file upload returns `201` with a `url`.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/upload/route.ts
git commit -m "feat(api): admin-gated Supabase banner upload route"
```

---

# PHASE 2 — Registration backend

### Task 2.1: Rewrite the register route

**Files:**
- Modify: `app/api/events/[id]/register/route.ts`

- [ ] **Step 1: Replace the POST handler**

```ts
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isApproved } from "@/lib/access";
import {
  parseFormSchema,
  validateSubmission,
  type EventAudience,
} from "@/lib/forms";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id: eventId } = await params;

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (!event.isPublished)
    return NextResponse.json({ error: "Event not available" }, { status: 403 });

  const audience = event.audience as EventAudience;

  // Members-only events require an approved, signed-in member.
  const session = await auth();
  if (audience === "members") {
    if (!session)
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    if (!(await isApproved(session.user.id)))
      return NextResponse.json({ error: "Pending approval" }, { status: 403 });
  }

  // Deadline + capacity gates.
  const deadline = event.registrationDeadline ?? event.eventDate;
  if (deadline && new Date() > deadline)
    return NextResponse.json({ error: "Registration closed" }, { status: 409 });

  if (event.capacity != null) {
    const count = await db.registration.count({ where: { eventId } });
    if (count >= event.capacity)
      return NextResponse.json({ error: "Event is full" }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  // Members submit under their account identity (email locked server-side).
  const input =
    audience === "members" && session
      ? {
          name: session.user.name ?? body.name,
          email: session.user.email ?? body.email,
          usn: body.usn,
          responses: body.responses,
        }
      : body;

  const result = validateSubmission({
    audience,
    schema: parseFormSchema(event.formSchema),
    input,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Validation failed", fields: result.errors }, { status: 422 });
  }

  try {
    const registration = await db.registration.create({
      data: {
        eventId,
        userId: session?.user.id ?? null,
        name: result.value.name,
        email: result.value.email,
        usn: result.value.usn ?? null,
        responses: result.value.responses as Prisma.InputJsonValue,
      },
    });
    return NextResponse.json({ id: registration.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "This email is already registered for this event" },
        { status: 409 },
      );
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id: eventId } = await params;
  await db.registration.deleteMany({
    where: { eventId, userId: session.user.id },
  });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Typecheck**

Run: `bunx tsc --noEmit`
Expected: this file compiles. Roster error from Task 1.1 still present (fixed in Task 4.4).

- [ ] **Step 3: Commit**

```bash
git add "app/api/events/[id]/register/route.ts"
git commit -m "feat(api): audience-aware registration with validation, capacity, dedupe"
```

---

### Task 2.2: Extend event create/update API for new fields

**Files:**
- Modify: `app/api/events/route.ts` (POST)
- Modify: `app/api/events/[id]/route.ts` (PATCH)

- [ ] **Step 1: Accept new fields in `POST /api/events`**

In `route.ts` POST, expand the destructure and `data`:

```ts
const {
  title, description, bannerUrl, eventType, eventDate, location, isPublished,
  audience, capacity, registrationDeadline, formSchema,
} = await req.json();
```

Add to `db.event.create({ data: { ... } })`:

```ts
      audience: audience ?? "public",
      capacity: capacity ?? null,
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
      formSchema: formSchema ?? undefined,
```

- [ ] **Step 2: Accept new fields in `PATCH /api/events/[id]`**

In `[id]/route.ts` PATCH, expand the destructure and the conditional `data` spread:

```ts
const {
  title, description, bannerUrl, eventType, eventDate, location, isPublished,
  audience, capacity, registrationDeadline, formSchema,
} = body;
```

Add inside the `data: { ... }`:

```ts
      ...(audience !== undefined && { audience }),
      ...(capacity !== undefined && { capacity }),
      ...(registrationDeadline !== undefined && {
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
      }),
      ...(formSchema !== undefined && { formSchema }),
```

- [ ] **Step 3: Typecheck + commit**

Run: `bunx tsc --noEmit` (these two files should compile).

```bash
git add "app/api/events/route.ts" "app/api/events/[id]/route.ts"
git commit -m "feat(api): persist audience, capacity, deadline, formSchema on events"
```

---

### Task 2.3: CSV export of registrations

**Files:**
- Create: `app/api/events/[id]/registrations.csv/route.ts`

- [ ] **Step 1: Implement the CSV route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";
import { parseFormSchema } from "@/lib/forms";

type Params = { params: Promise<{ id: string }> };

function csvCell(v: unknown): string {
  const s = Array.isArray(v) ? v.join("; ") : v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || !canAccessAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const event = await db.event.findUnique({
    where: { id },
    include: { registrations: { orderBy: { registeredAt: "asc" } } },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fields = parseFormSchema(event.formSchema);
  const header = [
    "Registered At", "Name", "Email", "USN", "Attended",
    ...fields.map((f) => f.label),
  ];
  const rows = event.registrations.map((r) => {
    const responses = (r.responses ?? {}) as Record<string, unknown>;
    return [
      r.registeredAt.toISOString(),
      r.name, r.email, r.usn ?? "", r.attended ? "yes" : "no",
      ...fields.map((f) => responses[f.id]),
    ].map(csvCell).join(",");
  });
  const csv = [header.map(csvCell).join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="registrations-${id}.csv"`,
    },
  });
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
bunx tsc --noEmit
git add "app/api/events/[id]/registrations.csv/route.ts"
git commit -m "feat(api): admin CSV export of event registrations"
```

---

# PHASE 3 — Task 1: Public events expand + registration page

### Task 3.1: Extract a reusable FLIP master/detail hook

**Files:**
- Create: `app/(main)/_sections/useFlipDetail.ts`

This extracts the FLIP open/close mechanism currently inline in `ProjectsSection.tsx` (`clickedRectRef`, `flipRef`, the `useLayoutEffect`, `close`, Escape handling) so both Projects and Events can reuse it. We do NOT refactor Projects in this task (only Events consumes it now); a follow-up could migrate Projects.

- [ ] **Step 1: Implement the hook**

```ts
"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// Shared FLIP shared-element transition: an originating card element animates
// from its on-screen rect into a detail slot, and back on close.
export function useFlipDetail() {
  const [selected, setSelected] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const fromRectRef = useRef<DOMRect | null>(null);
  const flipRef = useRef<HTMLDivElement>(null);

  const open = useCallback((id: string, el: HTMLElement) => {
    fromRectRef.current = el.getBoundingClientRect();
    setSelected(id);
  }, []);

  useLayoutEffect(() => {
    const el = flipRef.current;
    const from = fromRectRef.current;
    if (selected === null || !el || !from) return;
    const to = el.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    const sx = to.width ? from.width / to.width : 1;
    const sy = to.height ? from.height / to.height : 1;
    el.style.transition = "none";
    el.style.transformOrigin = "top left";
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    void el.offsetWidth;
    requestAnimationFrame(() => {
      el.style.transition = "transform 480ms var(--ease-out-quart)";
      el.style.transform = "translate(0px, 0px) scale(1, 1)";
      setDetailOpen(true);
    });
  }, [selected]);

  const close = useCallback(() => {
    const el = flipRef.current;
    const from = fromRectRef.current;
    setDetailOpen(false);
    if (!el || !from) {
      setSelected(null);
      return;
    }
    const to = el.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    const sx = to.width ? from.width / to.width : 1;
    const sy = to.height ? from.height / to.height : 1;
    el.style.transition = "transform 420ms var(--ease-out-quart)";
    el.style.transformOrigin = "top left";
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    const done = () => {
      el.removeEventListener("transitionend", done);
      setSelected(null);
    };
    el.addEventListener("transitionend", done);
  }, []);

  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (selected === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return { selected, detailOpen, flipRef, open, close };
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
bunx tsc --noEmit
git add "app/(main)/_sections/useFlipDetail.ts"
git commit -m "feat(ui): reusable FLIP master/detail hook"
```

---

### Task 3.2: Events grid → click-to-expand overlay with Register

**Files:**
- Modify: `app/(main)/_sections/EventsSection.tsx`
- Modify: `app/(main)/page.tsx` (extend `EventCardData` mapping)

- [ ] **Step 1: Extend `EventCardData` and the page mapping**

In `EventsSection.tsx`, add to `EventCardData`:

```ts
  audience: "members" | "college" | "public";
  capacityLabel: string | null; // e.g. "12 / 50 registered" or null
  registrationClosed: boolean;
```

In `app/(main)/page.tsx`, the events query currently selects the whole event. Add a registration count and compute fields. Replace the `events` query with one that includes `_count`:

```ts
  const events = await db.event.findMany({
    where: { isPublished: true },
    orderBy: { eventDate: "asc" },
    take: 12,
    include: { _count: { select: { registrations: true } } },
  });
```

Map `eventCards`:

```ts
  const eventCards: EventCardData[] = events.map((e) => {
    const deadline = e.registrationDeadline ?? e.eventDate;
    const full = e.capacity != null && e._count.registrations >= e.capacity;
    return {
      id: e.id,
      type: (e.eventType ?? "EVENT").toUpperCase(),
      title: e.title,
      description: e.description,
      dateLabel: formatEventDateLong(e.eventDate),
      location: e.location,
      bannerUrl: e.bannerUrl,
      audience: e.audience as EventCardData["audience"],
      capacityLabel:
        e.capacity != null ? `${e._count.registrations} / ${e.capacity} registered` : null,
      registrationClosed: full || (deadline ? new Date() > deadline : false),
    };
  });
```

(The `announcements` slice keeps using `events` — unaffected.)

- [ ] **Step 2: Add the expand overlay to `EventsSection`**

Rewrite `EventsSection` to wire each grid card to `useFlipDetail` and render the detail overlay. Keep `EventCard` for the grid; make the card clickable. Add an `EventDetail` panel. Use `next/link` for the Register button (`/events/[id]/register`). Reference structure:

```tsx
"use client";

import { useRef } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/8bit-card";
import { SectionHeading } from "./SectionHeading";
import { PixelReveal } from "./PixelReveal";
import { useFlipDetail } from "./useFlipDetail";

// ...EventCardData interface (extended above), bannerGlyph, EventCard, EmptyState unchanged
// EXCEPT EventCard renders its banner image with draggable={false} (Task 0.1).

function AudienceBadge({ audience }: { audience: EventCardData["audience"] }) {
  const label = audience === "members" ? "MEMBERS" : audience === "college" ? "COLLEGE" : "OPEN";
  return (
    <span className="retro border-2 border-[#22c55e] px-2 py-1 text-[8px] text-[#22c55e]">
      {label}
    </span>
  );
}

function EventDetail({ data, open }: { data: EventCardData; open: boolean }) {
  return (
    <div
      className="flex w-full max-w-xl flex-col gap-6"
      style={{
        opacity: open ? 1 : 0,
        transform: `translateX(${open ? 0 : 40}px)`,
        transition:
          "opacity 400ms var(--ease-out-quart), transform 400ms var(--ease-out-quart)",
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <AudienceBadge audience={data.audience} />
        <h3 className="retro text-2xl text-white">{data.title}</h3>
      </div>
      <p className="retro text-[10px] text-[#22c55e]">
        {[data.dateLabel, data.location].filter(Boolean).join(" · ")}
      </p>
      {data.description && (
        <p className="text-sm leading-relaxed text-muted-foreground">{data.description}</p>
      )}
      {data.capacityLabel && (
        <p className="retro text-[9px] text-muted-foreground">{data.capacityLabel}</p>
      )}
      {data.registrationClosed ? (
        <span className="retro w-fit border-2 border-white/20 px-4 py-3 text-[9px] text-white/50">
          REGISTRATION CLOSED
        </span>
      ) : (
        <Link
          href={`/events/${data.id}/register`}
          className="retro inline-flex w-fit cursor-pointer items-center gap-2 border-2 border-[#22c55e] px-4 py-3 text-[9px] text-[#22c55e] transition-colors duration-200 hover:bg-[#22c55e] hover:text-[#0a0a0a]"
        >
          REGISTER ▸
        </Link>
      )}
    </div>
  );
}

export function EventsSection({ events }: { events: EventCardData[] }) {
  const { selected, detailOpen, flipRef, open, close } = useFlipDetail();
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const active = events.find((e) => e.id === selected) ?? null;

  return (
    <section id="events" className="relative w-full scroll-mt-24 px-6 py-24">
      <SectionHeading text="EVENTS" />

      {events.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event, i) => (
            <PixelReveal key={event.id} delayMs={i * 70}>
              <div
                ref={(el) => { cardRefs.current[event.id] = el; }}
                role="button"
                tabIndex={0}
                onClick={() => open(event.id, cardRefs.current[event.id]!)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open(event.id, cardRefs.current[event.id]!);
                  }
                }}
                className="cursor-pointer"
              >
                <EventCard data={event} />
              </div>
            </PixelReveal>
          ))}
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 overflow-y-auto bg-[#0a0a0a] px-[6%] pt-24 lg:flex-row lg:gap-16">
          <button
            onClick={close}
            aria-label="Close event details"
            className="retro absolute right-8 top-24 z-10 cursor-pointer border-2 border-white/20 px-3 py-2 text-xs text-white/70 transition-colors duration-200 hover:border-[#22c55e] hover:text-[#22c55e]"
          >
            ✕
          </button>
          <div ref={flipRef} className="w-full max-w-sm shrink-0">
            <EventCard data={active} />
          </div>
          <EventDetail data={active} open={detailOpen} />
        </div>
      )}
    </section>
  );
}
```

Note: import the `EventCardData` type export still works; keep exporting it. Add `import type` for audience usage in `page.tsx`.

- [ ] **Step 3: Manual verification**

Run `bun run dev`. Click an event card → it flies left, detail slides in on the right with a REGISTER button; Escape and ✕ close it. A full/past event shows REGISTRATION CLOSED.

- [ ] **Step 4: Lint + commit**

```bash
bun run lint
git add "app/(main)/_sections/EventsSection.tsx" "app/(main)/page.tsx"
git commit -m "feat(events): click-to-expand master/detail overlay with register CTA"
```

---

### Task 3.3: Pixel form-field renderer component

**Files:**
- Create: `app/(main)/events/[id]/register/PixelFormField.tsx`

- [ ] **Step 1: Implement the field renderer**

```tsx
"use client";

import { Label } from "@/components/ui/8bit-label";
import { Input } from "@/components/ui/8bit-input";
import type { FormFieldDef } from "@/lib/forms";

interface Props {
  field: FormFieldDef;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}

const inputBase =
  "w-full bg-black border-2 border-white/15 px-4 py-3 text-xs font-mono text-white placeholder:text-zinc-700 focus:outline-none focus:border-[#22c55e] transition-colors";

export function PixelFormField({ field, value, error, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="retro text-[9px] tracking-widest text-[#22c55e]">
        {field.label}
        {field.required && <span className="text-red-400"> *</span>}
      </Label>
      {field.description && (
        <p className="text-[11px] text-muted-foreground">{field.description}</p>
      )}

      {field.type === "paragraph" ? (
        <textarea
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputBase} min-h-[120px] resize-none`}
        />
      ) : field.type === "dropdown" ? (
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputBase} appearance-none`}
        >
          <option value="">Select…</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : field.type === "single_choice" ? (
        <div className="flex flex-col gap-2">
          {(field.options ?? []).map((o) => (
            <label key={o} className="flex cursor-pointer items-center gap-3 text-xs text-white">
              <input
                type="radio"
                name={field.id}
                checked={value === o}
                onChange={() => onChange(o)}
                className="accent-[#22c55e]"
              />
              {o}
            </label>
          ))}
        </div>
      ) : field.type === "multi_choice" ? (
        <div className="flex flex-col gap-2">
          {(field.options ?? []).map((o) => {
            const arr = Array.isArray(value) ? (value as string[]) : [];
            return (
              <label key={o} className="flex cursor-pointer items-center gap-3 text-xs text-white">
                <input
                  type="checkbox"
                  checked={arr.includes(o)}
                  onChange={(e) =>
                    onChange(
                      e.target.checked ? [...arr, o] : arr.filter((v) => v !== o),
                    )
                  }
                  className="accent-[#22c55e]"
                />
                {o}
              </label>
            );
          })}
        </div>
      ) : (
        <Input
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "email" ? "email" : "text"}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputBase}
        />
      )}

      {error && <p className="retro text-[8px] text-red-400">{error}</p>}
    </div>
  );
}
```

(If `8bit-input`/`8bit-label` props differ, fall back to plain `<input>`/`<label>` with `inputBase` — verify the component prop surface before wiring.)

- [ ] **Step 2: Typecheck + commit**

```bash
bunx tsc --noEmit
git add "app/(main)/events/[id]/register/PixelFormField.tsx"
git commit -m "feat(register): pixel form-field renderer for all field types"
```

---

### Task 3.4: Registration page + client form

**Files:**
- Create: `app/(main)/events/[id]/register/page.tsx`
- Create: `app/(main)/events/[id]/register/RegistrationForm.tsx`

- [ ] **Step 1: Implement the server page**

```tsx
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseFormSchema, type EventAudience } from "@/lib/forms";
import { RegistrationForm } from "./RegistrationForm";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await db.event.findUnique({
    where: { id },
    include: { _count: { select: { registrations: true } } },
  });
  if (!event || !event.isPublished) notFound();

  const audience = event.audience as EventAudience;
  const session = await auth();

  if (audience === "members" && !session) {
    redirect(`/login?callbackUrl=/events/${id}/register`);
  }

  const deadline = event.registrationDeadline ?? event.eventDate;
  const closed =
    (event.capacity != null && event._count.registrations >= event.capacity) ||
    (deadline ? new Date() > deadline : false);

  return (
    <RegistrationForm
      eventId={event.id}
      title={event.title}
      audience={audience}
      closed={closed}
      schema={parseFormSchema(event.formSchema)}
      prefill={
        audience === "members" && session
          ? { name: session.user.name ?? "", email: session.user.email ?? "" }
          : null
      }
    />
  );
}
```

- [ ] **Step 2: Implement the client form**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card } from "@/components/ui/8bit-card";
import { Label } from "@/components/ui/8bit-label";
import { Input } from "@/components/ui/8bit-input";
import {
  validateSubmission,
  type EventAudience,
  type FormFieldDef,
} from "@/lib/forms";
import { PixelFormField } from "./PixelFormField";

const inputBase =
  "w-full bg-black border-2 border-white/15 px-4 py-3 text-xs font-mono text-white placeholder:text-zinc-700 focus:outline-none focus:border-[#22c55e] transition-colors";

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
        <p className="retro text-sm text-white">YOU'RE REGISTERED!</p>
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
          <Input className={inputBase} value={name} onChange={(e) => setName(e.target.value)} />
          {errors.name && <p className="retro text-[8px] text-red-400">{errors.name}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label className="retro text-[9px] tracking-widest text-[#22c55e]">EMAIL *</Label>
          <Input
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
            <Input className={inputBase} value={usn} onChange={(e) => setUsn(e.target.value)} />
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
```

- [ ] **Step 3: Manual verification**

Run `bun run dev`. Create a published public event with a couple of custom fields (after Phase 4 admin exists, or seed via API/DB). Visit `/events/<id>/register`. Submit empty → inline errors. Submit valid → success screen. Submit same email again → toast "already registered". For a `members` event while signed-out → redirect to login.

- [ ] **Step 4: Lint + commit**

```bash
bun run lint
git add "app/(main)/events/[id]/register"
git commit -m "feat(register): public registration page + client form with validation"
```

---

# PHASE 4 — Task 2: Admin 8-bit revamp

### Task 4.1: Shared 8-bit admin primitives

**Files:**
- Create: `components/admin/PixelPanel.tsx`
- Create: `components/admin/PixelPageHeader.tsx`
- Create: `components/admin/PixelStatTile.tsx`
- Create: `components/admin/PixelDataTable.tsx`

- [ ] **Step 1: `PixelPanel.tsx`**

```tsx
import { cn } from "@/lib/utils";

export function PixelPanel({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-2 border-white/10 bg-black/60", className)}>
      {title && (
        <header className="retro border-b-2 border-white/10 px-5 py-3 text-[9px] tracking-widest text-[#22c55e]">
          {title}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
```

- [ ] **Step 2: `PixelPageHeader.tsx`**

```tsx
export function PixelPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-6 border-b-2 border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-2">
        <h1 className="retro text-2xl uppercase tracking-wider text-white">{title}</h1>
        {subtitle && (
          <p className="retro text-[8px] tracking-[0.3em] text-zinc-600">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-end gap-3">{actions}</div>}
    </header>
  );
}
```

- [ ] **Step 3: `PixelStatTile.tsx`**

```tsx
export function PixelStatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-2 border-[#22c55e]/20 bg-[#22c55e]/[0.05] px-5 py-4">
      <div className="retro text-[8px] tracking-widest text-zinc-500">{label}</div>
      <div className="retro mt-2 text-2xl text-[#22c55e]">{value}</div>
    </div>
  );
}
```

- [ ] **Step 4: `PixelDataTable.tsx`** (generic, replaces `TacticalTable`)

```tsx
import { cn } from "@/lib/utils";

export interface PixelColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right";
}

export function PixelDataTable<T>({
  data,
  columns,
  empty = "NO RECORDS",
}: {
  data: T[];
  columns: PixelColumn<T>[];
  empty?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="retro border-2 border-white/10 px-5 py-10 text-center text-[9px] text-zinc-600">
        {empty}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto border-2 border-white/10">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-white/10">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "retro px-4 py-3 text-[8px] tracking-widest text-zinc-500",
                  c.align === "right" ? "text-right" : "text-left",
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn("px-4 py-3 text-xs text-white", c.align === "right" && "text-right")}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck + commit**

```bash
bunx tsc --noEmit
git add components/admin
git commit -m "feat(admin): shared 8-bit admin primitives"
```

---

### Task 4.2: Admin sidebar — pixel styling + EXIT TO ORBIT

**Files:**
- Modify: `components/layout/AdminSidebar.tsx`

- [ ] **Step 1: Add the public-site return link**

Add an `ExternalLink`/`Home` import from `lucide-react`, and place a prominent link at the **top of the `<nav>`**, above `navItems`:

```tsx
<Link
  href="/"
  className="retro mb-4 flex items-center gap-3 border-2 border-[#22c55e]/50 bg-[#22c55e]/[0.08] px-4 py-3 text-[9px] tracking-widest text-[#22c55e] transition-all hover:bg-[#22c55e] hover:text-black"
>
  <Home className="h-4 w-4" /> ← EXIT TO ORBIT
</Link>
```

- [ ] **Step 2: Manual verification**

`bun run dev`, visit `/admin`. The "EXIT TO ORBIT" link sits at the top of the nav and returns to `/`.

- [ ] **Step 3: Commit**

```bash
git add components/layout/AdminSidebar.tsx
git commit -m "feat(admin): prominent return-to-public-site link in sidebar"
```

---

### Task 4.3: Event Form Builder component

**Files:**
- Create: `app/admin/events/_form/FormBuilder.tsx`
- Create: `app/admin/events/_form/types.ts` (re-export shared types for convenience)

- [ ] **Step 1: `types.ts`**

```ts
export type { FormFieldDef, FieldType } from "@/lib/forms";
export { FIELD_TYPE_LABELS, CHOICE_TYPES } from "@/lib/forms";
```

- [ ] **Step 2: `FormBuilder.tsx`**

A controlled component: takes `value: FormFieldDef[]` and `onChange`. Supports add field (type picker), edit label/description/required/placeholder/pattern, edit options for choice types, reorder via up/down buttons (keyboard-accessible; drag optional), and delete. Includes a collapsible live preview using `PixelFormField`.

```tsx
"use client";

import { PixelFormField } from "@/app/(main)/events/[id]/register/PixelFormField";
import {
  CHOICE_TYPES,
  FIELD_TYPE_LABELS,
  type FieldType,
  type FormFieldDef,
} from "@/lib/forms";

const ALL_TYPES = Object.keys(FIELD_TYPE_LABELS) as FieldType[];
const ctl = "bg-black border-2 border-white/15 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#22c55e]";

export function FormBuilder({
  value,
  onChange,
}: {
  value: FormFieldDef[];
  onChange: (next: FormFieldDef[]) => void;
}) {
  const update = (id: string, patch: Partial<FormFieldDef>) =>
    onChange(value.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const remove = (id: string) => onChange(value.filter((f) => f.id !== id));
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };
  const add = (type: FieldType) =>
    onChange([
      ...value,
      {
        id: crypto.randomUUID(),
        type,
        label: "Untitled question",
        required: false,
        options: CHOICE_TYPES.includes(type) ? ["Option 1"] : undefined,
      },
    ]);

  return (
    <div className="flex flex-col gap-6">
      {value.map((f, idx) => (
        <div key={f.id} className="border-2 border-white/10 bg-black/40 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="retro text-[8px] text-zinc-500">{FIELD_TYPE_LABELS[f.type]}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => move(idx, -1)} className="retro border-2 border-white/15 px-2 py-1 text-[8px] text-white/70">▲</button>
              <button type="button" onClick={() => move(idx, 1)} className="retro border-2 border-white/15 px-2 py-1 text-[8px] text-white/70">▼</button>
              <button type="button" onClick={() => remove(f.id)} className="retro border-2 border-red-500/40 px-2 py-1 text-[8px] text-red-400">✕</button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input className={ctl} value={f.label} placeholder="Question label" onChange={(e) => update(f.id, { label: e.target.value })} />
            <select className={`${ctl} appearance-none`} value={f.type} onChange={(e) => {
              const type = e.target.value as FieldType;
              update(f.id, { type, options: CHOICE_TYPES.includes(type) ? (f.options ?? ["Option 1"]) : undefined });
            }}>
              {ALL_TYPES.map((t) => <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>)}
            </select>
            <input className={ctl} value={f.description ?? ""} placeholder="Help text (optional)" onChange={(e) => update(f.id, { description: e.target.value })} />
            <input className={ctl} value={f.placeholder ?? ""} placeholder="Placeholder (optional)" onChange={(e) => update(f.id, { placeholder: e.target.value })} />
          </div>
          {CHOICE_TYPES.includes(f.type) && (
            <div className="mt-3 flex flex-col gap-2">
              {(f.options ?? []).map((opt, oi) => (
                <div key={oi} className="flex gap-2">
                  <input className={`${ctl} flex-1`} value={opt} onChange={(e) => {
                    const options = [...(f.options ?? [])];
                    options[oi] = e.target.value;
                    update(f.id, { options });
                  }} />
                  <button type="button" className="retro border-2 border-white/15 px-2 text-[8px] text-white/60" onClick={() => update(f.id, { options: (f.options ?? []).filter((_, k) => k !== oi) })}>✕</button>
                </div>
              ))}
              <button type="button" className="retro w-fit border-2 border-white/15 px-3 py-1 text-[8px] text-[#22c55e]" onClick={() => update(f.id, { options: [...(f.options ?? []), `Option ${(f.options?.length ?? 0) + 1}`] })}>+ ADD OPTION</button>
            </div>
          )}
          <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-[10px] text-white">
            <input type="checkbox" checked={f.required} onChange={(e) => update(f.id, { required: e.target.checked })} className="accent-[#22c55e]" />
            Required
          </label>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        {ALL_TYPES.map((t) => (
          <button key={t} type="button" onClick={() => add(t)} className="retro border-2 border-[#22c55e]/40 px-3 py-2 text-[8px] text-[#22c55e] hover:bg-[#22c55e]/10">
            + {FIELD_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {value.length > 0 && (
        <details className="border-2 border-white/10 bg-black/40 p-4">
          <summary className="retro cursor-pointer text-[9px] text-[#22c55e]">LIVE PREVIEW</summary>
          <div className="mt-4 flex flex-col gap-5">
            {value.map((f) => (
              <PixelFormField key={f.id} field={f} value={undefined} onChange={() => {}} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
bunx tsc --noEmit
git add app/admin/events/_form
git commit -m "feat(admin): Google-Forms-style registration form builder"
```

---

### Task 4.4: Rebuild event create form (8-bit) with audience + form builder + banner upload

**Files:**
- Modify: `app/admin/events/new/EventCreationForm.tsx` (full rewrite to 8-bit)

- [ ] **Step 1: Rewrite `EventCreationForm`**

State now includes `audience`, `capacity`, `registrationDeadline`, `bannerUrl`, and `formSchema: FormFieldDef[]`. Banner upload posts to `/api/admin/upload`. Submit posts the full payload to `/api/events`. Use sonner toasts (not `alert`). Use the pixel control styling (`ctl`). Skeleton:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PixelPanel } from "@/components/admin/PixelPanel";
import { FormBuilder } from "../_form/FormBuilder";
import type { FormFieldDef } from "@/lib/forms";

const ctl = "w-full bg-black border-2 border-white/15 px-4 py-3 text-xs font-mono text-white placeholder:text-zinc-700 focus:outline-none focus:border-[#22c55e]";

export default function EventCreationForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [f, setF] = useState({
    title: "", eventType: "WORKSHOP", description: "", eventDate: "",
    location: "", audience: "public", capacity: "", registrationDeadline: "",
    bannerUrl: "", isPublished: "false",
  });
  const [schema, setSchema] = useState<FormFieldDef[]>([]);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const uploadBanner = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      set("bannerUrl", data.url);
      toast.success("Banner uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title || !f.eventDate) {
      toast.error("Title and date are required");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: f.title,
            eventType: f.eventType,
            description: f.description,
            eventDate: new Date(f.eventDate).toISOString(),
            location: f.location,
            audience: f.audience,
            capacity: f.capacity ? Number(f.capacity) : null,
            registrationDeadline: f.registrationDeadline
              ? new Date(f.registrationDeadline).toISOString() : null,
            bannerUrl: f.bannerUrl || null,
            formSchema: schema,
            isPublished: f.isPublished === "true",
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success("Event created");
        router.push("/admin/events");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create event");
      }
    });
  };

  return (
    <form onSubmit={submit} className="flex max-w-3xl flex-col gap-8">
      <PixelPanel title="01 · DETAILS">
        {/* title, eventType select, description textarea, eventDate, location — all using `ctl` */}
      </PixelPanel>
      <PixelPanel title="02 · AUDIENCE & CAPACITY">
        {/* audience select (members/college/public), capacity number, registrationDeadline datetime-local */}
      </PixelPanel>
      <PixelPanel title="03 · BANNER">
        {/* <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadBanner(e.target.files[0])} /> + preview of f.bannerUrl; show "uploading…" when uploading */}
      </PixelPanel>
      <PixelPanel title="04 · REGISTRATION FORM">
        <FormBuilder value={schema} onChange={setSchema} />
      </PixelPanel>
      <PixelPanel title="05 · DEPLOYMENT">
        {/* isPublished select draft/publish */}
      </PixelPanel>
      <button type="submit" disabled={isPending || uploading} className="retro w-fit border-2 border-[#22c55e] px-6 py-3 text-[10px] text-[#22c55e] hover:bg-[#22c55e] hover:text-black disabled:opacity-50">
        {isPending ? "CREATING…" : "CREATE EVENT"}
      </button>
    </form>
  );
}
```

Fill each `PixelPanel` body with the labelled controls (use the `ctl` class). Mirror the field set described in comments. Audience `<select>` options: `public` → "Anyone (public)", `college` → "College only (USN required)", `members` → "Members only".

- [ ] **Step 2: Manual verification**

`bun run dev` → `/admin/events/new`. Create an event with audience=college, capacity=2, a custom dropdown + checkbox field, and a banner upload. Confirm it appears in the events list and on the public site, and that `/events/<id>/register` renders the custom fields + USN.

- [ ] **Step 3: Lint + commit**

```bash
bun run lint
git add app/admin/events/new/EventCreationForm.tsx
git commit -m "feat(admin): 8-bit event creation with audience, banner upload, form builder"
```

---

### Task 4.5: Event edit page (reuse the create form)

**Files:**
- Create: `app/admin/events/[id]/edit/page.tsx`
- Refactor: extract the create form body into a shared `EventForm` used by both new + edit, OR have edit POST to PATCH. Simplest: parameterize `EventCreationForm` with optional `initial` + `eventId` props and switch POST→PATCH when editing.

- [ ] **Step 1: Parameterize the form**

Rename the default export usage: give `EventCreationForm` optional props `{ eventId?: string; initial?: Partial<typeof f> & { formSchema?: FormFieldDef[] } }`. When `eventId` is set, submit via `PATCH /api/events/${eventId}` and toast "Event updated". Seed `useState` from `initial`.

- [ ] **Step 2: Create the edit page**

```tsx
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";
import { db } from "@/lib/db";
import { parseFormSchema } from "@/lib/forms";
import EventCreationForm from "../../new/EventCreationForm";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role)) redirect("/");
  const { id } = await params;
  const e = await db.event.findUnique({ where: { id } });
  if (!e) notFound();

  const toLocal = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 16) : "");
  return (
    <div className="p-8">
      <EventCreationForm
        eventId={e.id}
        initial={{
          title: e.title,
          eventType: e.eventType ?? "WORKSHOP",
          description: e.description ?? "",
          eventDate: toLocal(e.eventDate),
          location: e.location ?? "",
          audience: e.audience,
          capacity: e.capacity?.toString() ?? "",
          registrationDeadline: toLocal(e.registrationDeadline),
          bannerUrl: e.bannerUrl ?? "",
          isPublished: e.isPublished ? "true" : "false",
          formSchema: parseFormSchema(e.formSchema),
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck, manual edit test, commit**

```bash
bunx tsc --noEmit
git add app/admin/events
git commit -m "feat(admin): event edit page reusing the event form"
```

---

### Task 4.6: Events list + roster + CSV (8-bit)

**Files:**
- Modify: `app/admin/events/page.tsx` (pixel header/stats; keep server query)
- Modify: `app/admin/events/EventTable.tsx` (use `PixelDataTable`, add EDIT button, sonner)
- Modify: `app/admin/events/[id]/page.tsx` (roster reads Registration identity)
- Modify: `app/admin/events/[id]/EventRosterClient.tsx` (responses view + CSV button)

- [ ] **Step 1: Rebuild the events list page header with pixel primitives**

Replace `TacticalCard`/`TacticalButton` usage with `PixelPageHeader` + `PixelStatTile`. Keep the `db.event.findMany` query but also `select: { audience: true }`. Pass events to `EventTable`.

- [ ] **Step 2: Rewrite `EventTable`** to use `PixelDataTable<Event>` with columns: title/type, date, audience, status, actions (MANAGE ROSTER → `/admin/events/${id}`, EDIT → `/admin/events/${id}/edit`, DEPLOY/UNPUBLISH via PATCH, DELETE via DELETE). Replace all `alert(...)` with `toast` from sonner; keep `router.refresh()`.

- [ ] **Step 3: Fix the roster server page** (`[id]/page.tsx`). Replace the user-based mapping with Registration-native fields (works for guests):

```tsx
  const eventRaw = await db.event.findUnique({
    where: { id: resolvedParams.id },
    include: { registrations: { orderBy: { registeredAt: "asc" } } },
  });
  if (!eventRaw) notFound();

  const formFields = parseFormSchema(eventRaw.formSchema); // import from "@/lib/forms"
  const formattedRegistrations = eventRaw.registrations.map((reg) => ({
    id: reg.id,
    name: reg.name,
    email: reg.email,
    usn: reg.usn ?? "—",
    attended: reg.attended,
    responses: (reg.responses ?? {}) as Record<string, unknown>,
  }));
```

Pass `eventId`, `registrations`, and `formFields` (id+label list) to `EventRosterClient`. Restyle the header with `PixelPageHeader`.

- [ ] **Step 4: Update `EventRosterClient`** to render via `PixelDataTable` with columns Name, Email, USN, per-field response columns (from `formFields`), Attended (toggle via existing `attendance` route). Add a CSV export button linking to `/api/events/${eventId}/registrations.csv` (an `<a download>`). Replace `alert` with sonner. Verify the existing attendance route shape still matches; adjust the toggle call if needed.

- [ ] **Step 5: Manual verification**

`bun run dev` → `/admin/events`. Confirm pixel styling, EDIT works, roster shows guest registrations + their custom answers, attendance toggle persists, CSV downloads with all columns.

- [ ] **Step 6: Lint + commit**

```bash
bun run lint
git add app/admin/events
git commit -m "feat(admin): 8-bit events list, roster with responses + CSV export"
```

---

### Task 4.7: Convert remaining admin surfaces to 8-bit

**Files (restyle only — preserve behavior):**
- `app/admin/page.tsx` (overview/dashboard)
- `app/admin/loading.tsx`
- `app/admin/members/page.tsx`, `MemberTable.tsx`, `AllowlistManager.tsx`
- `app/admin/requests/page.tsx`, `RequestsTable.tsx`
- `app/admin/projects/page.tsx`, `ProjectTable.tsx`
- `app/admin/leaderboard/page.tsx`, `WeightForm.tsx`
- `app/admin/settings/page.tsx`

- [ ] **Step 1: Overview dashboard**

Rebuild `app/admin/page.tsx` using `PixelPageHeader` + a grid of `PixelStatTile` (total members, pending requests, total events, total registrations) and a `PixelPanel` listing upcoming events with their registration counts. Pull counts via `db.*.count()` / `groupBy`. Replace any `Tactical*`.

- [ ] **Step 2: Members / Requests / Projects tables**

For each `*Table.tsx`, swap `TacticalTable` → `PixelDataTable`, `TacticalButton` → pixel `<button>` (the `retro border-2 ...` pattern), and `alert` → sonner. Keep all handlers and routes identical. Restyle each `page.tsx` header with `PixelPageHeader`/`PixelStatTile`/`PixelPanel`.

- [ ] **Step 3: Leaderboard + Settings**

Restyle `WeightForm.tsx` and the settings page controls with pixel `ctl` inputs and `PixelPanel` sections; replace `Tactical*` and `alert`.

- [ ] **Step 4: Replace `loading.tsx`** with a pixel loader (reuse `TacticalLoading`'s behavior in a pixel shell or a simple `retro` "LOADING…" panel).

- [ ] **Step 5: Remove dead Tactical components**

Run `bunx knip` (already a dependency) to confirm `components/ui/Tactical*` are unreferenced, then delete the now-unused `TacticalCard/Button/Table/Feedback/Loading` files. If knip reports remaining references, fix those imports first.

- [ ] **Step 6: Verify + commit**

```bash
bunx tsc --noEmit && bun run lint
git add app/admin components/ui
git commit -m "feat(admin): convert all admin surfaces to 8-bit; remove Tactical system"
```

---

# PHASE 5 — Final verification

### Task 5.1: Full regression pass

- [ ] **Step 1: Automated checks**

```bash
bun test lib
bunx tsc --noEmit
bun run lint
bun run build
```
Expected: tests pass, no type errors, lint clean, build succeeds.

- [ ] **Step 2: End-to-end manual script**

1. Carousel: drag Members over a photo (mouse + touch) — slides, no ghost.
2. Admin → create public event (capacity 2, 1 dropdown + 1 checkbox + 1 paragraph), upload banner, publish.
3. Public: event card expands, REGISTER → form shows custom fields, submit twice with same email → 2nd blocked; fill capacity → "Event is full".
4. Create college event → USN required + pattern; members event → guest redirected to login.
5. Admin roster shows responses; toggle attendance; download CSV; edit event; delete event.
6. Click through every admin page — all 8-bit, EXIT TO ORBIT works.

- [ ] **Step 3: Final commit (if any tweaks)**

```bash
git add -A
git commit -m "chore: regression fixes from end-to-end pass"
```

---

## Self-review notes (coverage map)

- Task 1 (events expand + registration): Tasks 3.1–3.4, backend 2.1; admin config 4.3–4.5. ✓
- Task 2 (admin revamp + CRUD + backend): Tasks 4.1–4.7, 2.2, 2.3, 1.4. ✓
- Task 3 (carousel fix): Task 0.1. ✓
- Audience members/college/public: schema 1.1, validator 1.2, route 2.1, form 3.4, builder 4.4. ✓
- Supabase upload: 1.3, 1.4, 4.4. ✓
- Dedupe one-per-email: schema 1.1 unique + route 2.1 P2002. ✓
- CSV export (Google-Forms parity): 2.3 + 4.6. ✓
- Loading/error states: toasts + disabled controls throughout 3.4, 4.4, 4.6. ✓
