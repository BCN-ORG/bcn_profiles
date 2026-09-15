CREATE TYPE "MembershipStatus" AS ENUM ('VERIFIED', 'NOT_MEMBER', 'PENDING', 'STALE', 'UNKNOWN');
CREATE TYPE "MembershipVerificationMethod" AS ENUM ('PROVIDER_API', 'ADMIN', 'SYNC');

CREATE TABLE "membership_sources" (
  "id" TEXT NOT NULL,
  "provider" "ExternalProvider" NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "externalGroupId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "membership_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_memberships" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "membershipSourceId" TEXT NOT NULL,
  "providerSubject" TEXT,
  "status" "MembershipStatus" NOT NULL,
  "verificationMethod" "MembershipVerificationMethod",
  "verifiedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "lastCheckedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "membership_sources_code_key" ON "membership_sources"("code");
CREATE UNIQUE INDEX "user_memberships_userId_membershipSourceId_key" ON "user_memberships"("userId", "membershipSourceId");
CREATE INDEX "user_memberships_status_expiresAt_idx" ON "user_memberships"("status", "expiresAt");

ALTER TABLE "user_memberships" ADD CONSTRAINT "user_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_memberships" ADD CONSTRAINT "user_memberships_membershipSourceId_fkey" FOREIGN KEY ("membershipSourceId") REFERENCES "membership_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
