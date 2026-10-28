# FIIS Data Model

PostgreSQL through Prisma 7. The schema is split: `backend/prisma/schema.prisma` holds the generator and datasource, and `backend/prisma/models/**/*.prisma` holds the models. The client is generated into `backend/src/generated/prisma/`. Migrations are in `backend/prisma/migrations/`. See [ARCHITECTURE.md](ARCHITECTURE.md) for how the code uses these tables.

## 1. Entity relationships

```mermaid
erDiagram
    Office ||--o{ Office : "parent / children"
    Office ||--o{ Office : "region / regionalOffices"
    Office ||--o{ User : has
    Position ||--o{ User : has
    User ||--o{ RefreshToken : has
    User ||--o| NotificationPreference : has
    User ||--o{ Notification : receives

    Office ||--o{ FireIncident : "owns (officeId)"
    Office |o--o{ FireIncident : "handles investigation"
    User ||--o{ FireIncident : "createdBy"
    User |o--o{ FireIncident : "deletedBy"
    FireIncidentCategory ||--o{ FireIncidentSubcategory : has
    FireIncidentCategory ||--o{ FireIncident : classifies
    FireIncidentSubcategory |o--o{ FireIncident : classifies
    Establishment |o--o{ FireIncident : involved

    FireIncident ||--o| IncidentLocation : has
    FireIncident ||--o| IncidentImpact : has
    FireIncident ||--o| FireOpertaionResources : has
    FireIncident ||--o| IncidentPersonnel : has
    FireIncident ||--o{ IncidentTimeline : has
    IncidentTimeline |o--o| IncidentTimeline : "correctsEntry"
    FireIncident ||--o{ FireIncidentEvent : "audit log"
    FireIncident ||--o{ Attachment : has
    Investigation |o--o{ Attachment : evidence

    FireIncident ||--o{ Investigation : has
    FireIncident ||--o{ InvestigationReferral : has
    Office ||--o{ Investigation : conducts
    User ||--o{ Investigation : "assignee / assigner"
    Office ||--o{ InvestigationReferral : "from / to"
    Investigation ||--o| InvestigationReport : has
    InvestigationReport ||--o{ InvestigationReportReview : has
```

`IncidentNumberCounter` (table `incident_number_counters`) stands alone. `AuditLog` references only its actor (`User`); its `officeId`, `regionId` and `entityId` are plain snapshot ids (§5).

## 2. Organization and users

| Model | Key fields | Constraints |
|---|---|---|
| `Office` | `name`, `type: OfficeType`, `isActive`, `parentId?`, `regionId?`, `regionCode?` | `@@unique([parentId, name])`; `regionCode` unique; indexes on `parentId`, `regionId`, `type` |
| `User` | `email`, `account_number`, `rank: RANK`, names, `password` (bcrypt hash), `isActive`, `officeId`, `positionId`, `role: ROLE` | `email` and `account_number` unique; indexes on `officeId`, `positionId`, `role` |
| `Position` | `name`, `isActive` | `name` unique |
| `RefreshToken` | `refreshToken` (SHA-256 hash of the token), `expiresAt`, `userId` | unique; cascade on user delete |
| `NotificationPreference` | `incidentUpdates`, `investigationUpdates`, `reportReview`, `systemAnnouncements` (all default on) | one per user; cascade |
| `Notification` | `userId`, `type: NotificationType`, `title`, `body`, `entityType: NotificationEntityType`, `entityId`, `readAt?`, `createdAt` | in-app inbox (Q-21); cascade with the user; index `(userId, readAt, createdAt)` |

- `Office` has two self-relations. `parent`/`children` is the hierarchy, and `region`/`regionalOffices` points every office at its regional office. Only regional offices carry a `regionCode`, which incident numbers use.
- `password` must never leave the API.

## 3. Fire incidents

