/*
  Warnings:

  - Changed the type of `rank` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "RANK" AS ENUM ('FDIR', 'FCSUPT', 'FSSUPT', 'FSUPT', 'FCINSP', 'FSINSP', 'FINSP', 'SFO4', 'SFO3', 'SFO2', 'SFO1', 'FO3', 'FO2', 'FO1');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "rank",
ADD COLUMN     "rank" "RANK" NOT NULL;
