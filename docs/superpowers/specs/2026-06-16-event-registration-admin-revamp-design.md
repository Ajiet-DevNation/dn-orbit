# Event Registration, Admin 8-bit Revamp & Carousel Fix — Design

**Date:** 2026-06-16
**Status:** Approved (design phase)

## Overview

Three independent workstreams on the ORBIT (dn-orbit) codebase:

1. **Event registration flow** — public events get a click-to-expand master/detail
   overlay with a **Register** button leading to a dedicated, from-scratch 8-bit
   registration form whose fields are admin-configurable (Google-Forms style).
2. **Admin dashboard revamp** — discard the current "Tactical" design system and
   rebuild the entire admin panel in the public 8-bit/pixel theme, with a
   foolproof event-CRUD + form-builder workflow and robust backend wiring.
3. **Member carousel drag fix** — stop `<img>` elements from hijacking carousel
   drag with native image-dragging.

The three are independent and can ship in any order. Task 3 is trivial and ships
first; Task 1 and Task 2 share the new data model and registration backend.

## Locked product decisions

| Decision | Choice |
| --- | --- |
| Admin theme | Full conversion to the public 8-bit/pixel theme; retire `Tactical*` |
| Events layout | Keep the grid; add click-to-expand FLIP overlay (mirrors `ProjectDetail`) |
| Who registers | Guests allowed; **per-event audience**: `members` / `college` / `public` |
| "College only" check | Required USN/college-ID field, pattern validation (honor system) |
| Dedupe | One registration per email per event |
| Form field types | short text, paragraph, email, number, date, single-choice, multi-choice, dropdown — Google-Forms-like |
| Banner/image storage | **Supabase Storage** |

## Current-state facts (from codebase audit)

- Public site uses the strict 8-bit theme: `retro` font, `components/ui/8bit-*`,
  accent green `#22c55e`. `ProjectsSection` owns the coverflow + FLIP master/detail
  (`flipRef`, `clickedRectRef`, `useLayoutEffect`). `EventsSection` is a static
  responsive grid fed DB events from `app/(main)/page.tsx`.
- Admin uses a separate "Tactical" system: `components/ui/Tactical*`, `font-mono`,
  military/terminal styling. Pages: overview, members, requests, events, projects,
  leaderboard, settings. `app/admin/layout.tsx` + `components/layout/AdminSidebar.tsx`.
- Registration today: `POST /api/events/[id]/register` — single-click, approved
  members only, `Registration(userId, eventId)` with `@@unique([userId, eventId])`.
  No form fields anywhere.
- `app/admin/events/[id]/page.tsx` roster reads identity from `reg.user`
  (name/usn) — this **breaks for guest registrations** and must change.
- `useCoverflow` drives drag via pointer events on the stage; card `<img>`s lack
  `draggable={false}` → native drag ghosting (Task 3 root cause).
- No file-upload/storage infra exists; `bannerUrl` is a pasted URL today.

## Data model changes (Prisma)

```prisma
enum EventAudience {
  members
  college
  public
}

model Event {
  // ...existing fields...
  audience             EventAudience @default(public)
  capacity             Int?          // null = unlimited
  registrationDeadline DateTime?     @map("registration_deadline") // null = until eventDate
  formSchema           Json?         @map("form_schema") // ordered FormFieldDef[]
}

model Registration {
  id           String   @id @default(uuid())
  userId       String?  @map("user_id")   // NULLABLE now (guests)
  eventId      String   @map("event_id")
  name         String                      // captured every submission
  email        String                      // dedupe key
  usn          String?                      // college events
  responses    Json     @default("{}")      // { [fieldId]: value }
  attended     Boolean  @default(false)
  registeredAt DateTime @default(now()) @map("registered_at")

  user  User? @relation(fields: [userId], references: [id], onDelete: SetNull)
  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@unique([eventId, email]) // replaces @@unique([userId, eventId])
  @@map("registrations")
}
```

Migration notes: existing `Registration` rows have no `name`/`email`. The migration
backfills `email`/`name` from the related `User` before adding the NOT NULL + new
unique constraint, and relaxes `userId` to nullable with `onDelete: SetNull`.

### Form schema JSON shape

`Event.formSchema` is an ordered array of field definitions:

```ts
type FieldType =
  | "short_text" | "paragraph" | "email" | "number" | "date"
  | "single_choice" | "multi_choice" | "dropdown";

interface FormFieldDef {
  id: string;            // stable uuid; key into Registration.responses
  type: FieldType;
  label: string;
  description?: string;
  required: boolean;
  placeholder?: string;
  options?: string[];    // single_choice | multi_choice | dropdown
  pattern?: string;      // optional regex (e.g. USN format)
}
```

**Built-in fields** (not stored in `formSchema`, always rendered first):
- **Name** — always, required.
- **Email** — always, required, format-validated, dedupe key.
- **USN/College ID** — rendered + required only when `audience = college`; optional
  regex pattern (sensible default, admin-overridable).

Admin-defined custom fields render after the built-ins. A shared module
(`lib/forms.ts`) holds the `FormFieldDef` types + a pure `validateSubmission()`
used by **both** the client renderer and the server route (single source of truth).

## API changes

- **Rewrite** `POST /api/events/[id]/register`:
  - Body `{ name, email, usn?, responses }`.
  - `audience=members` → require approved session; prefill/lock name+email from the
    account; reject guests (302 to sign-in handled client-side).
  - `audience=college` → USN required + pattern check.
  - `audience=public` → open.
  - Validate the whole submission server-side via `lib/forms.validateSubmission()`
    against `event.formSchema` (required, email format, choice ∈ options, number/date
    parse, pattern).
  - Enforce `capacity` (count check) and `registrationDeadline`.
  - Dedupe via `(eventId, email)` unique → clear `409` on duplicate.
  - Returns `201` with the registration id.
