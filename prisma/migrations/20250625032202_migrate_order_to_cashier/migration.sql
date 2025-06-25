-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cashierId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "cashierId" TEXT;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "Cashier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "Cashier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