| Model | Key fields | Notes |
|---|---|---|
| `FireIncident` | `incidentNo?`, `fireIncidentStatus`, `currentAlarmLevel?`, `approvalStatus` (default `PENDING`), date fields (`dateTimeReported`, `dateTimeFireIncident`, `dateTimeCallReceived`, `dateTimeUnresponded`; all optional), `categoryId`, `subcategoryId?`, `establishmentId?`, `officeId`, `investigationHandlingOfficeId?`, `createdById`, `deletedAt?`, `deletedById?`, `deletionReason?`, `deletionMemoReference?`, `remarks?` | `incidentNo` is unique and null until approval. Indexed on category, subcategory, establishment, `dateTimeFireIncident`, status, office, handling office, `approvalStatus`. |
| `IncidentLocation` | `placeOfOccurence`, `barangay`, `region`, `province_district`, `city_municipality`, `latitude?`, `longitude?` (`Decimal(9,6)`) | 1:1. Region, province/district and city/municipality are derived from the office. `onDelete` is RESTRICT (accepted: deletion is soft). |
| `IncidentImpact` | civilian, BFP and LEA fatalities and injuries, `establishmentsBurned`, `familiesAffected`, `individualsAffected`, `estimatedDamages?`, `finalEstimatedDamages?` (`Decimal(15,2)`) | 1:1, cascade |
| `FireOpertaionResources` | `respondingTeam?`, truck and ambulance counts (responded, BFP-owned, volunteer, BFP-manned) | 1:1, cascade |
| `IncidentPersonnel` | `groundCommander`, `arsonInvestigator`, `sender` | 1:1, cascade |
| `IncidentTimeline` | `status`, `alarmLevel?`, `occurredAt` (`Timestamptz(3)`, user-entered), `remarks?`, `createdById`, `createdAt` (server), `voidedAt?`, `voidedById?`, `voidReason?`, `correctsEntryId?` | `correctsEntryId` unique (one replacement per voided entry); index `(fireIncidentId, occurredAt)` |
| `FireIncidentEvent` | `type: FireIncidentEventType`, `actorId`, `remarks?`, `createdAt` | audit log of approval and deletion events; index `(fireIncidentId, createdAt)` |
| `FireIncidentCategory` | `name`, `type: CATEGORY_TYPE` | `name` unique |
| `FireIncidentSubcategory` | `name`, `categoryId` | `@@unique([categoryId, name])`; cascade from category |
| `Establishment` | `binBanNumber?`, `name`, `ownerName?`, `occupantName?`, `totalLotFloorArea?`, `contentStorage?`, `numberOfStoreys?` | `binBanNumber` unique |
| `IncidentNumberCounter` | `year`, `month`, `regionCode`, `lastNumber` | `@@unique([year, month, regionCode])`; incremented by upsert inside the approval transaction |

`fireIncidentStatus` and `currentAlarmLevel` on `FireIncident` are denormalized from the active (non-voided) timeline, ordered by `occurredAt`.

## 4. Investigations

| Model | Key fields | Notes |
|---|---|---|
| `Investigation` | `investigationNo` (`INV-<incidentNo>-<NN>`), `causeOfFire?`, `classification?`, `originOfFire?`, `startedAt`, `completedAt?`, `fireIncidentId`, `conductingOfficeId`, `assignedInvestigatorId`, `assignedById` | `investigationNo` unique. Many per incident; at most one open (`completedAt` null) is enforced in the service. Indexes on incident, conducting office, assignee. |
| `InvestigationReport` | `findings?`, `cause?`, `conclusion?`, `recommendations?`, `status: ReportStatus`, `submittedAt?`, `reviewedAt?`, `reviewedById?` | 1:1 with investigation; cascade |
| `InvestigationReportReview` | `decision: ReportDecision`, `reviewerId`, `remarks?`, `createdAt` | review history; index `(reportId, createdAt)` |
| `InvestigationReferral` | `fromOfficeId`, `toOfficeId`, `direction: ReferralDirection`, `referredById`, `remarks?`, `createdAt` | referral history per incident; index `(fireIncidentId, createdAt)` |

