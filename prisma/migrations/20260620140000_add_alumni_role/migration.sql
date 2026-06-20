-- AlterEnum
-- Adds the "AJIET Alumni" tier for former club members who have graduated.
-- Placed after 'member' so it sorts above the non-DevNation 'ajiet_student'
-- classification. No admin access (see lib/roles.ts). Kept in its own migration
-- because Postgres cannot use a newly added enum value in the same transaction
-- that adds it.
ALTER TYPE "Role" ADD VALUE 'alumni' AFTER 'member';
