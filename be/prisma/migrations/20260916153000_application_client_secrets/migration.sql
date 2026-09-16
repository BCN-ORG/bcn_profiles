CREATE TABLE "application_client_secrets" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "secretHash" TEXT NOT NULL,
  "label" TEXT,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "disabledAt" TIMESTAMP(3),
  CONSTRAINT "application_client_secrets_pkey" PRIMARY KEY ("id")
);

INSERT INTO "application_client_secrets" ("id", "applicationId", "secretHash", "label", "status", "createdAt")
SELECT
  'secret-' || "id",
  "id",
  "clientSecretHash",
  'Migrated',
  'ACTIVE',
  CURRENT_TIMESTAMP
FROM "applications"
WHERE "clientSecretHash" IS NOT NULL AND "clientSecretHash" <> '';

CREATE INDEX "application_client_secrets_applicationId_status_idx"
  ON "application_client_secrets"("applicationId", "status");

ALTER TABLE "application_client_secrets"
  ADD CONSTRAINT "application_client_secrets_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "applications" DROP COLUMN "clientSecretHash";
