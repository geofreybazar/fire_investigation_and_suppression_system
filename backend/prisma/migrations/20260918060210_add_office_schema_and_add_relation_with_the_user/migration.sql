/*
  Warnings:

  - Added the required column `officeId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OfficeType" AS ENUM ('NATIONAL_HEADQUARTERS', 'REGIONAL', 'DISTRICT', 'PROVINCIAL', 'CITY', 'MUNICIPAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "officeId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Office" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OfficeType" NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Office" ADD CONSTRAINT "Office_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;
