-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('EXPENSE_RECEIPT', 'CHECKS_AND_BANK_TRANSFER', 'INVENTORIES', 'SUPPORTING_DOCUMENTS');

-- CreateEnum
CREATE TYPE "BillType" AS ENUM ('THOUSAND', 'FIVE_HUNDRED', 'HUNDRED', 'FIFTY', 'TWENTY', 'COINS');

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AttachmentType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillCount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expenses" DOUBLE PRECISION NOT NULL,
    "showExpenses" BOOLEAN NOT NULL DEFAULT false,
    "beginningBalance" DOUBLE PRECISION NOT NULL,
    "showBeginningBalance" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bills" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "BillType" NOT NULL,
    "billCountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bills_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillCount" ADD CONSTRAINT "BillCount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bills" ADD CONSTRAINT "Bills_billCountId_fkey" FOREIGN KEY ("billCountId") REFERENCES "BillCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
