-- AlterTable
CREATE SEQUENCE inventorycell_columnindex_seq;
ALTER TABLE "InventoryCell" ALTER COLUMN "columnIndex" SET DEFAULT nextval('inventorycell_columnindex_seq');
ALTER SEQUENCE inventorycell_columnindex_seq OWNED BY "InventoryCell"."columnIndex";

-- AlterTable
CREATE SEQUENCE inventoryrow_rowindex_seq;
ALTER TABLE "InventoryRow" ALTER COLUMN "rowIndex" SET DEFAULT nextval('inventoryrow_rowindex_seq');
ALTER SEQUENCE inventoryrow_rowindex_seq OWNED BY "InventoryRow"."rowIndex";
