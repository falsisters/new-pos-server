-- AlterTable
ALTER TABLE "PerKiloPrice" ALTER COLUMN "profit" DROP NOT NULL,
ALTER COLUMN "profit" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SackPrice" ALTER COLUMN "profit" DROP NOT NULL,
ALTER COLUMN "profit" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SpecialPrice" ALTER COLUMN "profit" DROP NOT NULL,
ALTER COLUMN "profit" DROP DEFAULT;
