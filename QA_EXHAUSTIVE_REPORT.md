# QA Exhaustive Report — dn-orbit

- **Target:** `http://localhost:3000` (local `next dev`, Next 16.4.2), branch `qa/exhaustive-sweep`
- **Session:** signed in as an admin in Chrome; anonymous checks via `fetch(..., { credentials: "omit" })`
  and a headless Chromium driven over CDP (no session).
- **Browser locale:** `en-IN` / IST, while the server renders in Node's default `en-US` / UTC. Locale and
  time-zone drift is therefore a real hydration risk in this setup, and it is what surfaced B1/B7.
- **DB policy:** `.env` points at a shared Neon database with real data. Agreed scope: **validation-only**
  for write paths. Every permutation was driven up to the server's 4xx; no successful create/edit/delete,
  attendance toggle or approval was submitted. API permutations carried a *sentinel* — a deliberately
  invalid field that zod checks **last** — so the error names the field under test when it is rejected,
  and names the sentinel when the field slipped through, without a row ever being created.
- **Viewports:** the Chrome window is tiled by the WM and ignored `resize_window`, and the app refuses to
  be framed (anti-framing headers — good), so 375 / 768 / 1024 / 1440 px were tested in headless Chromium
  with `Emulation.setDeviceMetricsOverride` on the public pages. Admin pages were checked at 1908 px only.

Legend: `[PASS]` · `[FIXED]` (failed, fixed, re-verified in the browser) · `[FLAG]` (reported, not changed) · `[SKIP]` (out of agreed scope)

**Final gate:** `bunx tsc --noEmit` clean · `bun run lint` 17 warnings (identical to the pre-change baseline) ·
`bun test lib` 391 pass / 0 fail (incl. new tests for B2 and B5).

---

## Bugs

