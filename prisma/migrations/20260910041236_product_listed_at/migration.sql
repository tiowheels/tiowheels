-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "listedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Product_listedAt_idx" ON "Product"("listedAt");

-- Los productos migrados de WooCommerce comparten la fecha de importación en "updatedAt",
-- así que se parte desde su fecha de creación real.
UPDATE "Product" SET "listedAt" = "createdAt";
