-- AlterEnum
-- Adds the "Faculty" tier for college staff: admin-panel access, never ranked
-- on the leaderboard, moderated by the President only (see lib/roles.ts).
-- Placed after 'vice_president' to match the ROLES order in lib/roles.ts.
-- Additive only; kept in its own migration because Postgres cannot use a
-- newly added enum value in the same transaction that adds it.
ALTER TYPE "Role" ADD VALUE 'faculty' AFTER 'vice_president';
