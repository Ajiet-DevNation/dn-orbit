# Verification checklist — `feat/orbit-finale`

Everything below was written without browser tooling, so **nothing visual has
been confirmed**. Automated checks all pass (`tsc --noEmit`, 227 unit tests,
`biome ci`, `next build`, live HTTP probes); what follows is the part only you
can do.

The later carousel/hero pass (§3b, §3c) *was* exercised in headless Chrome
against the dev server — DOM state, frame timings and screenshots — but a
headless render is not a real GPU, so the "does it feel smooth" judgement is
still yours.

## Before you start

```bash
bunx prisma migrate deploy   # creates stats_sync_state + backfills a row per user
bun run dev
```

The migration is **required** — `/api/sync` will error until the table exists.
It is additive (CREATE TABLE + INSERT..SELECT); nothing existing is modified.
Take a Neon branch first if you want a trivial rollback.

---

## 1 · Hero (biggest change — look hardest here)

- [ ] Boot splash logo → landing hero logo: **no jump in size or position** at
      the hand-off. This is the thing most likely to have broken.
- [ ] Wordmark, tagline, JOIN/EXPLORE buttons, stat ticker and SCROLL cue are
      readable and **do not crowd or overlap the orbit ring**. The content is
      absolutely positioned at the bottom; if the viewport is short it may
      collide.
- [ ] Stat ticker counts up on load and settles on real numbers.
- [ ] Drag the logo with a mouse → orbit spins. Release fast → planets shatter
      and reform.
- [ ] **On a phone**: same drag/fling works. This was completely dead before.
- [ ] Vertical page scrolling still works while touching the hero.
- [ ] Second, wider ring with pixel dust is visible and rotates opposite the
      main ring.
- [ ] Each planet's coloured halo brightens as it swings to the front.
- [ ] `JOIN DEVNATION` is hidden when signed in.

## 2 · Terminal (reverted to scroll-scrub)

- [ ] Types as you scroll, exactly as before. Scroll up → un-types.
- [ ] **The first line is not clipped off the top** — that was the bug.
- [ ] Feels smoother than before, not different.

## 3 · Carousels

- [ ] Drag members and projects rows — should feel continuous, not steppy.
- [ ] Release mid-drag → carries momentum before snapping (new).
- [ ] Card counter (`04 / 14`) tracks correctly.
- [ ] Flip a member card → back face appears (it now mounts on first flip).
- [ ] With both sections on screen, ArrowRight advances **only one** carousel.

### 3b · Carousel motion pass (spring settle)

Verified in headless Chrome: a flick lands exactly on a card boundary, no
console errors, half the cards skipped per frame. What is left is how it *feels*
on a real display.

- [ ] Idle auto-advance eases **in and out** — no jerk at the start of a step.
- [ ] Flick hard: the row carries several cards and decelerates without
      overshooting past the card it lands on.
- [ ] The bracket "power-on" now fires **once**, when the row settles — not for
      every card a drag sweeps past.
- [ ] Scroll a phone so the URL bar hides/shows mid-carousel: no stutter (the
      viewport hook now ignores height-only resizes).
- [ ] With OS "reduce motion" on: no entrance, row just present, nothing frozen.
- [ ] Project cards: the green pixel scan-in over the photo is **gone**.

### 3c · Hero re-lock

- [ ] Fling the hero → planets scatter and reform, with **no sound** and **no
      white/green flash burst** at the moment they re-lock.

## 4 · Modals

Open every one: profile, edit-photo, save-confirm, new project, new event,
contact, image cropper, and a delete confirm in admin.

- [ ] Identical chrome: same border, same header, same ✕ button, same backdrop.
- [ ] Stepped CRT power-on animation on open.
- [ ] Escape closes **only the top modal** when stacked (open profile → open its
      confirm → Escape should close just the confirm).
- [ ] After closing a stacked pair, **the page still scrolls**. This was broken.
- [ ] Focus returns to whatever opened the modal.
- [ ] In the cropper, drag the zoom slider and release outside the panel — must
      not close.
- [ ] LeetCode `CONNECT` button sits flush with the input, not floating above.

## 5 · Detail overlays

- [ ] Open a project and an event card.
- [ ] **Clicking the background closes it** (this is what you reported).
- [ ] Clicking the card or the detail text does *not* close it.

## 6 · Leaderboard

- [ ] `SYNCED …AGO` readout appears and is plausible.
- [ ] The GH/LC explanation line reads clearly.
- [ ] Numbers match a manual GitHub/LeetCode check for two members.
- [ ] Hit the page a few times; `stats_sync_state.gh_fetched_at` should advance
      for a handful of members per load, not all at once.

## 7 · Webhook (needs org admin)

Add the webhook (GitHub org → Settings → Webhooks), then:

- [ ] Push to an org repo → delivery shows 204 in GitHub's "Recent Deliveries".
- [ ] That member's `gh_dirty` flips true, and the next page load clears it.
- [ ] Click "Redeliver" with the secret temporarily wrong → **401**.

## 8 · Regressions to sweep

- [ ] Sign in / sign out
- [ ] Onboarding for a new account
- [ ] Register for an event
- [ ] Submit a project
- [ ] Admin: approve, change a role, export CSV, upload an image
- [ ] An unknown URL shows the styled 404
- [ ] With OS "reduce motion" on: nothing animates, nothing is frozen or blank

---

## Known gaps

- **CSP** is still absent. `next.config.ts` documents why; a nonce-based policy
  needs runtime verification I couldn't do here.
- **Rate limiting is per-instance** (in-memory). A speed bump, not a guarantee
  across serverless instances. `lib/rate-limit.ts` is the single seam to swap
  for Redis if the club ever needs a hard limit.
- **`constants/members.ts` duplicates the DB.** The member directory is a
  hand-maintained TS file while a full `User` model exists — two sources of
  truth for "who is a member". Flagged, not changed: converting it is a
  behaviour change beyond this scope.