| ID | Sev | Location | Summary | Status |
|----|-----|----------|---------|--------|
| B1 | High | `/` · `components/home/StatsSection.tsx` (Player stats → RANKING) | Hydration error on every signed-in home load: `lcRanking.toLocaleString()` used the runtime locale — server `#4,180,516`, `en-IN` client `#41,80,516`. React discarded and re-rendered the tree. Same call in `LeetCodeConnect`. | [FIXED] |
| B2 | Medium | `POST /api/admin/allowlist` | Accepted any string: `{"githubUsername":"<script>","email":"nope"}` → **200**, row created. An invalid username/email can never match a sign-in, and the admin got no error. Now a zod `allowlistEntrySchema` (GitHub username rule, real email, note ≤ 500). | [FIXED] |
| B3 | High | `/` · MEMBERS lens (`hooks/useCoverflow.ts`) | Arrows, ←/→ keys and card taps were **dead** exactly where the MEMBERS tab / `#members` anchor parks the page. The anchor lands on the entrance end rounded to a whole pixel (20308 of 20308.13), leaving `intro ≈ 0.998`, and every `intro < 1` gate shut. (Projects only worked because its rounding happened to go the other way.) | [FIXED] |
| B4 | Medium | `hooks/useModalBehavior.ts` (via `DetailOverlay`) | `onOpenChange` was an effect dependency; `DetailOverlay` passes an inline arrow, so every re-render of an open overlay tore the modal down and rebuilt it — restoring focus to the card *behind* it, popping/pushing the modal stack and toggling the Lenis scroll lock. Now read through a ref. | [FIXED] |
| B5 | Medium | Event / project detail overlay (`components/ui/DetailOverlay.tsx`) | No `role="dialog"`, `aria-modal` or name, and focus never entered: keyboard/screen-reader users stayed on the card behind and Tab walked the hidden page. Now a named modal dialog that takes focus on open (no trap, by design; focus restores to the card). | [FIXED] |
| B6 | Medium | `/` · NEW PROJECT modal (`TechStackSelect`) | Modal opened scrolled ~775 px down, past TITLE: cmdk auto-selects its first item on mount and calls `scrollIntoView({block:"nearest"})`, which scrolls every scrollable ancestor. The mount-time jump is undone before paint. | [FIXED] |
| B7 | Medium | Header (`V2Header`) at 768–1023 px | The centred tab strip (~520 px) overlapped the ORBIT wordmark and the SIGN IN button. Tabs now from `lg`; the phone "Sections" menu covers everything below. | [FIXED] |
| B8 | Medium | Header tabs at the hero (`V2Header`) | Tab strip faded out (`opacity:0; pointer-events:none`) but still focusable and in the a11y tree. Now `inert` while hidden. | [FIXED] |
| B9 | Low | Leaderboard rankings panel (`LeaderboardSection`) | Same class as B8: while the list is faded out by the scroll scrub, PREV/NEXT stayed focusable. `inert` mirrors the existing `pointerEvents` gate. | [FIXED] |
| B10 | Low | `/recruitments` (`RecruitmentForm`) | Field errors were not linked to inputs (`aria-describedby`) and focus stayed on the button after a failed REVIEW or a server 422. Now linked, and focus moves to the first invalid field. | [FIXED] |
| B11 | Low | Radix `<Select>`s: EventModal, ProjectModal, ProfileModal, admin EventCreationForm, FormBuilder, ProjectTable; admin EventCreationForm text inputs | Visible `<Label>` not linked, so the controls had no accessible name. | [FIXED] |
| B12 | Low | Admin `EventTable` / `ApprovalsQueue` date cells | `toLocaleDateString()` with no locale/zone in client components — B1's hydration class, and a day shift vs. the rest of the site, which pins UTC. Now the shared `formatEventDateLong`. | [FIXED] |
| B13 | Low | `POST/PATCH /api/events` (`dateish`) | `eventDate` / `registrationDeadline` accepted `0`, `-1` (1970/1969) and `999999999999999` (year 33658). Now bounded to 2000–2099. | [FIXED] |
| B14 | Low | `/events/:id/register` | Description lost its line breaks and bullets (`whitespace-pre-line` missing; the home detail view has it). Tab title was the generic "ORBIT · DevNation" — now "Register · <event>" (unpublished titles never leak). | [FIXED] |
| B15 | Low | `/my-events` roster, admin roster | Every attendance toggle read "ATTENDED" / "MARK ATTENDED" with no row or state. Now `aria-label="<name> attended"` + `aria-pressed`. | [FIXED] |
| B16 | Low | Admin allowlist GRANT ACCESS | Pending label `"…"` collapsed the button and reflowed the input row. Same-width "GRANTING…". | [FIXED] |
| B17 | Low | Admin Approvals PROJECTS/EVENTS filter | Active filter not exposed; added `aria-pressed` (matches the Recruitments filter). | [FIXED] |
| F1 | Low | Header scrollspy | Between observed sections (announcements, stats) the last-clicked tab stayed highlighted, and EVENTS showed as active on every non-landing page. The highlight now clears when the active section leaves the centre band, and starts empty. | [FIXED] |
| F2 | Low | 17 admin-guarded route handlers (`app/api/admin/**`, `app/api/events/[id]`) | `!session \|\| !canAccessAdmin` returned 403 to anonymous callers; AGENTS.md says 401 for unauthenticated. Split into 401 `Unauthenticated` / 403 `Forbidden`; `scripts/test-api.mjs` expectations updated (17/17 pass). | [FIXED] |
| F3 | Info | Event "DevNation Inauguration" (DB row) | `registrationDeadline 2026-11-10` was after `eventDate 2025-11-12`. Cleared to `null` via the admin `PATCH /api/events/:id` (approved by the owner); the page still reads closed, now without the stale "REGISTER BY". Previous value: `2026-11-10T18:29:00.000Z`. | [FIXED] |
| F4 | Low | `/recruitments` review step | Showed raw input (`4jk24cs999`, `QA@Example.com`, `@devnation`); now reads back the parsed values the server stores (`4JK24CS999`, `qa@example.com`, `devnation`). | [FIXED] |
| F5 | Info | `/recruitments` | A reload mid-form loses the draft (no per-viewer persistence). Enhancement, not a bug. | [FLAG] |
| F6 | Info | `/events/<bad-id>/register`, `/admin/events/<bad-id>` | 404 UI with HTTP 200 + `noindex`. By design: `app/loading.tsx` starts streaming before `notFound()` runs (Next 16 docs, `not-found.md` "Status codes"). A real 404 needs a DB check in Proxy; the owner chose to keep it. | By design |
| N1 | — | Profile modal avatar | One GitHub avatar URL stalled ~15 s in this Chrome profile (curl 1.5 s; other avatars 570 ms). Environment. | Not a bug |
| N2 | — | `<html data-judo="1">` hydration warning on 404 | Attribute injected by a browser extension. | Not a bug |

