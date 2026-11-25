-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('USER_CREATED', 'USER_UPDATED', 'USER_ACTIVATED', 'USER_DEACTIVATED', 'USER_PASSWORD_CHANGED', 'USER_PASSWORD_RESET', 'OFFICE_CREATED', 'OFFICE_UPDATED', 'OFFICE_DELETED', 'POSITION_CREATED', 'POSITION_UPDATED', 'POSITION_DELETED', 'REFERENCE_CREATED', 'REFERENCE_UPDATED', 'INCIDENT_CREATED', 'INCIDENT_UPDATED', 'INCIDENT_DELETED', 'INCIDENT_RESTORED', 'CASUALTY_CREATED', 'CASUALTY_UPDATED', 'CASUALTY_STATUS_CHANGED', 'CASUALTY_DELETED', 'CASUALTY_RESTORED', 'CASUALTY_PII_VIEWED', 'REPORT_EXPORTED', 'ATTACHMENT_DOWNLOADED');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('USER', 'OFFICE', 'POSITION', 'INCIDENT_CATEGORY', 'AGENCY', 'INJURY_TYPE', 'INCIDENT', 'CASUALTY', 'REPORT', 'ATTACHMENT');

-- CreateEnum
CREATE TYPE "Affiliation" AS ENUM ('CIVILIAN', 'BFP_PERSONNEL', 'FIRE_AIDE', 'BFP_VOLUNTEER', 'OTHER_GOVERNMENT', 'OTHER_LAW_ENFORCEMENT', 'OTHER_UNCLASSIFIED');

-- CreateEnum
CREATE TYPE "CasualtyStatus" AS ENUM ('INJURED', 'DECEASED');

