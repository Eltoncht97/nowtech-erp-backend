CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

ALTER TABLE "Membership" ADD COLUMN "role" "MembershipRole";

-- Existing memberships were created by the organization founder flow.
UPDATE "Membership" SET "role" = 'OWNER';

ALTER TABLE "Membership" ALTER COLUMN "role" SET NOT NULL;