### Side effect to know about
B2 was found by the test itself: the payload was accepted and wrote an allowlist row. It was removed at
once through the app's own `DELETE /api/admin/allowlist/:id` (verified: 0 matches remain), but it left an
`allowlist.add` + `allowlist.remove` pair ("Added/Removed <script> …") in the admin audit log. The only other write was the owner-approved F3 fix (one field on one event row).

---

## Inventory & results

### `/` — header
- [FIXED] Tabs EVENTS / LEADERBOARD / PROJECTS / MEMBERS: `inert` at the hero (B8); from `lg` only (B7); each click scrolls its section in (`top ≈ 95px`; projects/members are pinned lens sections and land on card 1)
- [FIXED] `aria-selected` follows clicks and clears between tabbed sections (F1); all four tabs stay keyboard-reachable when none is selected
- [PASS] Brand link, recruitment banner link → `/recruitments`, avatar → EDIT PROFILE
- [PASS] Phone "Sections" menu (375 px, headless): opens with `aria-expanded`, closes on Escape and on outside press, MEMBERS item navigates and closes

### `/` — recruitment popup (once per session)
- [PASS] Appears after the boot splash; `role=dialog`, `aria-modal`, labelled; focus inside and trapped (Tab ×4 wraps)
- [PASS] Escape · X · backdrop all close; scroll lock released; not shown again in the session

### `/` — hero, announcements, footer
- [PASS] Social links external; announcement cards open in a new tab
- [PASS] Footer: mailto, GitHub/LinkedIn with `noopener noreferrer`, `#events/#leaderboard/#projects/#members` anchors land correctly (lens arrows live after B3), `/my-events`
- [PASS] `POST /api/sync` once per load (202)

### `/` — Player stats
- [FIXED] Rank identical on server and client (B1)
- [PASS] ↻ REFRESH → one GitHub + one LC request (200); 3 real rapid clicks → **1** refresh; server rate-limits both routes
- [PASS] CONTACT dialog: labelled, mailto, COPY → "COPIED" + toast, Escape closes

### `/` — NEW EVENT modal
- [PASS] Empty / whitespace title → "Title and date are required", no request
- [PASS] Capacity `0`, `1.5` → blocked client-side; `999999999999` → server 400 shown in toast
- [PASS] 3 rapid CREATE clicks → **1** POST
- [PASS] Deadline after event → blocked; ADD QUESTION with blank label → blocked
- [PASS] `<script>`/emoji/SQL quotes in title kept as text
- [PASS] Escape · X · backdrop close; focus returns; draft kept on dismiss (intentional)
- [FIXED] Selects named (B11) · [SKIP] successful create

### `/` — NEW PROJECT modal
- [FIXED] Opens at the top (B6)
- [PASS] Empty → "Title is required"; no repo → "GitHub repo URL is required"; `javascript:` repo → server 400
- [PASS] Progress clamped 0–100; tech-stack custom `<img src=x onerror=…>` renders as text, removable
- [FIXED] STATUS select named (B11) · [SKIP] successful submit

