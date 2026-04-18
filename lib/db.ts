import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

type PrismaGlobal = {
  prisma?: PrismaClient;
  pgPool?: Pool;
  pgAdapter?: PrismaPg;
  hasPgPoolErrorListener?: boolean;
};

const globalForPrisma = globalThis as unknown as PrismaGlobal;

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

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