- **Extend** `POST /api/events` and `PATCH /api/events/[id]` to accept
  `audience, capacity, registrationDeadline, formSchema, bannerUrl`.
- **New** `POST /api/admin/upload` (NextAuth admin-gated): accepts a file, uploads
  to Supabase Storage bucket `event-banners`, returns the public URL.
- **New** `GET /api/events/[id]/registrations.csv` (admin-gated): roster + flattened
  responses as CSV (Google-Forms-style export).

## Supabase Storage integration

Per the provided Supabase setup:
- `npm i @supabase/supabase-js @supabase/ssr`.
- Add `utils/supabase/server.ts` and `utils/supabase/client.ts` (browser) clients
  using `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- We do **not** adopt Supabase Auth; the existing middleware (`proxy.ts`) stays as
  is — no Supabase session middleware is wired (auth remains NextAuth).
- Bucket: `event-banners`, **public read**. Uploads go through our admin-gated
  `POST /api/admin/upload` route. Server-side upload uses a **service-role key**
  (`SUPABASE_SERVICE_ROLE_KEY`, added to `.env`) so writes don't depend on a
  permissive anon RLS policy. Public read URLs are returned for storage in
  `Event.bannerUrl`. (If a service-role key is unavailable, fallback is a public
  bucket with an anon insert policy + browser-side upload — noted but not preferred.)
- Env additions documented in `.env.example`.

## Task 1 — Public events expand + registration page

- `EventsSection`: keep the grid. Extract the FLIP master/detail mechanism shared
  with `ProjectsSection` into a small reusable helper/hook (`useFlipDetail`) to avoid
  duplicating the FLIP math. Clicking a card opens an overlay: the clicked card flies
  to the left, a detail panel (`EventDetail`) slides in on the right with description,
  date/location, audience badge, capacity/deadline status, and a **REGISTER** button.
- New route `app/(main)/events/[id]/register/page.tsx` (server component): loads the
  published event + `formSchema`; if `audience=members` and not signed-in, redirect to
  sign-in with return URL. Renders a client `RegistrationForm`.
- `RegistrationForm` (client): from-scratch 8-bit form built from `8bit-input`,
  `8bit-label`, `8bit-select`, and new `PixelFormField` components per field type.
  Client validation mirrors `lib/forms.validateSubmission()`. States: idle, submitting
  (disabled + spinner), success (pixel success screen), error (sonner toast + inline
  field errors). Members get name/email/usn prefilled and email locked.
- Closed/full/past events show a disabled state with the reason.

## Task 2 — Admin 8-bit revamp

- **Shared 8-bit admin primitives** (new): `PixelPanel`, `PixelStatTile`,
  `PixelDataTable`, `PixelPageHeader` — composed from existing `8bit-*` components.
  Retire `Tactical*` (`TacticalCard/Button/Table/Feedback/Loading`) once all pages
  are migrated.
- **Sidebar/shell:** convert `AdminSidebar` to pixel styling; add a prominent
  **"← EXIT TO ORBIT"** link to `/` (return to public site).
- **Overview:** rebuilt dashboard — pixel stat tiles (members, pending requests,
  events, total registrations) + simple pixel data viz (e.g. registrations per event
  bar list, upcoming events).
- **Events CRUD + Form Builder:** rebuilt create/edit screen. Sections: identity,
  logistics, audience + capacity + deadline, banner upload (Supabase), and the
  **Form Builder** — add/remove/reorder fields (keyboard + drag), pick type, toggle
  required, edit options/pattern, with a **live preview** of the public form. Edit
  reuses the same component seeded from the event.
- **Roster:** rewritten to read identity from `Registration` (name/email/usn) so it
  works for guests and members; per-registrant responses view; attendance toggle
  (existing `attendance` route); **CSV export** button.
- **Remaining pages** (members, requests, projects, leaderboard, settings): convert
  to 8-bit primitives for consistency. Behavior preserved; only presentation changes.

## Task 3 — Member carousel drag fix

In every carousel card `<img>` (Members; also Projects/Events for consistency):
add `draggable={false}` and classes `select-none [-webkit-user-drag:none]`
(and `pointer-events-none` where the image is purely decorative). Pointer events keep
bubbling to the stage so drag works anywhere on the card, including over photos. No
change to `useCoverflow` logic.

## Error handling & edge cases

- Duplicate email → `409`, friendly "already registered" UI.
- Capacity reached / past deadline / unpublished / members-only-as-guest → blocked
  with explicit reason.
- Form validation failures → inline per-field messages; server is authoritative.
- Upload failures → toast + keep form usable; event save not blocked if banner optional.
- Roster handles null `userId` (guest) and `SetNull` on user delete.
- Loading states on every async admin action (transitions + disabled controls).

## Testing

- `lib/forms.test.ts` — unit tests for `validateSubmission()` across all field types,
  required logic, pattern, audience-driven USN requirement, dedupe-irrelevant paths.
- Manual: register as guest (public + college), as member; duplicate-email; capacity
  full; deadline passed; admin create/edit event with custom fields; banner upload;
  CSV export; carousel drag over a photo on touch + mouse.

## Decomposition / phasing

1. **Task 3** carousel fix (isolated, fast).
2. **Schema + shared modules**: Prisma migration, `lib/forms.ts`, Supabase clients,
   upload route.
3. **Registration backend**: rewrite register route, extend event create/edit API,
   CSV export.
4. **Task 1 public**: shared FLIP helper, events expand overlay, registration page +
   form renderer.
5. **Task 2 admin**: shared pixel primitives + shell + EXIT link; events CRUD + form
   builder + roster + CSV; overview; migrate remaining admin pages.

Each phase is independently verifiable.
