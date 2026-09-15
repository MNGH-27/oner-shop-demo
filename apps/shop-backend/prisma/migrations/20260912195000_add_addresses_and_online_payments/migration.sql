-- Existing addresses are preserved. A neutral value is only used for legacy
-- rows that predate mandatory postal-code validation.
UPDATE "Address"
SET "postalCode" = '0000000000'
WHERE "postalCode" IS NULL OR btrim("postalCode") = '';

ALTER TABLE "Address"
  ALTER COLUMN "postalCode" SET NOT NULL,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Address_userId_isDefault_idx"
  ON "Address"("userId", "isDefault");

-- New orders only support an online gateway. Historical cash/card values are
-- normalized without deleting their orders.
ALTER TABLE "Order" ALTER COLUMN "paymentMethod" DROP DEFAULT;
UPDATE "Order"
SET "paymentMethod" = 'online'
WHERE "paymentMethod" IN ('cash_on_delivery', 'card');

ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
CREATE TYPE "PaymentMethod" AS ENUM ('online');
ALTER TABLE "Order"
  ALTER COLUMN "paymentMethod" TYPE "PaymentMethod"
  USING ("paymentMethod"::text::"PaymentMethod");
DROP TYPE "PaymentMethod_old";
ALTER TABLE "Order" ALTER COLUMN "paymentMethod" SET DEFAULT 'online';

CREATE TYPE "PaymentAttemptStatus" AS ENUM (
  'pending',
  'paid',
  'failed',
  'cancelled'
);

CREATE TABLE "PaymentAttempt" (
  "id" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "gateway" TEXT NOT NULL,
  "authority" TEXT NOT NULL,
  "amountRials" BIGINT NOT NULL,
  "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'pending',
  "referenceId" TEXT,
  "cardPan" TEXT,
  "feeRials" BIGINT,
  "errorCode" INTEGER,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentAttempt_authority_key"
  ON "PaymentAttempt"("authority");
CREATE INDEX "PaymentAttempt_orderId_createdAt_idx"
  ON "PaymentAttempt"("orderId", "createdAt");
CREATE INDEX "PaymentAttempt_status_createdAt_idx"
  ON "PaymentAttempt"("status", "createdAt");

ALTER TABLE "PaymentAttempt"
  ADD CONSTRAINT "PaymentAttempt_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
