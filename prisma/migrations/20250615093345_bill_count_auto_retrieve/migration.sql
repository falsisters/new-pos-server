/*
  Warnings:

  - You are about to drop the column `expenses` on the `BillCount` table. All the data in the column will be lost.
  - You are about to drop the column `showExpenses` on the `BillCount` table. All the data in the column will be lost.
  - You are about to drop the column `startingAmount` on the `BillCount` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BillCount" DROP COLUMN "expenses",
DROP COLUMN "showExpenses",
DROP COLUMN "startingAmount";
