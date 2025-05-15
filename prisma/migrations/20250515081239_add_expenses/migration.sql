-- CreateTable
CREATE TABLE "ExpenseList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseItems" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "expenseListId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseItems_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExpenseList" ADD CONSTRAINT "ExpenseList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseItems" ADD CONSTRAINT "ExpenseItems_expenseListId_fkey" FOREIGN KEY ("expenseListId") REFERENCES "ExpenseList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
