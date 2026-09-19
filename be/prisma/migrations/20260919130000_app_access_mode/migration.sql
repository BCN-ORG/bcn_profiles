-- AlterEnum
CREATE TYPE "AppAccessMode" AS ENUM ('MANUAL', 'MEMBERS');

-- AlterTable
ALTER TABLE "applications" ADD COLUMN "accessMode" "AppAccessMode" NOT NULL DEFAULT 'MANUAL';
