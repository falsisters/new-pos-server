/*
  Warnings:

  - You are about to drop the column `cashierId` on the `Inventory` table. All the data in the column will be lost.
  - You are about to drop the column `cashierId` on the `Kahon` table. All the data in the column will be lost.
  - Added the required column `userId` to the `Inventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Kahon` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Inventory" DROP CONSTRAINT "Inventory_cashierId_fkey";

-- DropForeignKey
ALTER TABLE "Kahon" DROP CONSTRAINT "Kahon_cashierId_fkey";

-- DropIndex
DROP INDEX "Inventory_cashierId_key";

-- DropIndex
DROP INDEX "Kahon_cashierId_key";

-- AlterTable
ALTER TABLE "Cashier" ADD COLUMN     "inventoryId" TEXT,
ADD COLUMN     "kahonId" TEXT;

-- AlterTable
ALTER TABLE "Inventory" DROP COLUMN "cashierId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Kahon" DROP COLUMN "cashierId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Cashier" ADD CONSTRAINT "Cashier_kahonId_fkey" FOREIGN KEY ("kahonId") REFERENCES "Kahon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cashier" ADD CONSTRAINT "Cashier_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kahon" ADD CONSTRAINT "Kahon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
