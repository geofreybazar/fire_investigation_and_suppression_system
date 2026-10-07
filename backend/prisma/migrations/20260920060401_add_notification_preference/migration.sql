/*
  Warnings:

  - The values [DISTRICT_ADMIN,STATION_ADMIN,SYSTEM_ADMIN] on the enum `ROLE` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ROLE_new" AS ENUM ('SUPER_ADMIN', 'NHQ_ADMIN', 'NHQ_CHIEF_INVESTIGATOR', 'NHQ_INVESTIGATOR', 'NHQ_VIEWER', 'REGIONAL_ADMIN', 'REGIONAL_CHIEF_INVESTIGATOR', 'REGIONAL_INVESTIGATOR', 'REGIONAL_VIEWER', 'DISTRICT_CHIEF_INVESTIGATOR', 'DISTRICT_INVESTIGATOR', 'DISTRICT_VIEWER', 'STATION_INVESTIGATOR', 'STATION_COMMEL');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "ROLE_new" USING ("role"::text::"ROLE_new");
ALTER TYPE "ROLE" RENAME TO "ROLE_old";
ALTER TYPE "ROLE_new" RENAME TO "ROLE";
DROP TYPE "public"."ROLE_old";
COMMIT;

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "investigationUpdates" BOOLEAN NOT NULL DEFAULT true,
    "reportReview" BOOLEAN NOT NULL DEFAULT true,
    "systemAnnouncements" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
