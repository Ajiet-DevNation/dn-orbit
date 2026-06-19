-- New users default to the non-DevNation "AJIET Student" tier; the President
-- promotes them into membership/admin tiers. (createUser also sets this
-- explicitly — this keeps the column default in sync.)
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'ajiet_student';
