# Security notes

What the app enforces in code, what has to be configured outside it, and the
risks that are known and accepted for now.

## Required configuration

| Variable | Why |
| --- | --- |
| `AUTH_SECRET` or `NEXTAUTH_SECRET` | Signs and encrypts sessions. There is **no fallback**: unset, sign-in fails closed instead of accepting JWTs forged with a public default. |
| `TOKEN_ENCRYPTION_KEY` | AES-256-GCM key (32 bytes, base64: `openssl rand -base64 32`) for members' GitHub OAuth tokens at rest. Unset, tokens are stored in plaintext and the server logs an error once. Don't rotate it casually: tokens encrypted under an old key can't be read (those members just sign in again). |
| `GITHUB_WEBHOOK_SECRET` | `/api/webhooks/github` fails closed without it. |

Admin → Settings shows which of these are missing.

## Deploys and migrations

`bun run build` runs `prisma migrate deploy` only when `VERCEL_ENV=production`,
and a failed migration now fails the build. Before, `|| true` swallowed it and
shipped new code against the old schema. Preview builds no longer migrate.
Before this change, a preview whose env pointed at the production DB applied a
PR's migration to production. If previews have their own Neon branch, run
`bunx prisma migrate deploy` against it yourself (or give the Preview
environment a build step that does).

## Rate limiting and Vercel WAF

`lib/rate-limit.ts` is an in-process fixed window, so it is a speed bump per
serverless instance, not a global limit. Signed-in callers are keyed by
account. Anonymous ones are keyed by IP, with ceilings that allow a class on
shared campus Wi-Fi.

For a hard limit across instances, add these rules in **Vercel → Project →
Firewall → Rules** (no code or extra service needed):

| Path | Method | Rule |
| --- | --- | --- |
| `/api/events/*/register` | `POST` | Rate limit 60 requests / 60 s per IP → deny (429) |
| `/api/recruitments` | `POST` | Rate limit 30 requests / 60 s per IP → deny (429) |
| `/api/sync` | `POST` | Rate limit 30 requests / 60 s per IP → deny (429) |
| `/api/upload` | `POST` | Rate limit 30 requests / 10 min per IP → deny (429) |
| `/api/stats/lc/verify` | `POST` | Rate limit 20 requests / 60 s per IP → deny (429) |

Keep the WAF limits above the in-app ones so the app's friendlier JSON 429
answers first in normal use.

## Enforced in code

- **Sessions:** `auth()` in `lib/auth.ts` returns a session only if it carries a user id, and it is memoised per request. A user who has been deleted or rejected is signed out on their next request (the jwt callback returns `null`).
- **Onboarding:** auto-approval only applies to a pending account onboarding for the first time. A rejected account cannot onboard.
- **GitHub tokens:** encrypted at rest (`lib/token-crypto.ts`) and read only through `lib/github-token.ts`. Never in the JWT or the session.
- **Attendance:** admin-only, because it feeds the leaderboard's event score. Organizers see their roster read-only.
- **Uploads and event proposals:** approved members only. Uploads are capped at 4 MB, with magic bytes checked.
- **Registration-form regexes:** bounded and screened for catastrophic backtracking (`isSafePattern` in `lib/forms.ts`). The stored form schema is size-bounded (`lib/validation.ts`).
- **JSON routes:** reject non-`application/json` bodies, which closes cross-site `text/plain` form posts.
- **CSV export:** guards against formula injection and quotes CR/LF.
- **Headers:** a CSP baseline (`frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self' https://github.com`), plus HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy`. The image optimizer only proxies this project's Supabase `media` bucket.
- **Dependencies:** `next` 16.4.2 and `next-auth` 5.0.0-beta.32 (`@auth/core` 0.41.3) patch the image-optimizer RCE/SSRF, the proxy bypass, the Server Action DoS and the Auth.js fail-open advisories.

## Known and accepted (needs a decision or a data check first)

- **`allowDangerousEmailAccountLinking: true`** (`lib/auth.ts`): seeded or allowlisted users may depend on it to link their first GitHub sign-in. GitHub verifies emails. Remove it only after checking that every user row has a linked account.
- **`users.usn` is not unique:** making it unique fails if production already holds duplicate rows. Check with `SELECT usn, count(*) FROM users WHERE usn IS NOT NULL GROUP BY usn HAVING count(*) > 1;` first.
- **No CAPTCHA and no email verification** on anonymous event registration and recruitment, by decision (no new third-party services). Someone can register with another person's email. The WAF rules above limit volume.
- **Script/style CSP:** needs nonces, because the app inlines both today.
- **Remaining `bun audit` findings** are in dev-only tooling (`shadcn` → `undici`, Prisma's dev server, `postcss` at build time), not in the runtime bundle.
