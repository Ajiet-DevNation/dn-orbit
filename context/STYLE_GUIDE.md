# DN ORBIT — UI Style Guide

**Theme name:** Tactical Archive  
**Tone:** Technical, clean, confident. Not campy sci-fi. Not cluttered.

Every page in this app — member-facing and admin — shares one visual language. When in doubt, look at `/app/admin/page.tsx` or `/app/admin/members/page.tsx` as reference.

---

## Foundation

| Property | Value |
|----------|-------|
| Background | Pure black — `bg-black` / `#000000` |
| Foreground | White — `text-white` |
| Font | **Geist Mono** everywhere (set globally in `globals.css`) |
| Border radius | None — everything is sharp/square. Never use `rounded-*` |

### Color scale

| Role | Class |
|------|-------|
| Body text | `text-zinc-400` |
| Dim labels | `text-zinc-500` / `text-zinc-600` |
| Borders | `border-zinc-800` (visible) / `border-zinc-900` (subtle) |
| Accent — primary | `white` |
| Accent — success/online | `emerald-500` |
| Accent — danger/admin | `red-500` / `red-900` |

---

## Typography

All text is uppercase. All text is monospace (inherited globally).

| Use | Classes |
|-----|---------|
| Page title | `text-7xl md:text-9xl font-black uppercase tracking-tighter italic leading-none` |
| Section header | `text-xl font-black uppercase tracking-tighter` |
| Card title | `text-2xl font-black uppercase tracking-tighter` |
| Body text | `text-xs text-zinc-400` |
| Metadata label (tiny) | `text-[9px] font-black uppercase tracking-widest text-zinc-500` |
| Micro label | `text-[8px] font-black uppercase tracking-widest text-zinc-600` |

### Label naming convention

All labels use `SNAKE_CASE_ALL_CAPS`:

```
MEMBER_DIRECTORY    DATE_STAMP    SYSTEM_LOGS
ARCHIVE_ID: 0x...   ADDR_0x0042   UPLINK_SUCCESS
```

Numbered form sections:
```
01_IDENTIFICATION
02_PROFILE_DATA
03_CLEARANCE_CONFIG
```

---

## Borders & Corners

- Standard card border: `border border-zinc-800`
- Subtle divider: `border-zinc-900`
- Dashed variant: `border-dashed border-zinc-600`
- Corner bracket decoration (built into `TacticalCard`): 2px white L-shape top-left + bottom-right
- Use the `.tactical-border` CSS class (defined in `globals.css`) for manual corner brackets

---

## Reusable Components

**Always use these. Do not re-implement them.**

| Component | Path | Use for |
|-----------|------|---------|
| `TacticalCard` | `components/ui/TacticalCard.tsx` | All content cards |
| `TacticalButton` | `components/ui/TacticalButton.tsx` | All buttons |
| `TacticalTable` | `components/ui/TacticalTable.tsx` | All data tables |
| `TacticalFeedback` | `components/ui/TacticalFeedback.tsx` | Toast notifications |
| `TacticalLoading` | `components/ui/TacticalLoading.tsx` | Full-screen loading state |

### TacticalCard variants
- `default` — solid `border-zinc-800`
- `dashed` — dashed `border-zinc-600`
- `accent` — use for highlighted/alert cards

### TacticalButton variants
- `primary` — white fill, black text, inverts on hover
- `outline` — transparent, white border, fills on hover
- `ghost` — no border, zinc text, subtle hover
- `danger` — black bg, red text/border, fills red on hover

All buttons have a `> ` prefix by default (monospace prompt feel). Override with `prefix=""` if needed.

---

## Form Inputs

No UI library. Use bare elements with these classes:

```tsx
// Label
<label className="text-[9px] font-black tracking-widest uppercase text-zinc-500 block mb-2">
  FIELD_NAME
</label>

// Input
<input
  className="w-full bg-black border border-zinc-800 px-4 py-3 text-xs font-mono
             text-white placeholder:text-zinc-700 placeholder:uppercase
             focus:outline-none focus:border-white transition-colors"
/>

// Error state — add to input
className="... border-red-900"
// Error message
<p className="text-[10px] text-red-500 font-black tracking-wider uppercase mt-1">
  ERROR_MESSAGE
</p>

// Select
<select className="w-full bg-black border border-zinc-800 px-4 py-3 text-xs font-mono text-white
                   focus:outline-none focus:border-white transition-colors appearance-none" />
```

Group related fields under numbered section headers:

```tsx
<div className="space-y-4">
  <h3 className="text-[10px] font-black tracking-widest uppercase text-zinc-500 border-b border-zinc-900 pb-2">
    01_IDENTIFICATION
  </h3>
  {/* inputs */}
</div>
```

---

## Navigation (Sidebar)

Both admin and member layouts use the same left sidebar pattern from `app/admin/layout.tsx`.

**Member sidebar nav items:**

