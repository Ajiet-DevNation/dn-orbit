-- AlterEnum
-- Adds the combined "Members + AJIET students" event audience.
ALTER TYPE "EventAudience" ADD VALUE 'members_college' BEFORE 'public';
