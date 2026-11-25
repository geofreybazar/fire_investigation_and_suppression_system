# BFP-CMS Requirements

> **Status: DRAFT (BFP-CMS revision 1, 2026-11-25), awaiting owner review.**
> BFP-CMS (BFP Casualty Monitoring System) replaces FIIS (Fire Investigation and Suppression System). This document replaces FIIS requirements revision 12, which is kept in git history (commit `936a920` and earlier).
> Sources:
> - the owner's project brief "Major System Revision: BFP Casualty Monitoring System";
> - the owner's planning answers of 2026-11-25;
> - the approved implementation plan of 2026-11-25.
>
> **Code state:** roadmap Phase 1 (foundation, §13) is built; Phases 2–6 are not. `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md` describe the current code and are updated phase by phase.

## 0. How to read this document

| Tag | Meaning |
|---|---|
| **CONFIRMED** | Stated by the project owner, in the brief or in the 2026-11-25 answers. |
| **APPROVED** | Part of the implementation plan the owner approved on 2026-11-25. Binding unless the owner changes it during this review. |
| **OPEN** | Not decided. Must be answered (§12) before the feature it affects is built. |
| **KEPT** | Existing FIIS behavior that carries over unchanged. |
| **DEFAULT** | An OPEN question the owner told us to proceed past (2026-11-25). The default is built and stays until the owner answers. |

Requirement IDs: `FR-<AREA>-NNN`. Questions: `Q-NN` (numbering restarts for BFP-CMS).

---

## 1. Purpose and scope

### 1.1 Purpose (CONFIRMED)

BFP-CMS is the centralized, nationwide platform for recording, monitoring, consolidating and reporting **casualties arising from BFP emergency response operations**, for three response types:

