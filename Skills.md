# SKILLS.md — Project Orbit / DevNation Frontend

> **Project context:** This is the frontend of Project Orbit, a developer club platform for DevNation.  
> Built with: **Next.js 16 (App Router) · Tailwind CSS · Framer Motion · Lucide React**  
> Minimum Node.js version: **18.18.0+** (required by Next.js 16)

---

## ⚠️ CRITICAL: DO NOT TOUCH

The following are **strictly off-limits** for all contributors:

### Backend & API
- **Do not modify, refactor, or delete any backend files, routes, or server-side logic.**
- **Do not alter any API contracts** — endpoint paths, request shapes, response shapes, HTTP methods, and status codes must remain exactly as defined.
- **Do not add, remove, or rename API parameters** without explicit approval from the backend owner.
- **Do not introduce new API calls** to endpoints that haven't been defined by the backend team.
- If you believe a backend change is necessary, open a discussion/issue and wait for backend owner sign-off before touching anything.

> Violating any of the above will break the integration between frontend and backend and will require a rollback.

---

## ✅ Frontend Contribution Guidelines

### Write Highly Customizable Code

All frontend code contributed to this project must be **modular, prop-driven, and easy to extend**. Follow these rules:

#### 1. Components must be prop-driven
Every component should accept props for any value that could reasonably vary — text, colors, sizes, icons, callbacks, visibility toggles.

```tsx
// ❌ Bad — hardcoded values
export function StatCard() {
  return <div className="text-green-400">42 commits</div>;
}

// ✅ Good — fully customizable
interface StatCardProps {
  label: string;
  value: string | number;
  accentColor?: string;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, accentColor = "text-green-400", icon }: StatCardProps) {
  return (
    <div className={accentColor}>
      {icon && <span>{icon}</span>}
      <span>{value} {label}</span>
    </div>
  );
}
```

#### 2. Use TypeScript interfaces for all props
Define a clear `interface` or `type` for every component's props. No implicit `any` types.

#### 3. Provide sensible defaults
Use default parameter values so components work out of the box but remain overridable.

#### 4. Avoid magic numbers and hardcoded strings
Use constants, config objects, or Tailwind theme tokens instead:

```tsx
// ❌ Bad
<div className="w-[340px] h-[220px]">

// ✅ Good — defined in a shared config or Tailwind class
<div className="w-card h-card">
```

#### 5. Keep components single-responsibility
One component = one job. Split large components into smaller composable pieces.

#### 6. Export everything that could be reused
If it might be useful to another page or contributor, export it from the component file.

---

## 🎨 Aesthetic Rules (CS_ARCHIVE_V1.0)

All UI must conform to the established brutalist-terminal aesthetic. Do not deviate.

| Token | Value |
|---|---|
| Background | Near-black (`#0a0a0a` or equivalent) |
| Primary font | `Bebas Neue` (display headers) |
| UI font | `IBM Plex Mono` (labels, body, data) |
| Accent | Status green only (`#22c55e` or Tailwind `green-500`) |
| Palette | Strictly monochrome + single accent |
| Borders | Dashed or dotted, zero border-radius |
| Cards | Polaroid-style with physical stamp overlays |

> Do not introduce new colors, fonts, rounded corners, or gradients without a design review.

---

## 📁 File & Folder Conventions

```
/components       → Reusable UI components (must follow prop-driven rules above)
/app              → Next.js 16 App Router pages, layouts, and Route Handlers
/lib              → Utility functions and shared helpers
/types            → Shared TypeScript types and interfaces
/constants        → App-wide constants (no magic numbers elsewhere)
/hooks            → Custom React hooks
/proxy.ts         → Next.js 16 network boundary config (replaces middleware for proxy rules)
```

- Name component files in `PascalCase`: `StatCard.tsx`, `MemberRow.tsx`
- Name utility/hook files in `camelCase`: `useActivityFeed.ts`, `formatDate.ts`
- Co-locate component-specific styles/logic with the component file

---

## ⚡ Next.js 16 — Key Rules for Contributors

Next.js 16 introduces breaking changes and new patterns. All contributors **must** follow these:

### Caching — opt-in only
Next.js 16 removed implicit caching. **All routes are dynamic by default.** To cache, you must explicitly opt in using the new `Cache Components` API and `use cache` directive.

```tsx
// ✅ Next.js 16 — explicit opt-in caching
"use cache";

export default async function MemberStats() {
  const data = await fetchStats();
  return <StatCard value={data.commits} label="commits" />;
}
```

Do **not** rely on the old `fetch` auto-caching behavior from Next.js 14 — it no longer works.

### Middleware → proxy.ts
Next.js 16 replaces Middleware with `proxy.ts` for defining network boundary rules. Do not create or edit `middleware.ts` — use `proxy.ts` at the project root instead.

### React Compiler is stable
The React Compiler (automatic memoization) is stable in Next.js 16. **Do not manually add `useMemo` or `useCallback`** unless you have a specific reason — the compiler handles it. Unnecessary manual memoization will conflict.

### React 19.2 features available
The App Router now ships with React 19.2. You can use:
- `useEffectEvent` — extract non-reactive logic from Effects
- `Activity` — hide UI with `display: none` while preserving state
- View Transitions API — animate between navigations

### Turbopack is the default bundler
Turbopack is now the default for both `next dev` and `next build`. Do not add Webpack plugins or custom Webpack config — raise it as a discussion first.

### Upgrading (if not already on v16)
```bash
npx @next/codemod@latest upgrade latest
# or manually:
npm install next@latest react@latest react-dom@latest eslint-config-next@latest
```

---

## 🔄 Workflow

1. **Pull latest** before starting any work.
2. **Work on a feature branch** — never commit directly to `main`.
3. **Do not merge your own PRs** — at least one other contributor must review.
4. **Test your component in isolation** before integrating it into a page.
5. If you're unsure whether something touches the backend boundary → **ask first**.

---

*Last updated by: Aimaan — Project Orbit frontend lead · Updated for Next.js 16*
