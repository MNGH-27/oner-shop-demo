-- Add verified-phone and onboarding state to customer accounts.
ALTER TABLE "User"
ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3),
ADD COLUMN "profileCompleted" BOOLEAN NOT NULL DEFAULT true;

-- Only one active challenge is kept per phone number. OTP values are stored as
-- keyed hashes, never as plaintext.
CREATE TABLE "OtpChallenge" (
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resendAfter" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("phone")
);

CREATE TABLE "OtpRequestLog" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpRequestLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");
CREATE INDEX "OtpRequestLog_phone_createdAt_idx" ON "OtpRequestLog"("phone", "createdAt");
CREATE INDEX "OtpRequestLog_ipHash_createdAt_idx" ON "OtpRequestLog"("ipHash", "createdAt");
CREATE INDEX "OtpRequestLog_createdAt_idx" ON "OtpRequestLog"("createdAt");
