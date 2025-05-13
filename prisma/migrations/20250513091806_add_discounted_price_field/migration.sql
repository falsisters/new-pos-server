-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "discountedPrice" DOUBLE PRECISION,
ADD COLUMN     "isDiscounted" BOOLEAN NOT NULL DEFAULT false;
