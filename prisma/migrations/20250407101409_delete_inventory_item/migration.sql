/*
  Warnings:

  - You are about to drop the `InventoryItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "InventoryItem" DROP CONSTRAINT "InventoryItem_inventoryId_fkey";

-- DropTable
DROP TABLE "InventoryItem";
