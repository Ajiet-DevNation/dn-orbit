import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

type PrismaGlobal = {
  prisma?: PrismaClient;
  pgPool?: Pool;
  pgAdapter?: PrismaPg;
  hasPgPoolErrorListener?: boolean;
};

const globalForPrisma = globalThis as unknown as PrismaGlobal;

/**
 * Lazily initialise the Prisma client.
 * This avoids crashing the whole app at import-time when DATABASE_URL
 * is not set — useful during frontend-only development.
 *
 * Pool config:
 *   - sslmode=verify-full: Neon always uses valid SSL certs (replaces deprecated sslmode=require)
 *   - idleTimeoutMillis:0: don't hold idle connections; Neon suspends after inactivity
 *   - connectionTimeoutMillis:30000: give Neon up to 30s to wake from cold start
 */
function createPrismaClient(): PrismaClient {
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local to enable database access."
    );
  }

  // Replace sslmode=require with sslmode=verify-full to silence pg's deprecation
  // warning. Neon always uses valid SSL certs, so verify-full is the correct mode.
  const safeConnectionString = connectionString.replace(
    /sslmode=require\b/,
    "sslmode=verify-full"
  );

  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString: safeConnectionString,
      idleTimeoutMillis: 0,
      connectionTimeoutMillis: 30_000,
      ssl: { rejectUnauthorized: true },
    });

  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = pool;
  }

  if (!globalForPrisma.hasPgPoolErrorListener) {
    pool.on("error", (error) => {
      console.error("Postgres pool error", {
        name: error.name,
        message: error.message,
      });
    });
    globalForPrisma.hasPgPoolErrorListener = true;
  }

  const adapter = globalForPrisma.pgAdapter ?? new PrismaPg(pool);

  if (!globalForPrisma.pgAdapter) {
    globalForPrisma.pgAdapter = adapter;
  }

  const client = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

/**
 * `db` is a lazy proxy — it only creates the real PrismaClient the first
 * time a property (like db.user, db.$connect, etc.) is accessed.
 * Importing this module alone will never throw.
 */
export const db: PrismaClient =
  globalForPrisma.prisma ??
  new Proxy({} as PrismaClient, {
    get(_target, prop) {
      // Initialise on first real access
      const client = globalForPrisma.prisma ?? createPrismaClient();
      globalForPrisma.prisma = client;
      return Reflect.get(client, prop);
    },
  });
