-- Drop login-only columns left after sign-in was removed.
DROP INDEX IF EXISTS "User_googleSub_key";
ALTER TABLE "User" DROP COLUMN "googleSub";
ALTER TABLE "User" DROP COLUMN "passwordHash";
ALTER TABLE "User" DROP COLUMN "picture";
