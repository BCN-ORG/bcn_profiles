ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'DISABLED';
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'DELETED';

CREATE TYPE "ApplicationStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "AppAccessStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'PENDING');
CREATE TYPE "ExternalProvider" AS ENUM ('GOOGLE', 'GITHUB', 'DISCORD', 'ZALO');

CREATE TABLE "applications" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'ACTIVE',
  "require2fa" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "application_redirect_uris" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "redirectUri" TEXT NOT NULL,
  CONSTRAINT "application_redirect_uris_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_app_access" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "status" "AppAccessStatus" NOT NULL DEFAULT 'ACTIVE',
  "grantedBy" TEXT,
  "grantedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_app_access_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "roles" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "permissions" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "role_permissions" (
  "roleId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId", "permissionId")
);

CREATE TABLE "user_app_roles" (
  "userId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  CONSTRAINT "user_app_roles_pkey" PRIMARY KEY ("userId", "applicationId", "roleId")
);

CREATE TABLE "external_identities" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "ExternalProvider" NOT NULL,
  "providerSubject" TEXT NOT NULL,
  "providerEmail" TEXT,
  "providerUsername" TEXT,
  "providerDisplayName" TEXT,
  "providerAvatarUrl" TEXT,
  "profileData" JSONB,
  "accessTokenEncrypted" TEXT,
  "refreshTokenEncrypted" TEXT,
  "tokenExpiresAt" TIMESTAMP(3),
  "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastLoginAt" TIMESTAMP(3),
  "lastSyncedAt" TIMESTAMP(3),
  CONSTRAINT "external_identities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth_audit_logs" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "eventType" TEXT NOT NULL,
  "applicationCode" TEXT,
  "provider" "ExternalProvider",
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "applications_code_key" ON "applications"("code");
CREATE UNIQUE INDEX "applications_clientId_key" ON "applications"("clientId");
CREATE UNIQUE INDEX "application_redirect_uris_applicationId_redirectUri_key" ON "application_redirect_uris"("applicationId", "redirectUri");
CREATE UNIQUE INDEX "user_app_access_userId_applicationId_key" ON "user_app_access"("userId", "applicationId");
CREATE INDEX "user_app_access_applicationId_status_idx" ON "user_app_access"("applicationId", "status");
CREATE UNIQUE INDEX "roles_applicationId_code_key" ON "roles"("applicationId", "code");
CREATE UNIQUE INDEX "permissions_applicationId_code_key" ON "permissions"("applicationId", "code");
CREATE INDEX "user_app_roles_userId_applicationId_idx" ON "user_app_roles"("userId", "applicationId");
CREATE UNIQUE INDEX "external_identities_provider_providerSubject_key" ON "external_identities"("provider", "providerSubject");
CREATE UNIQUE INDEX "external_identities_userId_provider_key" ON "external_identities"("userId", "provider");
CREATE INDEX "external_identities_userId_idx" ON "external_identities"("userId");
CREATE INDEX "auth_audit_logs_userId_createdAt_idx" ON "auth_audit_logs"("userId", "createdAt" DESC);
CREATE INDEX "auth_audit_logs_eventType_createdAt_idx" ON "auth_audit_logs"("eventType", "createdAt" DESC);

ALTER TABLE "application_redirect_uris" ADD CONSTRAINT "application_redirect_uris_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_app_access" ADD CONSTRAINT "user_app_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_app_access" ADD CONSTRAINT "user_app_access_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_app_access" ADD CONSTRAINT "user_app_access_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "roles" ADD CONSTRAINT "roles_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_app_roles" ADD CONSTRAINT "user_app_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_app_roles" ADD CONSTRAINT "user_app_roles_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_app_roles" ADD CONSTRAINT "user_app_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_identities" ADD CONSTRAINT "external_identities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auth_audit_logs" ADD CONSTRAINT "auth_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
