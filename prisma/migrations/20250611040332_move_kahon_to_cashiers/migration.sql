/*
  Warnings:

  - You are about to drop the column `inventoryId` on the `Cashier` table. All the data in the column will be lost.
  - You are about to drop the column `kahonId` on the `Cashier` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Inventory` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Kahon` table. All the data in the column will be lost.
  - Added the required column `cashierId` to the `Inventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cashierId` to the `Kahon` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Cashier" DROP CONSTRAINT "Cashier_inventoryId_fkey";

-- DropForeignKey
ALTER TABLE "Cashier" DROP CONSTRAINT "Cashier_kahonId_fkey";

-- DropForeignKey
ALTER TABLE "Inventory" DROP CONSTRAINT "Inventory_userId_fkey";

-- DropForeignKey
ALTER TABLE "Kahon" DROP CONSTRAINT "Kahon_userId_fkey";

-- AlterTable
ALTER TABLE "Cashier" DROP COLUMN "inventoryId",
DROP COLUMN "kahonId";

-- AlterTable
ALTER TABLE "Inventory" DROP COLUMN "userId",
ADD COLUMN     "cashierId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Kahon" DROP COLUMN "userId",
ADD COLUMN     "cashierId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Kahon" ADD CONSTRAINT "Kahon_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "Cashier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "Cashier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