-- CreateEnum
CREATE TYPE "CasualtySeverity" AS ENUM ('MINOR', 'SERIOUS', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CasualtyActivity" AS ENUM ('SUPPRESSION', 'RESCUE', 'EMS_CARE', 'TRANSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "TreatmentType" AS ENUM ('ON_SITE', 'TRANSPORTED', 'REFUSED', 'NONE');

-- CreateEnum
CREATE TYPE "PlaceOfDeath" AS ENUM ('ON_SCENE', 'IN_TRANSIT', 'HOSPITAL');

-- CreateEnum
CREATE TYPE "ResponseType" AS ENUM ('FIRE', 'EMS', 'SPECIAL_RESCUE');

-- CreateEnum
CREATE TYPE "FireAlarmLevel" AS ENUM ('FIRST_ALARM', 'SECOND_ALARM', 'THIRD_ALARM', 'FOURTH_ALARM', 'FIFTH_ALARM', 'TASK_FORCE_ALPHA', 'TASK_FORCE_BRAVO', 'TASK_FORCE_CHARLIE', 'TASK_FORCE_DELTA', 'GENERAL_ALARM');

-- CreateEnum
CREATE TYPE "FireIncidentStatus" AS ENUM ('VERIFICATION', 'ON_GOING', 'FIRE_UNDER_CONTROL', 'FIRE_OUT', 'FIRE_OUT_UPON_ARRIVAL', 'FALSE_ALARM', 'REKINDLE');

-- CreateEnum
CREATE TYPE "ExternalSourceSystem" AS ENUM ('AIMS', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentPersonnelRole" AS ENUM ('GROUND_COMMANDER', 'TEAM_LEADER', 'REPORTING_OFFICER', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BFP_PERSONNEL_CASUALTY', 'CASUALTY_DECEASED', 'RECORD_CORRECTED');

-- CreateEnum
CREATE TYPE "NotificationEntityType" AS ENUM ('INCIDENT', 'CASUALTY');

-- CreateEnum
CREATE TYPE "OfficeType" AS ENUM ('NATIONAL_HEADQUARTERS', 'REGIONAL_OFFICE', 'DISTRICT_FIRE_STATION', 'PROVINCIAL_FIRE_STATION', 'CITY_FIRE_STATION', 'MUNICIPAL_FIRE_STATION');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'ENCODER', 'VIEWER');

-- CreateEnum
CREATE TYPE "Section" AS ENUM ('OPERATIONS', 'EMS', 'SRF');

-- CreateEnum
CREATE TYPE "RANK" AS ENUM ('FDIR', 'FCSUPT', 'FSSUPT', 'FSUPT', 'FCINSP', 'FSINSP', 'FINSP', 'SFO4', 'SFO3', 'SFO2', 'SFO1', 'FO3', 'FO2', 'FO1');

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "casualtyId" TEXT,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "uploadedById" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "removedById" TEXT,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "officeId" TEXT,
    "regionId" TEXT,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Casualty" (
    "id" TEXT NOT NULL,
    "casualtyNo" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "affiliation" "Affiliation" NOT NULL,
    "agencyId" TEXT,
    "bfpOfficeId" TEXT,
    "bfpUserId" TEXT,
    "bfpRank" "RANK",
    "currentStatus" "CasualtyStatus" NOT NULL,
    "severity" "CasualtySeverity",
    "activityAtTime" "CasualtyActivity",
    "isIdentified" BOOLEAN NOT NULL DEFAULT true,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "extra" JSONB,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "deletionReason" TEXT,
    "anonymizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Casualty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasualtyPerson" (
    "id" TEXT NOT NULL,
    "lastName" TEXT,
    "firstName" TEXT,
    "middleName" TEXT,
    "suffix" TEXT,
    "dateOfBirth" DATE,
    "ageYears" INTEGER,
    "ageIsEstimated" BOOLEAN NOT NULL DEFAULT false,
    "sex" "Sex",
    "nationality" TEXT,
    "addressLine" TEXT,
    "barangay" TEXT,
    "cityMunicipality" TEXT,
    "province" TEXT,
    "contactNumberEnc" TEXT,
    "casualtyId" TEXT NOT NULL,

    CONSTRAINT "CasualtyPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasualtyMedical" (
    "id" TEXT NOT NULL,
    "bodyParts" TEXT,
    "treatment" "TreatmentType",
    "receivingFacility" TEXT,
    "transportedBy" TEXT,
    "dateOfDeath" TIMESTAMPTZ(3),
    "placeOfDeath" "PlaceOfDeath",
    "causeOfDeathNoteEnc" TEXT,
    "casualtyId" TEXT NOT NULL,

    CONSTRAINT "CasualtyMedical_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasualtyInjury" (
    "medicalId" TEXT NOT NULL,
    "injuryTypeId" TEXT NOT NULL,

    CONSTRAINT "CasualtyInjury_pkey" PRIMARY KEY ("medicalId","injuryTypeId")
);

-- CreateTable
CREATE TABLE "CasualtyStatusEvent" (
    "id" TEXT NOT NULL,
    "fromStatus" "CasualtyStatus",
    "toStatus" "CasualtyStatus" NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "casualtyId" TEXT NOT NULL,

    CONSTRAINT "CasualtyStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasualtyRevision" (
    "id" TEXT NOT NULL,
    "revisionNo" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "changedFields" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "casualtyId" TEXT NOT NULL,

    CONSTRAINT "CasualtyRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "incidentNo" TEXT NOT NULL,
    "responseType" "ResponseType" NOT NULL,
    "categoryId" TEXT NOT NULL,
    "reportingOfficeId" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(3),
    "reportedAt" TIMESTAMPTZ(3),
    "placeOfOccurrence" TEXT NOT NULL,
    "barangay" TEXT NOT NULL,
    "cityMunicipality" TEXT NOT NULL,
    "provinceDistrict" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "narrative" TEXT,
    "extra" JSONB,
    "lastCasualtySeq" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "deletionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentCategory" (
    "id" TEXT NOT NULL,
    "responseType" "ResponseType" NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FireIncidentDetail" (
    "id" TEXT NOT NULL,
    "highestAlarmLevel" "FireAlarmLevel",
    "finalStatus" "FireIncidentStatus",
    "structuresAffected" INTEGER,
    "incidentId" TEXT NOT NULL,

    CONSTRAINT "FireIncidentDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmsIncidentDetail" (
    "id" TEXT NOT NULL,
    "natureOfCall" TEXT,
    "incidentId" TEXT NOT NULL,

    CONSTRAINT "EmsIncidentDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RescueIncidentDetail" (
    "id" TEXT NOT NULL,
    "hazardClass" TEXT,
    "personsRescued" INTEGER,
    "incidentId" TEXT NOT NULL,

    CONSTRAINT "RescueIncidentDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentExternalRef" (
    "id" TEXT NOT NULL,
    "sourceSystem" "ExternalSourceSystem" NOT NULL,
    "externalId" TEXT NOT NULL,
    "url" TEXT,
    "incidentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentExternalRef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentRespondingUnit" (
    "id" TEXT NOT NULL,
    "unitDesignation" TEXT,
    "isLead" BOOLEAN NOT NULL DEFAULT false,
    "arrivedAt" TIMESTAMPTZ(3),
    "officeId" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,

    CONSTRAINT "IncidentRespondingUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentPersonnel" (
    "id" TEXT NOT NULL,
    "role" "IncidentPersonnelRole" NOT NULL,
    "fullName" TEXT NOT NULL,
    "rank" "RANK",
    "userId" TEXT,
    "incidentId" TEXT NOT NULL,

    CONSTRAINT "IncidentPersonnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_number_counters" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "regionCode" TEXT NOT NULL,
    "responseType" "ResponseType" NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "incident_number_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "casualtyAlerts" BOOLEAN NOT NULL DEFAULT true,
    "recordCorrections" BOOLEAN NOT NULL DEFAULT true,
    "systemAnnouncements" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entityType" "NotificationEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Office" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OfficeType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentId" TEXT,
    "regionId" TEXT,
    "regionCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "affiliation" "Affiliation" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InjuryType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InjuryType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "rank" "RANK" NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "officeId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "section" "Section",
    "sectionDesignationRef" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_storageKey_key" ON "Attachment"("storageKey");

-- CreateIndex
CREATE INDEX "Attachment_incidentId_createdAt_idx" ON "Attachment"("incidentId", "createdAt");

-- CreateIndex
CREATE INDEX "Attachment_casualtyId_idx" ON "Attachment"("casualtyId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_officeId_idx" ON "AuditLog"("officeId");

-- CreateIndex
CREATE INDEX "AuditLog_regionId_idx" ON "AuditLog"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "Casualty_casualtyNo_key" ON "Casualty"("casualtyNo");

-- CreateIndex
CREATE INDEX "Casualty_incidentId_idx" ON "Casualty"("incidentId");

-- CreateIndex
CREATE INDEX "Casualty_affiliation_idx" ON "Casualty"("affiliation");

-- CreateIndex
CREATE INDEX "Casualty_currentStatus_idx" ON "Casualty"("currentStatus");

-- CreateIndex
CREATE INDEX "Casualty_createdAt_idx" ON "Casualty"("createdAt");

-- CreateIndex
CREATE INDEX "Casualty_deletedAt_idx" ON "Casualty"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CasualtyPerson_casualtyId_key" ON "CasualtyPerson"("casualtyId");

-- CreateIndex
CREATE UNIQUE INDEX "CasualtyMedical_casualtyId_key" ON "CasualtyMedical"("casualtyId");

-- CreateIndex
CREATE INDEX "CasualtyStatusEvent_casualtyId_occurredAt_idx" ON "CasualtyStatusEvent"("casualtyId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "CasualtyRevision_casualtyId_revisionNo_key" ON "CasualtyRevision"("casualtyId", "revisionNo");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_incidentNo_key" ON "Incident"("incidentNo");

-- CreateIndex
CREATE INDEX "Incident_reportingOfficeId_idx" ON "Incident"("reportingOfficeId");

-- CreateIndex
CREATE INDEX "Incident_responseType_occurredAt_idx" ON "Incident"("responseType", "occurredAt");

-- CreateIndex
CREATE INDEX "Incident_occurredAt_idx" ON "Incident"("occurredAt");

-- CreateIndex
CREATE INDEX "Incident_categoryId_idx" ON "Incident"("categoryId");

-- CreateIndex
CREATE INDEX "Incident_deletedAt_idx" ON "Incident"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentCategory_responseType_name_key" ON "IncidentCategory"("responseType", "name");

-- CreateIndex
CREATE UNIQUE INDEX "FireIncidentDetail_incidentId_key" ON "FireIncidentDetail"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "EmsIncidentDetail_incidentId_key" ON "EmsIncidentDetail"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "RescueIncidentDetail_incidentId_key" ON "RescueIncidentDetail"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentExternalRef_incidentId_idx" ON "IncidentExternalRef"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentExternalRef_sourceSystem_externalId_key" ON "IncidentExternalRef"("sourceSystem", "externalId");

-- CreateIndex
CREATE INDEX "IncidentRespondingUnit_incidentId_idx" ON "IncidentRespondingUnit"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentRespondingUnit_officeId_idx" ON "IncidentRespondingUnit"("officeId");

-- CreateIndex
CREATE INDEX "IncidentPersonnel_incidentId_idx" ON "IncidentPersonnel"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "incident_number_counters_year_month_regionCode_responseType_key" ON "incident_number_counters"("year", "month", "regionCode", "responseType");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Office_regionCode_key" ON "Office"("regionCode");

-- CreateIndex
CREATE INDEX "Office_parentId_idx" ON "Office"("parentId");

-- CreateIndex
CREATE INDEX "Office_regionId_idx" ON "Office"("regionId");

-- CreateIndex
CREATE INDEX "Office_type_idx" ON "Office"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Office_parentId_name_key" ON "Office"("parentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Position_name_key" ON "Position"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_name_key" ON "Agency"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InjuryType_name_key" ON "InjuryType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_refreshToken_key" ON "RefreshToken"("refreshToken");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_account_number_key" ON "User"("account_number");

-- CreateIndex
CREATE INDEX "User_officeId_idx" ON "User"("officeId");

-- CreateIndex
CREATE INDEX "User_positionId_idx" ON "User"("positionId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_section_idx" ON "User"("section");

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_casualtyId_fkey" FOREIGN KEY ("casualtyId") REFERENCES "Casualty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Casualty" ADD CONSTRAINT "Casualty_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Casualty" ADD CONSTRAINT "Casualty_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Casualty" ADD CONSTRAINT "Casualty_bfpOfficeId_fkey" FOREIGN KEY ("bfpOfficeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Casualty" ADD CONSTRAINT "Casualty_bfpUserId_fkey" FOREIGN KEY ("bfpUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Casualty" ADD CONSTRAINT "Casualty_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Casualty" ADD CONSTRAINT "Casualty_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Casualty" ADD CONSTRAINT "Casualty_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasualtyPerson" ADD CONSTRAINT "CasualtyPerson_casualtyId_fkey" FOREIGN KEY ("casualtyId") REFERENCES "Casualty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasualtyMedical" ADD CONSTRAINT "CasualtyMedical_casualtyId_fkey" FOREIGN KEY ("casualtyId") REFERENCES "Casualty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasualtyInjury" ADD CONSTRAINT "CasualtyInjury_medicalId_fkey" FOREIGN KEY ("medicalId") REFERENCES "CasualtyMedical"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasualtyInjury" ADD CONSTRAINT "CasualtyInjury_injuryTypeId_fkey" FOREIGN KEY ("injuryTypeId") REFERENCES "InjuryType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasualtyStatusEvent" ADD CONSTRAINT "CasualtyStatusEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasualtyStatusEvent" ADD CONSTRAINT "CasualtyStatusEvent_casualtyId_fkey" FOREIGN KEY ("casualtyId") REFERENCES "Casualty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasualtyRevision" ADD CONSTRAINT "CasualtyRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasualtyRevision" ADD CONSTRAINT "CasualtyRevision_casualtyId_fkey" FOREIGN KEY ("casualtyId") REFERENCES "Casualty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "IncidentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_reportingOfficeId_fkey" FOREIGN KEY ("reportingOfficeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FireIncidentDetail" ADD CONSTRAINT "FireIncidentDetail_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmsIncidentDetail" ADD CONSTRAINT "EmsIncidentDetail_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescueIncidentDetail" ADD CONSTRAINT "RescueIncidentDetail_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentExternalRef" ADD CONSTRAINT "IncidentExternalRef_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentRespondingUnit" ADD CONSTRAINT "IncidentRespondingUnit_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentRespondingUnit" ADD CONSTRAINT "IncidentRespondingUnit_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentPersonnel" ADD CONSTRAINT "IncidentPersonnel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentPersonnel" ADD CONSTRAINT "IncidentPersonnel_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Office" ADD CONSTRAINT "Office_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Office" ADD CONSTRAINT "Office_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