### `/` — EDIT PROFILE modal
- [PASS] Inputs labelled; BIO capped at 160
- [PASS] SAVE → stacked confirm; Escape closes only the top dialog; name `A` rejected by the server action; profile unchanged after reload
- [FIXED] BRANCH/YEAR named (B11) · [SKIP] successful save

### `/` — Events section
- [PASS] Search: `git` filters; `<script>…' OR '1'='1 🚀 (((` → "No events found" with the query echoed as text; whitespace = all
- [FIXED] Card → detail overlay: named dialog, focus inside, Tab → Close, Enter closes, focus back on the card (B4, B5)

### `/` — Leaderboard
- [PASS] PAGE 1/2: PREV disabled; NEXT → 2/2, NEXT disabled, extra clicks no-op; PREV → 1/2
- [FIXED] PREV/NEXT out of the tab order while the panel is faded (B9)

### `/` — Projects / Members lenses
- [PASS] Projects: NEXT/PREV, 12 rapid NEXTs advance one card (retargets the running scroll), centred card → overlay with `noopener` GitHub link, backdrop closes (~500 ms transition)
- [FIXED] Members: NEXT dead after the tab/anchor jump (B3); now 01 → 02, card flips to the bio

### `/recruitments`
- [PASS] Empty REVIEW → all 9 required fields flagged, no request
- [FIXED] Errors linked + focus to first invalid (B10)
- [PASS] Type → clear → type again clears that field's error; selects via mouse and keyboard
- [PASS] Valid dummy data → REVIEW step; EDIT returns with every value intact · [SKIP] final SUBMIT
- [FIXED] F4 · [FLAG] F5

### `/events/:id/register`
- [PASS] Past event → "REGISTRATION IS CLOSED", no form
- [FIXED] Description formatting + page title (B14)
- [PASS] Bogus UUID and `not-a-uuid'"<x>` → 404 page, no 500

### `/my-events`
- [PASS] Roster expands (`aria-expanded`), table scrolls horizontally, CSV link present (formula-injection guard confirmed in `registrations.csv/route.ts`)
- [FIXED] Attendance toggles named + `aria-pressed` (B15) · [SKIP] toggling attendance

### Auth routes / 404
- [PASS] `/login` and `/onboarding` redirect an onboarded user to `/`
- [PASS] Unknown route → themed 404 with BACK TO ORBIT

### Admin (`/admin/*`, 1908 px)
All 13 routes load with no console errors: dashboard, members, requests, recruitments, events, events/new,
events/:id (roster), events/:id/edit, projects, approvals, leaderboard, settings, plus 404s.
- [PASS] Dashboard log search: plain, case, `<script>`, SQL, whitespace, `((`, emoji, 500 chars — filters or shows "No logs match", no crash
- [FIXED] Allowlist form: URL username / bad email → server 400 surfaced in the toast (B2); stable pending button (B16)
- [PASS] Allowlist empty → client toast, no request
- [PASS] Events table DELETE → confirm dialog with focus on CANCEL; Escape and CANCEL close with **no request**; focus back on DELETE
- [FIXED] New-event form inputs labelled (B11); empty submit blocked client-side
- [PASS] Edit form round-trips stored values (`2026-07-18T09:00` etc.)
- [PASS] Weights: +5% → "1.05 / 1.00", red OFF badge, SAVE disabled; min-stars `-1` clamps to 0, `1.5` rounds, blank disables SAVE, oversize → server 400
- [FIXED] Approvals filter `aria-pressed` (B17); switching works · [SKIP] approve/reject/delete/role changes

