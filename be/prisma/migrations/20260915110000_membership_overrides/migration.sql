-- CreateEnum
CREATE TYPE "MembershipOverrideStatus" AS ENUM ('ALLOW', 'DENY');

-- CreateTable
CREATE TABLE "membership_overrides" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "MembershipOverrideStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "membership_overrides_userId_expiresAt_idx" ON "membership_overrides"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "membership_overrides_expiresAt_idx" ON "membership_overrides"("expiresAt");

-- AddForeignKey
ALTER TABLE "membership_overrides" ADD CONSTRAINT "membership_overrides_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_overrides" ADD CONSTRAINT "membership_overrides_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
