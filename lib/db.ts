import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// idleTimeoutMillis:0 — don't hold idle connections; Neon suspends after inactivity
// connectionTimeoutMillis:30000 — give Neon up to 30s to wake from cold start
const pool = new Pool({
  connectionString,
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 30_000,
});

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
