/*
  Warnings:

  - The values [REGIONAL,DISTRICT,PROVINCIAL,CITY,MUNICIPAL] on the enum `OfficeType` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `positionId` to the `User` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `role` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ROLE" AS ENUM ('SUPER_ADMIN', 'NHQ_ADMIN', 'NHQ_INVESTIGATOR', 'NHQ_VIEWER', 'REGIONAL_ADMIN', 'REGIONAL_INVESTIGATOR', 'REGIONAL_VIEWER', 'DISTRICT_ADMIN', 'DISTRICT_INVESTIGATOR', 'DISTRICT_VIEWER', 'STATION_ADMIN', 'STATION_INVESTIGATOR', 'STATION_COMMEL', 'SYSTEM_ADMIN');

-- AlterEnum
BEGIN;
CREATE TYPE "OfficeType_new" AS ENUM ('NATIONAL_HEADQUARTERS', 'REGIONAL_OFFICE', 'DISTRICT_FIRE_STATION', 'PROVINCIAL_FIRE_STATION', 'CITY_FIRE_STATION', 'MUNICIPAL_FIRE_STATION');
ALTER TABLE "Office" ALTER COLUMN "type" TYPE "OfficeType_new" USING ("type"::text::"OfficeType_new");
ALTER TYPE "OfficeType" RENAME TO "OfficeType_old";
ALTER TYPE "OfficeType_new" RENAME TO "OfficeType";
DROP TYPE "public"."OfficeType_old";
COMMIT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "positionId" TEXT NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "ROLE" NOT NULL;

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Position_name_key" ON "Position"("name");

-- CreateIndex
CREATE INDEX "User_officeId_idx" ON "User"("officeId");

-- CreateIndex
CREATE INDEX "User_positionId_idx" ON "User"("positionId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