Investigation fields (cause, classification, origin) are kept separate from the incident's lifecycle fields.

## 5. Attachments

| Model | Key fields | Notes |
|---|---|---|
| `Attachment` | `fireIncidentId`, `investigationId?`, `uploadedById`, `originalName`, `mimeType` (detected from content), `sizeBytes`, `storageKey` (unique, never returned to clients), `sha256`, `description?`, `createdAt`, `removedAt?`, `removedById?` | Q-22. Cascades with its incident or investigation; soft removal by the uploader. Index `(fireIncidentId, createdAt)`, `investigationId`. |

## 5a. Audit log

| Model | Key fields | Notes |
|---|---|---|
| `AuditLog` | `actorId → User`, `action: AuditAction`, `entityType: AuditEntityType`, `entityId`, `officeId?`, `regionId?`, `changes Json?`, `createdAt` | Written in the same transaction as the change. `officeId`/`regionId` are snapshots for `REGIONAL_ADMIN` scoping, so entries outlive deleted offices. `changes` holds `{ field: { from, to } }` for updates or a field snapshot for creates and deletes, never passwords or tokens. Indexes on `(entityType, entityId)`, `actorId`, `createdAt`, `officeId`, `regionId`. |

## 6. Enums

| Enum | Values |
|---|---|
| `OfficeType` | `NATIONAL_HEADQUARTERS`, `REGIONAL_OFFICE`, `DISTRICT_FIRE_STATION`, `PROVINCIAL_FIRE_STATION`, `CITY_FIRE_STATION`, `MUNICIPAL_FIRE_STATION` |
| `ROLE` | `SUPER_ADMIN`; NHQ: `NHQ_ADMIN`, `NHQ_VIEWER`, `NHQ_CHIEF_INVESTIGATOR`, `NHQ_INVESTIGATOR`, `NHQ_OPERATION`, `NHQ_OPERATION_STAFF`; Regional: `REGIONAL_ADMIN`, `REGIONAL_OPERATION`, `REGIONAL_OPERATION_STAFF`, `REGIONAL_CHIEF_INVESTIGATOR`, `REGIONAL_INVESTIGATOR`, `REGIONAL_VIEWER`; District/Provincial: `DISTRICT_PROVINCE_OPERATION`, `DISTRICT_PROVINCE_OPERATION_STAFF`, `DISTRICT_PROVINCE_CHIEF_INVESTIGATOR`, `DISTRICT_PROVINCE_INVESTIGATOR`, `DISTRICT_PROVINCE_VIEWER`; City/Municipal: `CITY_MUNICIPALITY_OPERATION`, `CITY_MUNICIPALITY_OPERATION_STAFF`, `CITY_MUNICIPALITY_INVESTIGATOR`, `CITY_MUNICIPALITY_COMMEL`, `CITY_MUNICIPALITY_CHIEF_INVESTIGATOR` |
| `RANK` | `SFO4`, `SFO3`, `SFO2`, `SFO1`, `FO3`, `FO2`, `FO1` |
| `FireIncidentStatus` | `VERIFICATION`, `ON_GOING`, `FIRE_UNDER_CONTROL`, `FIRE_OUT`, `FIRE_OUT_UPON_ARRIVAL`, `FALSE_ALARM`, `REKINDLE` |
| `FireAlarmLevel` | `FIRST_ALARM` … `FIFTH_ALARM`, `TASK_FORCE_ALPHA`, `TASK_FORCE_BRAVO`, `TASK_FORCE_CHARLIE`, `TASK_FORCE_DELTA`, `GENERAL_ALARM` (ascending) |
| `IncidentApprovalStatus` | `PENDING`, `APPROVED`, `REJECTED` |
| `FireIncidentEventType` | `SUBMITTED`, `RESUBMITTED`, `APPROVED`, `REJECTED`, `REMOVED`, `DELETED`, `RESTORED` |
| `CATEGORY_TYPE` | `STRUCTURAL`, `NON_STRUCTURAL`, `TRANSPORTATION`, `WILDLAND` |
| `ReferralDirection` | `UP`, `DOWN` |
| `ReportStatus` | `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED` |
| `ReportDecision` | `UNDER_REVIEW`, `APPROVED`, `REJECTED` |
| `FireCaseClassification` | `UNDER_INVESTIGATION`, `ACCIDENTAL`, `INCENDIARY_INTENTIONAL`, `NATURAL`, `FIRE_CASE_WITH_NEGLIGENT_ACTS` |
| `AuditAction` | `USER_CREATED`, `USER_UPDATED`, `USER_ACTIVATED`, `USER_DEACTIVATED`, `USER_PASSWORD_CHANGED`, `OFFICE_CREATED/UPDATED/DELETED`, `POSITION_CREATED/UPDATED/DELETED`, `CATEGORY_CREATED/UPDATED/DELETED`, `SUBCATEGORY_CREATED/UPDATED/DELETED`, `INCIDENT_DELETED`, `INCIDENT_RESTORED`, `ATTACHMENT_DOWNLOADED` |
| `NotificationType` | `INCIDENT_SUBMITTED`, `INCIDENT_RESUBMITTED`, `INCIDENT_APPROVED`, `INCIDENT_REJECTED`, `INCIDENT_INVESTIGABLE`, `CASE_REFERRED`, `INVESTIGATOR_ASSIGNED`, `REPORT_SUBMITTED`, `REPORT_APPROVED`, `REPORT_REJECTED` |
| `NotificationEntityType` | `FIRE_INCIDENT`, `INVESTIGATION` |
| `AuditEntityType` | `USER`, `OFFICE`, `POSITION`, `FIRE_INCIDENT_CATEGORY`, `FIRE_INCIDENT_SUBCATEGORY`, `FIRE_INCIDENT`, `ATTACHMENT` |
| `CauseOfFire` | about 40 values, including `UNDER_INVESTIGATION`; see `models/fireIncident/enums.prisma` |

