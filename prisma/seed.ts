// prisma/seed.ts — bootstrap the first admin(s) of a deploy.
//
// Reads ADMIN_GITHUB_USERNAMES (comma-separated GitHub logins) at SEED TIME
// ONLY — the runtime auth path never touches this env var. For each username it
// upserts an Allowlist row with grantRole=president (applied on the person's
// FIRST sign-in; see lib/auth.ts createUser) and promotes any already-existing
// User row immediately. Idempotent — safe to re-run.
//
// Run with: `bunx prisma db seed` (needs DATABASE_URL).
// Reuses the app's adapter-configured Prisma client (Prisma 7 requires a driver
// adapter — a bare `new PrismaClient()` is rejected).
import "dotenv/config";
import { db } from "@/lib/db";

async function main() {
  const usernames = (process.env.ADMIN_GITHUB_USERNAMES ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (usernames.length === 0) {
    console.log(
      "Seed: ADMIN_GITHUB_USERNAMES is empty — nothing to bootstrap.",
    );
    return;
  }

  for (const login of usernames) {
    await db.allowlist.upsert({
      where: { githubUsername: login },
      create: {
        githubUsername: login,
        grantRole: "president",
        note: "bootstrap admin (seeded)",
      },
      update: { grantRole: "president" },
    });

    // If they already signed in before this seed ran, promote the live row too
    // (grantRole only applies on first sign-in).
    const promoted = await db.user.updateMany({
      where: { githubUsername: { equals: login, mode: "insensitive" } },
      data: { role: "president", status: "approved" },
    });

    console.log(
      `Seed: '${login}' allowlisted with grantRole=president` +
        (promoted.count > 0 ? " (existing user promoted)" : ""),
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    process.exit(process.exitCode ?? 0);
  });
