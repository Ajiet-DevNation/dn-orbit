// prisma/seed.ts
// Idempotent: elevate the developer account to President so the lockout is
// resolved. Run with: `bun prisma/seed.ts` (needs DATABASE_URL).
// Reuses the app's adapter-configured Prisma client (Prisma 7 requires a driver
// adapter — a bare `new PrismaClient()` is rejected).
// NOTE: design target is Core Member; set to President for testing per request —
// change the target role to "core_member" later.
import "dotenv/config";
import { db } from "@/lib/db";

const LOGIN = "MuazTPM-YT";

async function main() {
  const result = await db.user.updateMany({
    where: { githubUsername: { equals: LOGIN, mode: "insensitive" } },
    data: { role: "president" },
  });
  console.log(`Seed: set ${result.count} user(s) matching '${LOGIN}' -> president`);
  if (result.count === 0) {
    console.log("(No row yet — sign in once, then re-run the seed.)");
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
