/*
  Warnings:

  - The values [PROFITS] on the enum `CashierPermissions` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CashierPermissions_new" AS ENUM ('SALES', 'DELIVERIES', 'STOCKS', 'EDIT_PRICE', 'KAHON', 'BILLS', 'ATTACHMENTS', 'SALES_HISTORY');
ALTER TABLE "Cashier" ALTER COLUMN "permissions" TYPE "CashierPermissions_new"[] USING ("permissions"::text::"CashierPermissions_new"[]);
ALTER TYPE "CashierPermissions" RENAME TO "CashierPermissions_old";
ALTER TYPE "CashierPermissions_new" RENAME TO "CashierPermissions";
DROP TYPE "CashierPermissions_old";
COMMIT;
