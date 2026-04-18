import { db } from "./lib/db";
console.log("DB imported successfully");
console.log("DATABASE_URL:", process.env.DATABASE_URL?.substring(0, 20) + "...");
