-- Swap the Role enum from {admin, member} to the four-tier model, mapping
-- existing admins to president. Postgres can't drop an in-use enum value, so we
-- rename the old type, create the new one, convert the column, then drop the old.

ALTER TYPE "Role" RENAME TO "Role_old";

CREATE TYPE "Role" AS ENUM ('president', 'vice_president', 'core_member', 'member');

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "Role"
  USING (
    CASE "role"::text
      WHEN 'admin' THEN 'president'::"Role"
      ELSE 'member'::"Role"
    END
  );

ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'member';

DROP TYPE "Role_old";
