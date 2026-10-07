/*
  Warnings:

  - Added the required column `type` to the `FireIncidentCategory` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CATEGORY_TYPE" AS ENUM ('STRUCTURAL', 'TRANSPORTATION', 'WILDLAND');

-- AlterTable
ALTER TABLE "FireIncidentCategory" ADD COLUMN     "type" "CATEGORY_TYPE" NOT NULL;
