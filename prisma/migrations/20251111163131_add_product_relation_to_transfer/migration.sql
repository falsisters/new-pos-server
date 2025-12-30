-- AlterTable
ALTER TABLE "public"."Transfer" ADD COLUMN     "perKiloPriceId" TEXT,
ADD COLUMN     "productId" TEXT,
ADD COLUMN     "sackPriceId" TEXT,
ADD COLUMN     "sackType" "public"."SackType";

-- AddForeignKey
ALTER TABLE "public"."Transfer" ADD CONSTRAINT "Transfer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transfer" ADD CONSTRAINT "Transfer_sackPriceId_fkey" FOREIGN KEY ("sackPriceId") REFERENCES "public"."SackPrice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transfer" ADD CONSTRAINT "Transfer_perKiloPriceId_fkey" FOREIGN KEY ("perKiloPriceId") REFERENCES "public"."PerKiloPrice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
