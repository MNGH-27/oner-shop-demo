CREATE TYPE "StockReservationStatus" AS ENUM ('reserved', 'committed', 'released');

ALTER TABLE "Order"
ADD COLUMN "reservationStatus" "StockReservationStatus",
ADD COLUMN "reservationExpiresAt" TIMESTAMP(3);

UPDATE "Order"
SET "reservationStatus" = CASE
  WHEN "paymentStatus" = 'paid' THEN 'committed'::"StockReservationStatus"
  WHEN "status" = 'cancelled' THEN 'released'::"StockReservationStatus"
  ELSE 'reserved'::"StockReservationStatus"
END,
"reservationExpiresAt" = CASE
  WHEN "paymentStatus" <> 'paid' AND "status" <> 'cancelled'
    THEN CURRENT_TIMESTAMP + INTERVAL '20 minutes'
  ELSE NULL
END;

CREATE INDEX "Order_reservationStatus_reservationExpiresAt_idx"
ON "Order"("reservationStatus", "reservationExpiresAt");
