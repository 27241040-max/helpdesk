CREATE TYPE "UserRole" AS ENUM ('admin', 'agent');

ALTER TABLE "user"
ALTER COLUMN "role" DROP DEFAULT,
ALTER COLUMN "role" TYPE "UserRole" USING ("role"::"UserRole"),
ALTER COLUMN "role" SET DEFAULT 'agent';
