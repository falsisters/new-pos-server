/*
  Warnings:

  - You are about to alter the column `beginningBalance` on the `BillCount` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `quantity` on the `DeliveryItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `amount` on the `ExpenseItems` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `quantity` on the `KahonItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `totalPrice` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `quantity` on the `OrderItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `price` on the `PerKiloPrice` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `stock` on the `PerKiloPrice` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `profit` on the `PerKiloPrice` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `price` on the `SackPrice` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `profit` on the `SackPrice` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `totalAmount` on the `Sale` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `quantity` on the `SaleItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `discountedPrice` on the `SaleItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `price` on the `SpecialPrice` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `profit` on the `SpecialPrice` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `quantity` on the `Transfer` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.

*/
-- AlterTable
ALTER TABLE "BillCount" ALTER COLUMN "beginningBalance" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "DeliveryItem" ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ExpenseItems" ALTER COLUMN "amount" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "KahonItem" ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "totalPrice" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PerKiloPrice" ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "stock" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "profit" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SackPrice" ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "profit" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Sale" ALTER COLUMN "totalAmount" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SaleItem" ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "discountedPrice" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SpecialPrice" ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "profit" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Transfer" ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION;
