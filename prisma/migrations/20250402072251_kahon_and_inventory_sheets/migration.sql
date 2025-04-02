-- CreateTable
CREATE TABLE "InventorySheet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "columns" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventorySheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryRow" (
    "id" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "inventorySheetId" TEXT NOT NULL,
    "isItemRow" BOOLEAN NOT NULL DEFAULT true,
    "itemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCell" (
    "id" TEXT NOT NULL,
    "columnIndex" INTEGER NOT NULL,
    "inventoryRowId" TEXT NOT NULL,
    "value" TEXT,
    "formula" TEXT,
    "isCalculated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sheet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kahonId" TEXT NOT NULL,
    "columns" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Row" (
    "id" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "sheetId" TEXT NOT NULL,
    "isItemRow" BOOLEAN NOT NULL DEFAULT true,
    "itemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Row_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cell" (
    "id" TEXT NOT NULL,
    "columnIndex" INTEGER NOT NULL,
    "rowId" TEXT NOT NULL,
    "kahonItemId" TEXT,
    "value" TEXT,
    "formula" TEXT,
    "isCalculated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cell_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InventorySheet" ADD CONSTRAINT "InventorySheet_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryRow" ADD CONSTRAINT "InventoryRow_inventorySheetId_fkey" FOREIGN KEY ("inventorySheetId") REFERENCES "InventorySheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCell" ADD CONSTRAINT "InventoryCell_inventoryRowId_fkey" FOREIGN KEY ("inventoryRowId") REFERENCES "InventoryRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sheet" ADD CONSTRAINT "Sheet_kahonId_fkey" FOREIGN KEY ("kahonId") REFERENCES "Kahon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Row" ADD CONSTRAINT "Row_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "Sheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cell" ADD CONSTRAINT "Cell_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "Row"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cell" ADD CONSTRAINT "Cell_kahonItemId_fkey" FOREIGN KEY ("kahonItemId") REFERENCES "KahonItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
