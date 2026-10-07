-- CreateEnum
CREATE TYPE "FireIncidentStatus" AS ENUM ('REPORTED', 'DISPATCHED', 'ON_GOING', 'UNDER_CONTROL', 'FIRE_OUT');

-- CreateEnum
CREATE TYPE "AlarmStatus" AS ENUM ('NO_ALARM', 'ALARM_RECEIVED', 'FALSE_ALARM', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CauseOfFire" AS ENUM ('UNDER_INVESTIGATION', 'ELECTRICAL', 'ARSON', 'ACCIDENTAL', 'NATURAL', 'UNKNOWN', 'OTHER');

-- CreateEnum
CREATE TYPE "FireCaseClassification" AS ENUM ('ACCIDENTAL', 'NATURAL', 'ARSON', 'UNDETERMINED');

-- CreateEnum
CREATE TYPE "FireCaseStatus" AS ENUM ('FIRST_ALARM', 'SECOND_ALARM', 'THIRD_ALARM', 'FOURTH_ALARM', 'FIFTH_ALARM', 'TASK_FORCE_ALPHA', 'TASK_FORCE_BRAVO', 'TASK_FORCE_CHARLIE', 'TASK_FORCE_DELTA', 'GENERAL_ALARM');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "FireIncident" (
    "id" TEXT NOT NULL,
    "incidentNo" TEXT NOT NULL,
    "dateTimeReported" TIMESTAMP(3),
    "dateTimeFireIncident" TIMESTAMP(3),
    "dateTimeCallReceived" TIMESTAMP(3),
    "dateTimeUnresponded" TIMESTAMP(3),
    "fireIncidentStatus" "FireIncidentStatus" NOT NULL,
    "categoryId" TEXT NOT NULL,
    "subcategoryId" TEXT,
    "createdById" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FireIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FireIncidentCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FireIncidentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FireIncidentSubcategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FireIncidentSubcategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FireIncident_incidentNo_key" ON "FireIncident"("incidentNo");

-- CreateIndex
CREATE INDEX "FireIncident_categoryId_idx" ON "FireIncident"("categoryId");

-- CreateIndex
CREATE INDEX "FireIncident_subcategoryId_idx" ON "FireIncident"("subcategoryId");

-- CreateIndex
CREATE INDEX "FireIncident_dateTimeFireIncident_idx" ON "FireIncident"("dateTimeFireIncident");

-- CreateIndex
CREATE INDEX "FireIncident_fireIncidentStatus_idx" ON "FireIncident"("fireIncidentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "FireIncidentCategory_name_key" ON "FireIncidentCategory"("name");

-- CreateIndex
CREATE INDEX "FireIncidentSubcategory_categoryId_idx" ON "FireIncidentSubcategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "FireIncidentSubcategory_categoryId_name_key" ON "FireIncidentSubcategory"("categoryId", "name");

-- AddForeignKey
ALTER TABLE "FireIncident" ADD CONSTRAINT "FireIncident_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FireIncidentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FireIncident" ADD CONSTRAINT "FireIncident_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "FireIncidentSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FireIncident" ADD CONSTRAINT "FireIncident_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FireIncidentSubcategory" ADD CONSTRAINT "FireIncidentSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FireIncidentCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
