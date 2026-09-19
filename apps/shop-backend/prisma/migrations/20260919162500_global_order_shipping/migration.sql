ALTER TABLE "Setting" RENAME COLUMN "defaultShippingCost" TO "shippingCost";

ALTER TABLE "Product" DROP COLUMN "shippingCost";