- Fire response (handled by the station's **Operations** section)
- Emergency Medical Service, EMS (handled by the **EMS** section)
- Special Rescue, including HAZMAT, CSSR (collapsed structure search and rescue) and other special rescue (handled by the **SRF**, Special Rescue Force)

A casualty is a person who was **injured** or **died** (a fatality). Casualties are recorded whoever the person is: civilian, BFP personnel, fire aide, BFP volunteer, other government personnel or law enforcement personnel.

### 1.2 Decisions of 2026-11-25 (CONFIRMED)

| # | Decision |
|---|---|
| C-1 | The fire investigation module (referrals, investigations, reports, chief-investigator and investigator roles) is **retired** and removed. |
| C-2 | All existing FIIS data is test data and may be deleted. The schema restarts from a clean baseline. |
| C-3 | BFP-AIMS: each incident carries an optional external reference (source system + AIMS incident number), unique per source system. A data import or API integration comes later, once AIMS access is known. |
| C-4 | Casualty records need **no approval**. A record counts once it is saved. |
| C-5 | Casualties are **fatalities and injured only**. There is no "missing" status. |
| C-6 | Operations accounts record only Fire incidents, EMS accounts only EMS incidents, and SRF accounts only special rescue incidents (HAZMAT, CSSR, etc.). |
| C-7 | The office structure stays as it is in FIIS. There are no substations. |
| C-8 | Roles are changed to a **role + section** model: role `SUPER_ADMIN`, `ADMIN`, `ENCODER` or `VIEWER`; section `OPERATIONS`, `EMS` or `SRF` for encoders and viewers; the tier comes from the user's office. |
| C-9 | An encoder's section is assigned by an admin, backed by a BFP designation order, audited, and checked against the database on every write (§7.4). |

### 1.3 In scope (APPROVED)

- Incidents of the three response types, with location, category, responding units, responsible personnel and an optional AIMS reference.
- Individual casualty records, with classification, personal, organizational, injury and death information.
- Controlled correction (reason + revision history), injured → deceased status change, soft deletion and restore.
- Dashboards, statistics, report tables and exports (CSV, Excel, PDF), limited to the viewer's jurisdiction and section.
- Administration: users, offices, positions, incident categories and lookups; audit log.
- Data privacy safeguards under RA 10173 (§10).

### 1.4 Out of scope

- Fire investigations (C-1).
- The FIIS fire-suppression timeline: status/alarm entries, voids and corrections, and incident creation approval. Highest alarm level and final status remain as plain incident fields (§4.3).
- Live integration with BFP-AIMS (C-3, later phase).
- Email and SMS notifications (in-app only, KEPT).

---

## 2. Organizational hierarchy (CONFIRMED C-7, KEPT)

### 2.1 Office types and parents

| Office type | Allowed parent |
|---|---|
| `NATIONAL_HEADQUARTERS` | none |
| `REGIONAL_OFFICE` | `NATIONAL_HEADQUARTERS` |
| `DISTRICT_FIRE_STATION`, `PROVINCIAL_FIRE_STATION` | `REGIONAL_OFFICE` |
| `CITY_FIRE_STATION`, `MUNICIPAL_FIRE_STATION` | `DISTRICT_FIRE_STATION` or `PROVINCIAL_FIRE_STATION` |

- Offices are data: admins create, rename, move and deactivate them. The rules above are enforced by `office/utils/office-heirarchy.validator.ts`.
- Each office below regional level stores `regionId`, its regional ancestor. Regional offices carry a unique `regionCode`, which incident numbers use.

### 2.2 Jurisdiction (KEPT rule, APPROVED reuse)

A user's jurisdiction is their own office plus every office below it:

| User's office | Records visible |
|---|---|
| National Headquarters | nationwide |
| Regional Office | all offices in the region (`regionId`) |
| District / Provincial | its city/municipal stations (`parentId`) |
| City / Municipal station | own station |

| ID | Requirement | Status |
|---|---|---|
| FR-SCOPE-001 | Every read path (lists, details, dashboards, reports, exports, attachments, audit) filters by jurisdiction in the backend. Hidden UI controls are never the protection. | APPROVED |
| FR-SCOPE-002 | Records outside the user's jurisdiction or section answer **404**, not 403. | KEPT |
| FR-SCOPE-003 | `SUPER_ADMIN` sees all records. | APPROVED |
| FR-SCOPE-004 | Section scope applies on top of office scope: an ENCODER, and a VIEWER with a section, see only incidents (and their casualties) of their section's response type (§7.3). | APPROVED |
| FR-SCOPE-005 | Records belong to the reporting office (the encoder's station). When a station moves to another district, province or region, its records move with it. | KEPT (FIIS Q-51) |

---

## 3. Response types and categories

### 3.1 Response types (CONFIRMED C-6)

| Response type | Handled by section | Examples of categories |
|---|---|---|
| `FIRE` | `OPERATIONS` | structural, non-structural, transportation, wildland |
| `EMS` | `EMS` | OPEN (Q-01) |
| `SPECIAL_RESCUE` | `SRF` | HAZMAT, CSSR, water search and rescue, vehicular extrication; full list OPEN (Q-01) |

| ID | Requirement | Status |
|---|---|---|
| FR-RT-001 | The section → response type mapping is fixed: OPERATIONS → FIRE, EMS → EMS, SRF → SPECIAL_RESCUE. | CONFIRMED |
| FR-RT-002 | Categories are a lookup table per response type, managed by `SUPER_ADMIN` and NHQ `ADMIN`. A new rescue kind is a new category row and needs no code change. | APPROVED |
| FR-RT-003 | An incident's category must belong to its response type. | APPROVED |
| FR-RT-004 | Categories in use are deactivated, not deleted. | APPROVED |
| FR-RT-005 | Adding a whole new response type, with its own section, is a schema change that needs owner approval. | APPROVED |

---

## 4. Incidents

### 4.1 General (APPROVED)

| ID | Requirement | Status |
|---|---|---|
| FR-INC-001 | Incidents are created at City/Municipal stations by an ENCODER, or by a station ADMIN (any response type). The reporting office is the creator's station. | APPROVED / DEFAULT (Q-02) |
| FR-INC-002 | The incident's response type is taken from the creator's section, never from the client (FR-RT-001). | CONFIRMED |
| FR-INC-003 | Required: category, place of occurrence, barangay. Optional: date/time of occurrence and of report, latitude/longitude, narrative. | APPROVED |
| FR-INC-004 | Region, province/district and city/municipality are derived from the reporting office, never taken from the client. | KEPT |
| FR-INC-005 | An incident number is generated in the create transaction, format `<RT>-YYYY-MM-<REGIONCODE>-NNNNNN` with RT = `FIR`, `EMS` or `SRF`. It uses the existing counter (`IncidentNumberCounter`, Asia/Manila month), keyed by year, month, region code and response type. The format is OPEN (Q-04). | APPROVED / OPEN format |
| FR-INC-006 | Optional external references: source system (`AIMS`, `OTHER`) + external id, unique per source system. A duplicate AIMS number is refused, and the response names the existing incident if the user may see it. | CONFIRMED (C-3) |
| FR-INC-007 | Duplicate-incident warning (not a block): when the same station has an incident of the same response type and barangay within ±2 hours of the entered occurrence time. | APPROVED |
| FR-INC-008 | Only ENCODERs of the reporting station's matching section, and the station ADMIN, may edit an incident. Edits are audited. | APPROVED |
| FR-INC-009 | Soft deletion with a required reason, by the station ADMIN or `SUPER_ADMIN`. It hides the incident and its casualties and attachments from every list and statistic. Only `SUPER_ADMIN` lists and restores deleted incidents. | APPROVED |

### 4.2 Responding units and personnel (CONFIRMED brief §4)

| ID | Requirement | Status |
|---|---|---|
| FR-INC-010 | An incident lists its responding units: the responding office (any office), unit designation, lead unit flag, arrival time. | APPROVED |
| FR-INC-011 | An incident lists its responsible personnel: role (ground commander, team leader, reporting officer, …), name and rank, and optionally a link to a user account. | APPROVED |
| FR-INC-012 | Responding units do **not** create incidents of their own for a shared response. They are listed on the reporting station's incident. | APPROVED |

### 4.3 Response-specific details (APPROVED)

| Response type | Extra fields |
|---|---|
| FIRE | highest alarm level (existing `FireAlarmLevel` values), final status (existing fire status values), structures affected |
| EMS | nature of call; further fields OPEN (Q-01) |
| SPECIAL_RESCUE | hazard class (HAZMAT), persons rescued; further fields OPEN (Q-01) |

Minor extra fields per response type may be stored as validated JSON. Fields used in statistics get real columns.

---

## 5. Casualties

### 5.1 Principles (CONFIRMED)

- One record per person per incident (brief §4).
- A casualty belongs to exactly one incident. It is counted once, under the incident's reporting office, however many units responded.
- Statuses are `INJURED` and `DECEASED` only (C-5).
- There is no approval step (C-4).

### 5.2 Classification

| Field | Values | Status |
|---|---|---|
| Affiliation | `CIVILIAN`, `BFP_PERSONNEL`, `FIRE_AIDE`, `BFP_VOLUNTEER`, `OTHER_GOVERNMENT`, `OTHER_LAW_ENFORCEMENT`, `OTHER_UNCLASSIFIED` | CONFIRMED |
| Status | `INJURED`, `DECEASED` | CONFIRMED |
| Severity (injured) | `MINOR`, `SERIOUS`, `CRITICAL` | APPROVED, labels OPEN (Q-05) |
| Activity at time of casualty (responder affiliations) | `SUPPRESSION`, `RESCUE`, `EMS_CARE`, `TRANSPORT`, `OTHER` | APPROVED |

### 5.3 Data fields

| Group | Fields | Shown / required when |
|---|---|---|
| Identity (personal information) | last, first and middle name, suffix; date of birth **or** age (with an "estimated" flag); sex (`MALE`, `FEMALE`, `UNKNOWN`); nationality | always. Names may be blank when the person is unidentified (`isIdentified = false`) |
| Address (personal information) | address line, barangay, city/municipality, province | civilian, volunteer, fire aide, unclassified |
| Contact (personal information) | contact number | optional |
| Organization | agency (lookup: PNP, AFP, PCG, LGU-DRRMO, …); for BFP personnel: office, rank, optional linked user account (Q-07) | BFP personnel, fire aide, volunteer, other government, law enforcement |
| Injury (sensitive personal information) | injury types (lookup: burn, smoke inhalation, fracture, …), body parts, treatment (`ON_SITE`, `TRANSPORTED`, `REFUSED`, `NONE`), receiving facility, transported by | `INJURED`; also allowed for `DECEASED` |
| Death (sensitive personal information) | date/time of death, place of death (`ON_SCENE`, `IN_TRANSIT`, `HOSPITAL`), cause-of-death note | `DECEASED` |
| Response-specific | Fire: location in structure. EMS: chief complaint/triage. SRF: hazard exposure (HAZMAT), entrapment (CSSR) | by response type |

### 5.4 Functional requirements

| ID | Requirement | Status |
|---|---|---|
| FR-CAS-001 | ENCODERs of the incident's station and section, and the station ADMIN, add casualties to an incident, one record per person. | APPROVED |
| FR-CAS-002 | Each casualty gets a number `<incidentNo>-C<NN>`, sequential per incident and generated in the create transaction. | APPROVED |
| FR-CAS-003 | The backend validates fields against affiliation and status (§5.3). Example: a death date is required for DECEASED and refused for INJURED; the agency is required for OTHER_GOVERNMENT and OTHER_LAW_ENFORCEMENT. | APPROVED |
| FR-CAS-004 | Each record carries `isComplete`, computed on save from the fields expected for its affiliation and status. Lists show incomplete records. Incomplete records still count in statistics. | APPROVED |
| FR-CAS-005 | Duplicate-person warning (not a block): another non-deleted casualty on the same incident has the same normalized name and the same date of birth or age. | APPROVED |
| FR-CAS-006 | Status change: only `INJURED → DECEASED` is allowed (an injured person later dies). It requires the date of death, records a status event (from, to, when, who, remarks), and updates the current status. `DECEASED` is final. | CONFIRMED (C-5) / APPROVED |
| FR-CAS-007 | A status that was entered wrongly is fixed by a correction (FR-CAS-008), not by a status change. | APPROVED |
| FR-CAS-008 | Correction: any edit after creation requires a reason. It writes a revision (number, reason, changed field names, editor, time) and an audit entry. Earlier revisions are kept. | APPROVED |
| FR-CAS-009 | Soft deletion with a required reason, by the station ADMIN or `SUPER_ADMIN`. Only `SUPER_ADMIN` restores. A deleted casualty is excluded from statistics. | APPROVED |
| FR-CAS-010 | Records are permanently changed only by the retention job (FR-PRIV-008). | APPROVED |
| FR-CAS-011 | Each record shows who encoded it and their section, and who made each revision. | CONFIRMED (C-9) |

---

## 6. Monitoring and reporting (CONFIRMED brief §5)

| ID | Requirement | Status |
|---|---|---|
| FR-RPT-001 | Counting rule: non-deleted casualties of non-deleted incidents, counted once per casualty record, grouped under the incident's reporting office. | APPROVED |
| FR-RPT-002 | Every dashboard, report and export is limited to the viewer's jurisdiction and section (FR-SCOPE-001…004). | CONFIRMED |
| FR-RPT-003 | Dashboard: total casualties, deceased, injured, BFP personnel casualties (year to date, and vs. the same period last year); 12-month trend; top child offices; for encoders, their incomplete records. | APPROVED |
| FR-RPT-004 | Statistics with filters for date range, response type, affiliation, status and office. Breakdowns: nationwide total; by region; by province/district; by city/municipal station (drill-down follows the hierarchy); by response type; by affiliation; injured vs. deceased; by age group and sex; monthly/yearly trend. | CONFIRMED |
| FR-RPT-005 | Age is computed from date of birth at the incident date, otherwise taken from the entered age. Age groups: 0–4, 5–14, 15–24, 25–44, 45–59, 60+, unknown (OPEN Q-05). | APPROVED / OPEN bands |
| FR-RPT-006 | Map of incidents with casualties (incidents that have coordinates; OpenStreetMap tiles). | APPROVED |
| FR-RPT-007 | Casualty report table: paginated and filterable, with personal information masked by permission (§8). | APPROVED |
| FR-RPT-008 | Exports in CSV, Excel (.xlsx) and PDF. Exports leave out personal information by default. Including it needs the permission (§8) and a reason, and is audited. CSV keeps the formula-injection guard. | APPROVED |
| FR-RPT-009 | Large exports run in the background and are downloaded later from "My Exports" through an expiring link. | APPROVED |
| FR-RPT-010 | Official BFP report forms (layouts). | OPEN (Q-06) |

---

## 7. Users, roles and sections

### 7.1 Roles (CONFIRMED C-8)

| Brief label | Role | Office tier | Section |
|---|---|---|---|
| System Super Administrator | `SUPER_ADMIN` | NHQ | — |
| NHQ Administrator | `ADMIN` | National Headquarters | — |
| Regional Administrator | `ADMIN` | Regional Office | — |
| Provincial / District Administrator | `ADMIN` | District / Provincial | — |
| City / Municipal Fire Station Administrator | `ADMIN` | City / Municipal station | — |
| Encoder / Data Entry (Operations, EMS, SRF) | `ENCODER` | City / Municipal station | required |
| Reporting / Read-only (Operations, EMS, SRF) | `VIEWER` | any | required at station level; optional above (no section = all sections; DEFAULT Q-02) |

- `SUPER_ADMIN` is a single developer-held account created manually in the database (KEPT). No API can create it or assign it.
- Each account has exactly one section (DEFAULT Q-03). A person working in two sections gets a second account, or an admin changes the section.

### 7.2 Permissions matrix (APPROVED)

| Permission | SUPER_ADMIN | ADMIN NHQ | ADMIN Region / Prov-District | ADMIN Station | ENCODER | VIEWER |
|---|---|---|---|---|---|---|
| Manage categories and lookups | ✔ | ✔ | — | — | — | — |
| Manage offices | ✔ | ✔ (all except NHQ) | ✔ Regional: offices in own region | — | — | — |
| Manage users | ✔ | ✔ | ✔ below own office | ✔ own station | — | — |
| Create and edit incidents and casualties | — | — | — | ✔ own station, every section (DEFAULT Q-02) | ✔ own station, own section | — |
| Correct casualties (with reason) | — | — | — | ✔ | ✔ own section | — |
| Soft-delete incidents and casualties | ✔ | — | — | ✔ | — | — |
| Restore deleted records | ✔ | — | — | — | — | — |
| View records, dashboards, reports | ✔ all | ✔ national | ✔ jurisdiction | ✔ station | ✔ own section | ✔ jurisdiction (own section, if set) |
| View personal information (names, address, contact) | ✔ | ✔ audited | ✔ audited | ✔ | ✔ | own station only; masked above station (Q-05) |
| View medical and death details | ✔ | ✔ audited | ✔ audited | ✔ | ✔ | — |
| Export with personal information | ✔ | ✔ audited | ✔ audited | ✔ audited | — | — |
| Export aggregates / de-identified | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Read audit log | ✔ all | ✔ national | ✔ jurisdiction | ✔ own office | — | — |

Who may create which accounts:

| Creating account | May create |
|---|---|
| `SUPER_ADMIN` | anyone except `SUPER_ADMIN` |
| NHQ `ADMIN` | anyone except `SUPER_ADMIN` (KEPT: only NHQ and `SUPER_ADMIN` create Regional admins) |
| Regional `ADMIN` | ADMIN, ENCODER and VIEWER in its region, except Regional admins |
| District/Provincial `ADMIN` | ADMIN, ENCODER and VIEWER in its stations, and VIEWERs in its own office |
| Station `ADMIN` | ENCODER and VIEWER in its own station |

### 7.3 Section scope (CONFIRMED C-6)

| ID | Requirement | Status |
|---|---|---|
| FR-SEC-001 | An ENCODER creates and edits only incidents and casualties whose response type matches their section (FR-RT-001). | CONFIRMED |
| FR-SEC-002 | An ENCODER, and a VIEWER with a section, see only records of their section's response type. ADMINs and VIEWERs without a section see all response types in their jurisdiction. | APPROVED |
| FR-SEC-003 | A mismatch on a write returns 403 with a message naming the section, e.g. "Your section (EMS) cannot record Fire incidents." On a read it returns 404. | APPROVED |

### 7.4 How a user's section is set and checked (CONFIRMED C-9)

| ID | Requirement | Status |
|---|---|---|
| FR-USR-001 | Only an admin with authority over the user's office sets the section, when creating or editing the account. Users cannot change their own section. | CONFIRMED |
| FR-USR-002 | Section is required for ENCODER and for station-level VIEWER accounts. It is refused for ADMIN and `SUPER_ADMIN`. | APPROVED |
| FR-USR-003 | The admin records the designation reference (the BFP Special Order or office order that assigns the person to the section). Optional (DEFAULT Q-08). | APPROVED / DEFAULT |
| FR-USR-004 | Every section assignment or change is audited, with old and new section and the designation reference. | CONFIRMED |
| FR-USR-005 | On every write to an incident or casualty, the backend reads the user's current role, section, office and active flag from the database, so a change applies immediately. Read filters may use the token's values; a change reaches reads within 15 minutes (KEPT FIIS Q-41). | CONFIRMED |
| FR-USR-006 | Users are deactivated, not deleted. Admins cannot deactivate themselves. | KEPT |
| FR-USR-007 | An admin can reset a user's password within their authority. The user must then change it at next login. | APPROVED (answers FIIS Q-67) |

### 7.5 Authentication (KEPT)

| ID | Requirement | Status |
|---|---|---|
| FR-AUTH-001 | Login with account number and password (bcrypt). | KEPT |
| FR-AUTH-002 | 15-minute access token and 7-day refresh token as httpOnly cookies. Refresh tokens are stored hashed and rotated. Any auth failure returns 401 `TOKEN_EXPIRED`. | KEPT |
| FR-AUTH-003 | Users created through the API must change the default password before anything else (403 `PASSWORD_CHANGE_REQUIRED`). | KEPT |
| FR-AUTH-004 | After 5 failed logins the account is locked for 15 minutes. The login error is the same for every failure. | KEPT |
| FR-AUTH-005 | Login and export endpoints are rate-limited. Security headers are set (helmet). | APPROVED |
| FR-AUTH-006 | Optional TOTP two-factor authentication for ADMIN and `SUPER_ADMIN`. | APPROVED (Phase 6), OPEN whether mandatory |

---

## 8. Personal information handling (APPROVED)

- **Personal information:** names, date of birth, address and contact number of a casualty.
- **Sensitive personal information** (RA 10173 Sec. 3(l)): health data, meaning the injury and death details.

| ID | Requirement | Status |
|---|---|---|
| FR-PII-001 | Personal and sensitive information are stored apart from the classification fields that statistics use. Statistics, dashboards and de-identified exports never read them. | APPROVED |
| FR-PII-002 | Responses are masked per the matrix in §7.2. Masked names show initials only (e.g. "J. D."). | APPROVED |
| FR-PII-003 | Every view of personal or sensitive information by a user outside the reporting station is audited (`CASUALTY_PII_VIEWED`: who, which record, when). | APPROVED |
| FR-PII-004 | Casualties under 18 are always masked in lists and tables, for every role. The detail view follows FR-PII-002/003. | APPROVED |
| FR-PII-005 | The contact number and the cause-of-death note are encrypted in the database (AES-256-GCM, versioned key from configuration). | APPROVED |
| FR-PII-006 | Logs and error messages contain record ids only, never names or medical details. | APPROVED |

---

## 9. Audit, notifications and attachments

### 9.1 Audit (KEPT mechanism, extended)

| ID | Requirement | Status |
|---|---|---|
| FR-AUD-001 | Audited, in the same transaction as the change:<br>• create, update, status change, delete and restore of incidents and casualties;<br>• casualty personal-information views (FR-PII-003);<br>• exports (with filters, format and whether personal information was included);<br>• user, office, position, category and lookup changes;<br>• attachment downloads. | APPROVED |
| FR-AUD-002 | Audit entries hold field names and non-sensitive values only. They never hold passwords, tokens, or casualty personal or medical values. | APPROVED |
| FR-AUD-003 | Audit entries cannot be edited or deleted through any API. In production the application's database role has no UPDATE/DELETE right on the audit table. | APPROVED |
| FR-AUD-004 | Audit reading follows §7.2. | APPROVED |

### 9.2 Notifications (KEPT mechanism: in-app, after commit, preferences, skip the actor)

| ID | Event | Recipients | Status |
|---|---|---|---|
| FR-NOT-001 | A casualty with affiliation `BFP_PERSONNEL` is recorded | ADMINs of the regional office and NHQ | APPROVED |
| FR-NOT-002 | A casualty is recorded as, or changed to, `DECEASED` | ADMINs of the station's district/provincial and regional offices | APPROVED |
| FR-NOT-003 | Someone corrects a record another user created | the record's creator | APPROVED |

### 9.3 Attachments (KEPT mechanism)

| ID | Requirement | Status |
|---|---|---|
| FR-ATT-001 | Supporting documents (e.g. spot report, medical certificate, death certificate) may be attached to an incident or a casualty. JPEG, PNG, WebP and PDF, up to 20 MB, checked by file signature, with a SHA-256 hash stored. | KEPT / APPROVED |
| FR-ATT-002 | Casualty attachments are sensitive: they are visible to the roles that may view medical details (§7.2), and every download is audited. | APPROVED |
| FR-ATT-003 | Attachments are hidden and restored with their record, and purged by the retention job (FR-PRIV-008). | APPROVED |

---

## 10. Data privacy and security (CONFIRMED brief §7; APPROVED design)

| ID | Requirement | Status |
|---|---|---|
| FR-PRIV-001 | Processing relies on the BFP's legal mandate. This includes RA 9514 and RA 11589, and RA 10173 Sec. 12(e) and 13 for processing by a public authority. Consent is not the basis. | APPROVED, to be confirmed by the BFP Data Protection Officer (Q-09) |
| FR-PRIV-002 | A privacy notice is shown on the login page. | APPROVED, wording from the BFP DPO |
| FR-PRIV-003 | A Privacy Impact Assessment and NPC registration of the system are completed before production. These are outside the code; the project supplies the technical inputs. | APPROVED |
| FR-PRIV-004 | TLS for all traffic. The database volume and backups are encrypted at rest. | APPROVED |
| FR-PRIV-005 | Access control: §7.2, FR-SCOPE-*, FR-SEC-*, FR-PII-*. | APPROVED |
| FR-PRIV-006 | Controlled correction and deletion: FR-CAS-008/009, FR-INC-009. | APPROVED |
| FR-PRIV-007 | Audit trail: §9.1. It supports NPC breach notification within 72 hours. | APPROVED |
| FR-PRIV-008 | Retention: after a configurable period (OPEN Q-10), a scheduled job anonymizes personal and sensitive information and purges casualty attachments. Classification fields remain for statistics. Every run is audited. | APPROVED / OPEN period |

---

## 11. Data migration (CONFIRMED C-2)

- FIIS data is test data. The schema restarts from a single new baseline migration. This requires resetting development databases, which needs the owner's explicit go-ahead at implementation time.
- A seed script provides: fire and SRF categories, agencies, injury types, a sample office tree, and (development only) a `SUPER_ADMIN` from environment variables.
- The real BFP office master list is loaded later through an admin import.
- AIMS import comes in a later phase (C-3).

---

## 12. Open questions

| ID | Question |
|---|---|
| Q-01 | The full list of SRF categories (HAZMAT, CSSR, …) and of EMS categories. Which fields are mandatory per response type? |
| Q-02 | Do station ADMINs also encode, or only ENCODER accounts? May VIEWERs at district/provincial level and above have no section (see all sections)? **Default built:** station admins encode every response type; viewers above station level may have no section. |
| Q-03 | One section per account (a person in two sections has two accounts), or several sections per account? **Default built:** one section per account. |
| Q-04 | Is the incident number format `<FIR\|EMS\|SRF>-YYYY-MM-<REGIONCODE>-NNNNNN` acceptable? |
| Q-05 | Severity labels; age-group bands; may higher-office ADMINs see personal information by default (audited), or only after giving a reason? |
| Q-06 | Official BFP casualty report forms or PDF layouts to reproduce? |
| Q-07 | Are BFP-personnel casualties always linked to a user account, or recorded by name, rank and office only? |
| Q-08 | Is the section designation reference (Special Order) required or optional? **Default built:** optional. |
| Q-09 | Confirmation of the lawful basis and privacy notice wording by the BFP DPO. |
| Q-10 | Retention period for casualty personal information. |

---

## 13. Roadmap (APPROVED)

| Phase | Scope |
|---|---|
| 0 | This document; owner review; answers to §12 |
| 1 (built) | Foundation:<br>• remove investigations and the FIIS fire-incident module;<br>• new baseline schema with the office model unchanged;<br>• role + section;<br>• permission map and jurisdiction filter;<br>• seed;<br>• users admin;<br>• rebrand to BFP-CMS |
| 2 | Incidents: categories and lookups, incident with response-specific details, responding units, personnel, AIMS reference, numbering, duplicate warning, pages |
| 3 | Casualties: records, personal-information separation and encryption, masking, status change, corrections, deletion, audit, pages |
| 4 | Reports: dashboard, statistics, report table, CSV/Excel/PDF exports, map |
| 5 | Notifications and attachments for the new records |
| 6 | Hardening: retention job, rate limiting and helmet, admin password reset, optional 2FA, performance (summary tables), load test, deployment docs |

## 14. Approval

| Item | Owner | Status |
|---|---|---|
| Implementation plan (architecture, modules, data design, phases) | Project owner | Approved 2026-11-25 |
| This document (BFP-CMS revision 1) | Project owner | Awaiting review |
| §12 open questions | Project owner | Open |
