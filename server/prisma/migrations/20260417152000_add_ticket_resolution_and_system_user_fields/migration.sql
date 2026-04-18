-- AlterTable
ALTER TABLE "ticket"
ADD COLUMN "resolvedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user"
ADD COLUMN "isSystemReserved" BOOLEAN NOT NULL DEFAULT false;

-- Backfill resolvedAt for historical resolved and closed tickets.
UPDATE "ticket"
SET "resolvedAt" = "updatedAt"
WHERE "resolvedAt" IS NULL
  AND "status" IN ('resolved', 'closed');
