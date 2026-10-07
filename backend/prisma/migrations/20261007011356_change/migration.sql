/*
  Warnings:

  - You are about to drop the column `description` on the `FireIncidentCategory` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `FireIncidentSubcategory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FireIncidentCategory" DROP COLUMN "description";

-- AlterTable
ALTER TABLE "FireIncidentSubcategory" DROP COLUMN "description";
