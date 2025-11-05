-- AlterEnum
ALTER TYPE "public"."CashierPermissions" ADD VALUE 'VOID';

-- AlterTable
ALTER TABLE "public"."Employee" ADD COLUMN     "branch" TEXT;

-- AlterTable
ALTER TABLE "public"."Sale" ADD COLUMN     "isVoid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "voidedAt" TIMESTAMPTZ;
