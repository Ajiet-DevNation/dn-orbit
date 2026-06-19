-- AlterEnum
-- Adds the non-DevNation "AJIET Student" classification tier. Appended last so
-- existing roles keep their ordinals; ajiet_student has no admin access.
ALTER TYPE "Role" ADD VALUE 'ajiet_student';
