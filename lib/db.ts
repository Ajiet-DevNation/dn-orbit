import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

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
 */
function createPrismaClient(): PrismaClient {
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local to enable database access."
    );
  }

  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString,
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
