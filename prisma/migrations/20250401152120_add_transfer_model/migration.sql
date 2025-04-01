-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('OWN_CONSUMPTION', 'RETURN_TO_WAREHOUSE', 'KAHON', 'REPACK');

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TransferType" NOT NULL,
    "cashierId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "Cashier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