Known misspellings that are deferred, since renames need approval (REQUIREMENTS.md D-24): `placeOfOccurence`, `FireOpertaionResources`, `LPG_EXPLOSION_CAUSED_BY_DEFECTIVE_HOSELlNE`.

## 7. Migrations

| Migration | Change |
|---|---|
| `20261009062145_init` | initial schema |
| `20261009063011_fix_some_role_names` | role enum renames |
| `20261009135758_add_region_code_on_office_table` | `Office.regionCode` |
| `20261009141642_make_region_code_unique` | unique `regionCode` |
| `20261009142636_add_incident_number_counter_table` | `incident_number_counters` |
| `20261010120000_add_incident_workflow_schema` | approval, soft delete, owning and handling office, timeline voids and corrections, events, referrals, multiple investigations, reports and reviews, `REKINDLE`, `CITY_MUNICIPALITY_CHIEF_INVESTIGATOR`, location fields |
| `20261010180000_unique_office_name_per_parent` | `@@unique([parentId, name])` on `Office` |
| `20261028120000_add_deletion_memo_reference` | `FireIncident.deletionMemoReference` |
| `20261028140000_add_audit_log` | `AuditLog` table, `AuditAction` and `AuditEntityType` enums |
| `20261028180000_add_attachments` | `Attachment` table; `ATTACHMENT_DOWNLOADED` and `ATTACHMENT` audit enum values |
| `20261028160000_add_notifications` | `Notification` table, its enums, `NotificationPreference.incidentUpdates` |

Create migrations with `npx prisma migrate dev --name <name> --config prisma7.config.ts` and regenerate with `npx prisma generate --config prisma7.config.ts`.