### Navigation & responsiveness
- [PASS] `/ → /recruitments → /my-events`, Back, Back, Forward — correct pages, titles and content, no console errors
- [PASS] 375 / 768 / 1024 / 1440 px on `/`, `/recruitments`, `/login`, `/events/:id/register`, 404: no horizontal overflow, no covered controls, no runtime errors (after B7)
- [FIXED] "BACK TO ORBIT" / "BACK TO EVENTS" links were 14 px tall; a pseudo-element now gives them a 44 px hit area (the 8-bit Button's trick), layout unchanged

---

## API permutation matrix (authed admin unless noted)

`POST /api/events` — all **400** naming the field under test: title missing/""/"   "/201 chars/number ·
eventDate ""/garbage/`2026-13-45` · capacity 0/-1/1.5/1e12/"10" · bannerUrl `javascript:`/`data:`/not-a-url ·
audience bogus · eventType 61 · location 301 · description 5001 · malformed JSON · `text/plain` · array body.
Title 200 chars / XSS / SQL / emoji correctly accepted as text. Anonymous → 401. [FIXED] eventDate 0 / -1 / 1e15 (B13).

`POST /api/projects` — all **400**: title "   "/201 · repo missing/`javascript:`/`ftp:`/bare host ·
imageUrl `javascript:` · demoUrl `data:` · techStack 1000 items / `[""]` / string · milestone blank label / non-bool done ·
status bogus · malformed. Anonymous → 401.

| Request | Result |
|---|---|
| GET `/api/events/:bogus`, `/api/events/' OR 1=1`, `/api/projects/:bogus` | [PASS] 404 |
| GET `/api/stats/{github,lc}/:bogus` | [PASS] 404 |
| PATCH `/api/events/:bogus` `{title:""}` | [PASS] 400 |
| DELETE `/api/events/:bogus` anon | [FIXED] 401 (F2) |
| POST register `:bogus` · closed event anon (JSON and `text/plain`) | [PASS] 404 · 409 |
| POST feedback anon / rating 0 | [PASS] 401 / 400 |
| GET registrations.csv anon | [PASS] 401 |
| POST attendance anon / bad body / bogus registration | [PASS] 401 / 400 / 404 |
| PATCH weights anon / negative / string | [FIXED] 401 (F2) / 400 / 400 |
| PATCH members `:bogus` `{role:"god"}` / `{}` · POST refresh `:bogus` | [PASS] 400 / 404 / 404 |
| POST allowlist `{}` / `<script>`+`nope` / URL / bad email / whitespace / `email:123` | [FIXED] all 400 (B2) |
| DELETE allowlist `:bogus` | [PASS] 404 |
| PATCH project approve `{action:"nuke"}` · event approve `:bogus` | [PASS] 400 · 404 |
| PATCH recruitment config `{open:"yes"}` · review `{status:"weird"}` · GET cv `:bogus` | [PASS] 400 · 400 · 404 |
| GET admin logs anon | [FIXED] 401 (F2) |
| POST lc/verify `{}` / anon | [PASS] 400 / 401 |
| POST upload anon / no file / `kind=../../etc` / text as `image/png` | [PASS] 401 / 400 / 400 / 400 (magic bytes) |
| POST project members `{userId:""}` | [PASS] 400 |
| POST `/api/sync` anon | [PASS] 202 |
| POST `/api/webhooks/github` unsigned | [PASS] 401 |

`POST /api/recruitments` (anonymous multipart, `usn` kept invalid as the sentinel → 422 with a per-field map):
no `data` / bad JSON → 400 · name "   "/101 · email `' OR '1'='1` · year 0/5/2.5/"abc"/-1 · whatsapp short/18 digits ·
about "   "/2001 chars/400 words · GitHub URL as username · LC username with a space · non-LinkedIn URL → each reported. [PASS]
Whatsapp `98765-43210` normalised and accepted. Name `<script>…` accepted as text; the outgoing mail escapes it (`escapeHtml`). [PASS]
After 20 requests/min → **429**. [PASS]

---

## Not covered
- Successful writes of any kind (agreed validation-only scope on the shared DB).
- File-upload happy paths (image/CV): would store files; server-side type/size checks were exercised instead.
- GitHub OAuth sign-in flow and the onboarding form for a fresh account (would need a new account).
- Admin pages below 1908 px (headless browser has no session).
- `prefers-reduced-motion` paths.
