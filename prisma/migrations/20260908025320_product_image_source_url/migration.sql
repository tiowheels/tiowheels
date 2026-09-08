-- DropIndex
DROP INDEX "Product_name_trgm_idx";

-- DropIndex
DROP INDEX "Product_searchText_trgm_idx";

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "sourceUrl" TEXT;