```
DASHBOARD     /
LEADERBOARD   /leaderboard
EVENTS        /events
MEMBERS       /members
PROJECTS      /projects
```

**Logo block:**
```
[DN]  ORBIT
      MEMBER_SECTOR_V1
```
(Same as admin's `COMMAND_SEC_V4` — just swap the version tag)

**Active link state** — add to the current page's link:
```
text-white bg-zinc-950 border border-zinc-800
```

**User session block** (bottom of sidebar):
```tsx
<div className="px-4 py-2 bg-zinc-950 border border-zinc-800">
  <span className="text-[8px] text-zinc-600 tracking-widest uppercase">USR_SESSION</span>
  <div className="text-[10px] text-white font-black truncate uppercase italic">
    {session.user.name}
  </div>
</div>
```

---

## Page Layout Pattern

Every page follows this structure:

```tsx
<div className="p-8 space-y-12">

  {/* Page header */}
  <header className="border-b border-zinc-900 pb-12">
    <h1 className="text-8xl font-black uppercase tracking-tighter leading-none italic">
      PAGE_TITLE
    </h1>
    <div className="flex items-center gap-4 mt-4">
      <span className="text-[10px] text-zinc-600 tracking-[0.4em] uppercase font-bold">
        SUBTITLE_OR_STATUS
      </span>
      <div className="h-px flex-1 bg-zinc-900" />
    </div>
  </header>

  {/* Content */}
  <div className="...">
    {/* TacticalCard / TacticalTable / etc. */}
  </div>

</div>
```

---

## Login Page

Centered single-column card. No illustrations, no biometric graphics.

```
┌─────────────────────────────────────┐
│ ARCHIVE_ID: 0xAUTH                  │
│ ─────────────────────────────────── │
│                                     │
│  INITIATE CONNECTION                │  ← text-5xl font-black italic
│  DEVNATION // ORBIT PLATFORM        │  ← text-[10px] zinc-500
│                                     │
│  [ > SIGN IN WITH GITHUB          ] │  ← TacticalButton primary lg
│                                     │
│  SECURE_TOKEN_GENERATED_UPON_ENTRY  │  ← text-[8px] zinc-700
└─────────────────────────────────────┘
```

---

## Onboarding Page

Same card style as login, taller, with numbered form sections.

```
┌─────────────────────────────────────┐
│ ARCHIVE_ID: 0xONBOARD               │
│ ─────────────────────────────────── │
│                                     │
│  COMPLETE YOUR PROFILE              │
│  ORBIT_MEMBER_REGISTRATION_V1       │
│                                     │
│  01_IDENTIFICATION                  │
│  ┌─────────────────────────────┐    │
│  │ FULL_NAME                   │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ USN                         │    │
│  └─────────────────────────────┘    │
│                                     │
│  02_PROFILE_DATA                    │
│  ┌─────────────────────────────┐    │
│  │ BRANCH                      │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ YEAR (1–5)                  │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ LEETCODE_USERNAME           │    │
│  └─────────────────────────────┘    │
│                                     │
│  [ > COMMIT_PROFILE               ] │
└─────────────────────────────────────┘
```

---

## Effects (use sparingly)

| Effect | How |
|--------|-----|
| Scanlines | Add class `scanlines` to a container |
| Noise texture | `className="bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat"` with a `bg-black/60` overlay div |
| Live status dot | `<div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />` |
| Subtle pulse | `animate-pulse` on text |
| Row hover shift | `group-hover:translate-x-1 transition-transform` on inner content |
| Three-dot indicator | Three `w-1 h-1 bg-zinc-800` squares in a row |

Main content area background (already in admin layout — replicate for member layout):
```tsx
<main className="flex-1 relative bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat">
  <div className="absolute inset-0 bg-black/60 pointer-events-none" />
  <div className="relative z-10 w-full h-full overflow-y-auto">
    {children}
  </div>
</main>
```

---

## Decorative Metadata

Sprinkle these to reinforce the aesthetic. Don't overload every component.

```tsx
// Hex address footer (used in TacticalTable)
ADDR_0x{count.toString(16).padStart(4, '0').toUpperCase()}

// Timestamp
2026.05.20

// Decorative corner squares
<div className="w-2 h-2 bg-white opacity-20" />

// Divider with label
<div className="flex items-center gap-4">
  <div className="h-px flex-1 bg-zinc-900" />
  <span className="text-[8px] text-zinc-800 font-mono">0x7F2A9B0C</span>
</div>
```

---

## What NOT to do

- No `rounded-*` classes anywhere
- No inline styles
- No CSS modules
- No color outside the defined palette (no blue, purple, orange, etc.)
- No lowercase text in UI labels — everything is uppercase
- No unstyled bare `<input>` or `<button>` — always use the classes/components above
- Don't add biometric graphics, shield SVGs, or heavy illustrations to auth pages
- Don't copy-paste large decorative blocks from the admin dashboard into every page — restraint is part of the aesthetic
