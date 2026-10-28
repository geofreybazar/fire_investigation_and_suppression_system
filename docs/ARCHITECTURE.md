# FIIS Architecture

How the code is organized and how a request moves through it. Business rules live in [REQUIREMENTS.md](REQUIREMENTS.md); tables and relations are in [DATA_MODEL.md](DATA_MODEL.md).

## 1. Runtime topology

FIIS is two independent npm projects deployed as one process.

```
Browser ──► NestJS (PORT)
              ├── /api/*      → controllers (backend/src/modules/*)
              └── everything else → frontend/dist (SPA, index.html fallback)
                                     │
                                     ▼
                                PostgreSQL (Prisma 7, @prisma/adapter-pg)
```

- `backend/src/main.ts` sets the global `api` prefix, `cookie-parser`, the global `StandardSchemaValidationPipe` (Zod) and the global `PrismaExceptionFilter`.
- `backend/src/app.module.ts` registers `ServeStaticModule` only if `frontend/dist/index.html` exists (override with `FRONTEND_DIST`), so the backend runs API-only during development.
- In development, Vite (`frontend/vite.config.ts`) proxies `/api` to `localhost:3000`.

## 2. Backend

### 2.1 Module layout

Each feature in `backend/src/modules/<feature>/` follows the same shape:

| File | Responsibility |
|---|---|
| `*.controller.ts` | HTTP only: route, guards, `@Roles`, `@CurrentUser()`, `@Body({ schema })` |
| `*.service.ts` | Business rules and resource-level authorization |
| `*.repository.ts` | The only layer that uses `PrismaService`; owns transactions |
| `schema/*.schema.ts` | Zod input schemas (often with the `normalizInput` transform) |
| `utils/*.ts` | Pure rule functions, unit-tested without a database |

Relative imports use the `.js` extension (ESM). Prisma types come from `src/generated/prisma/` (`client.js`, `enums.js`).

### 2.2 Modules and endpoints

All paths are under `/api`.

| Module | Prefix | Endpoints | Who |
|---|---|---|---|
| auth | `auth` | `POST login`, `POST logout`, `POST refresh_token` | public / cookie |
| users | `users` | `POST /`, `GET /`, `GET :id`, `PATCH /` (own password), `PATCH :id` (status), `PATCH edituser/:id` | admins; `GET :id` and `PATCH /` for the current user |
| office | `office_api` | `POST /`, `GET /`, `GET alloffices`, `PATCH :id`, `DELETE :id` | `SUPER_ADMIN`, `NHQ_ADMIN`, `REGIONAL_ADMIN` |
| position | `position_api` | `POST /`, `GET /`, `GET allpositions`, `PATCH :id`, `DELETE :id` | admins |
| notification | `notification` | `GET inbox`, `GET unread-count`, `POST read-all`, `POST :id/read`, `GET :id` and `PATCH :id` (preferences) | current user only |
| fire-incident-categories | `fire_incident_categories_api` | `POST /`, `GET /`, `GET :id`, `PATCH :id`, `DELETE :id` | NHQ writes; incident roles read |
| fire-incident-subcategories | `fire_incident_subcategories_api` | `POST /`, `GET :id`, `PATCH :id` (name), `DELETE :id` | NHQ writes; incident roles read |
| fire-incident | `fire-incident` | `POST /`, `GET /`, `GET deleted`, `GET :id`, `PATCH :id`, `POST :id/resubmit`, `POST :id/approve`, `POST :id/reject`, `POST :id/timeline`, `POST :id/timeline/:entryId/void`, `POST :id/timeline/:entryId/correct`, `DELETE :id`, `POST :id/restore` | see §2.4 |
| audit | `audit` | `GET /` (paginated; filter by action, entity, actor, date) | `SUPER_ADMIN` all; `NHQ_ADMIN` admin changes; `REGIONAL_ADMIN` its region plus its own actions |
| investigation | `investigation` | `GET queue`, `GET assigned`, `GET incident/:incidentId`, `GET incident/:incidentId/candidates`, `POST incident/:incidentId/refer`, `POST incident/:incidentId/start`, `GET :id`, `PATCH :id`, `POST :id/submit`, `POST :id/review` | chiefs, investigators, incident viewers |

### 2.3 Request lifecycle

```
cookie access_token
  → AuthGuard          verifies JWT, sets request.user (CurrentUserJwtPayload); any failure → 401 { error: "TOKEN_EXPIRED" }
  → RoleGuard          checks @Roles(...) against user.role
  → Validation pipe    Zod schema from @Body({ schema })
  → Controller         passes @CurrentUser() to the service
  → Service            resource-level authorization (office scope, ownership, state) and business rules
  → Repository         Prisma queries; multi-step writes in $transaction
  → PrismaExceptionFilter  maps Prisma errors (P2002 unique, etc.) to HTTP errors
```

`CurrentUserJwtPayload` (`src/types/jwt.payload.ts`) carries `sub`, `account_number`, `role`, `positionId` and `officeId`. Every authorization decision starts from it.

### 2.4 Authentication

- `POST /api/auth/login` checks the password with bcrypt and rejects inactive users. It sets two httpOnly cookies: `access_token` (15 min) and `refresh_token` (7 days). The password hash is never returned.
- Refresh tokens are stored in the `RefreshToken` table as SHA-256 hashes (`auth.repository.ts`). `POST /api/auth/refresh_token` validates the stored token and the user's `isActive` flag, then rotates both cookies. `POST /api/auth/logout` deletes the stored token and clears both cookies.
- The frontend depends on the exact error string `TOKEN_EXPIRED` to trigger a refresh (§3.2).

### 2.5 Authorization

There are two layers.

1. **Coarse role checks:** `@Roles(...)` with `@UseGuards(AuthGuard, RoleGuard)` on controllers and methods.
2. **Resource and scope checks in services.**
   - Administration: `users/service/users.authorization.service.ts` and `office/services/office.authorization.service.ts`, driven by the exhaustive `Record<ROLE, …>` maps in `users/utils/users.permissions.ts`, `users/utils/users.role_office.permissions.ts` and `office/utils/office.permissions.ts`. They decide which roles and office types an admin may create or assign, and they limit `REGIONAL_ADMIN` to its own region (`regionId`).
   - Incidents: `fire-incident/utils/incident-scope.ts` defines the role groups (`INCIDENT_EDITOR_ROLES`, `STATION_OPERATIONS_ROLES`, `INCIDENT_VIEWER_ROLES`). It also defines the visibility rules, `incidentScopeWhere()` for lists and `isIncidentVisible()` for one incident:
     - Deleted incidents are never listed. `SUPER_ADMIN` reads them through `GET deleted`.
     - `SUPER_ADMIN` and NHQ users see all offices. Everyone else sees incidents where the owning office is theirs, their child (`parentId`) or in their region (`regionId`).
     - Only `SUPER_ADMIN` and the station operations group see `PENDING`/`REJECTED` incidents.
     - Admin roles have no incident access.
   - Investigations: `investigation/utils/investigation-rules.ts` defines `CHIEF_INVESTIGATOR_ROLES`, `INVESTIGATOR_ROLES`, the station chain, referral targets and direction, and the conclusion check.

### 2.6 Office hierarchy

`office/utils/office-heirarchy.validator.ts` enforces NHQ → Regional → District/Provincial → City/Municipal station. A regional office has a unique `regionCode` (`office/utils/validateRegionCode.ts`), and every office below it stores `regionId`, so region-scoped queries need one filter instead of walking the tree.

### 2.7 Fire-incident workflow

- **Submit** (`CITY_MUNICIPALITY_OPERATION_STAFF`, `CITY_MUNICIPALITY_COMMEL`): creates the incident as `PENDING`, owned by the submitter's station. Location region, province/district and city/municipality come from the office hierarchy, never from the client. The initial timeline entry is created in the same write.
- **Approve / reject** (`CITY_MUNICIPALITY_OPERATION` of the owning station): approval runs in one transaction. It flips the status, calls `generateIncidentNumber(tx, regionCode)` (`fire-incident/utils/generate-incident-number.ts`), and writes a `FireIncidentEvent`. The number format is `YYYY-MM-<REGIONCODE>-NNNNNN`, using the Asia/Manila month and the `IncidentNumberCounter` upsert. Rejected incidents can be resubmitted.
- **Timeline:** every status and alarm change is an `IncidentTimeline` entry. The transition and alarm rules are pure functions in `fire-incident/utils/incident-rules.ts` (`assertValidTransition`, `assertValidTimeline`, `currentTimelineState`, `ALARM_ORDER`). Corrections void the old entry and add a replacement linked through `correctsEntryId`.
- **Delete / restore:** staff may remove only rejected, never-approved incidents. `SUPER_ADMIN` soft-deletes approved incidents with a reason and the Chief, BFP memo reference (`deletedAt`, `deletedById`, `deletionReason`, `deletionMemoReference`; the `DELETED` event keeps the memo after a restore) and can restore them.

### 2.8 Investigation workflow

The handling office starts as the owning station (`FireIncident.investigationHandlingOfficeId`). Its chief investigator can:

- **refer** the case up to an ancestor or down the station chain (`InvestigationReferral`), or
- **start** an investigation. This creates the `Investigation`, assigns an investigator of the handling office, and generates `INV-<incidentNo>-<NN>`. The `InvestigationReport` is created as `DRAFT` on the investigator's first draft save.

Only `FIRE_OUT` and `FIRE_OUT_UPON_ARRIVAL` incidents are investigable (`INVESTIGABLE_STATUSES`), and at most one investigation can be open at a time. The assigned investigator edits and submits the report; the handling chief reviews it (`InvestigationReportReview`). Approval requires `classification` and `causeOfFire` other than `UNDER_INVESTIGATION`, and it completes and locks the investigation. Users with an open investigation cannot be deactivated, moved or edited (`users.service.ts`, `countOpenAssignedInvestigations`).

### 2.9 Cross-cutting

| Concern | Where |
|---|---|
| Notifications | `modules/notification/notification.dispatcher.ts`: `NotificationDispatcher.notify(event)`, called by the fire-incident and investigation services after a change commits. Resolves recipients (specific users, or active holders of roles in an office), applies preferences, skips the actor, and never throws. Wording in `notification.messages.ts` |
| Audit trail | `modules/audit/audit.writer.ts`: `recordAudit(tx, entry)`, called by the users, office, position, category, subcategory and fire-incident repositories inside the transaction that makes the change; `auditChanges`/`auditSnapshot` record only listed, non-sensitive fields |
| Prisma error mapping | `common/filters/prisma-exception.filter.ts` |
| Role decorator / guard | `common/decorators/roles.decorator.ts`, `common/guards/role.guard.ts` |
| Current user | `common/decorators/current-user.decorator.ts` |
| Input normalization | `common/utils/normalizeInput.ts` (`normalizInput`) |
| Config | `config/configuration.ts` (`DATABASE_URL`, `JWT_SECRET`, `REFRESH_SECRET`, `DEFAULT_PASSWORD`, `PORT`) |
| Prisma client | `prisma.service.ts`, `prisma.module.ts`; config `prisma7.config.ts` |

### 2.10 Tests

Vitest specs sit next to each controller, service and repository, plus `utils/*.spec.ts` for the pure rule modules (`incident-rules`, `incident-scope`, `investigation-rules`). E2E tests use `test/*.e2e-spec.ts` with `vitest.config.e2e.ts`.

## 3. Frontend

### 3.1 Layers

```
service/*.service.ts            axios calls through axiosJWT("/api/<prefix>")
  → hooks/<feature>/use*.ts     one TanStack Query hook per query or mutation;
                                mutations invalidate query keys and toast via utils/resubaleToast.ts
  → components/features/<feature>/
  → pages/*.tsx                 routed by components/app/Router.tsx
```

| Folder | Contents |
|---|---|
| `service/` | `auth`, `user`, `office`, `position`, `notification`, `incidentSubClassification`, `fireIncident`, `investigation` services and `AxiosCreate.ts` |
| `hooks/` | per-feature query and mutation hooks (`fireIncidents/`, `investigations/`, `users/`, `offices/`, `position/`, `notifications/`, …) |
| `interface/` | request and response types and Zod form schemas |
| `components/ui/` | shadcn components (`base-vega` style on `@base-ui/react`) |
| `components/common/` | shared dialogs, pagination, skeletons, `form/FormFields.tsx`; `PageHeader` (the one page heading: icon, title, description, actions), `EmptyState`, `ComingSoon` (placeholder sections) |
| `components/layout/` | `Layout`, `AppSidebar` (one `NavGroup` per link group, icons in `navIcons.tsx`), `Navbar` (clock, notification bell, theme toggle) |
| `store/userStore.ts` | Zustand global user state |
| `utils/incidentPermissions.ts` | decides which incident controls to show (display only) |
| `constants/` | enum labels and options, sidebar links |

`@/` aliases `src/`. React Compiler is enabled through Babel.

Theme tokens live in `src/index.css`: BFP red as `--primary` (light and dark), plus `--success`, `--warning` and `--info` for status badges (`StatusBadges.tsx` maps each incident, approval and report status to one of them). The theme follows the device setting until the user picks one; `ThemeProvider` wraps the whole app, including the login page.

### 3.2 API client and token refresh

`service/AxiosCreate.ts` creates an axios instance with `withCredentials: true`. On a `TOKEN_EXPIRED` response it runs a single shared `POST /api/auth/refresh_token`, so concurrent requests wait on one promise, and then retries the original request once. On `Unauthorized` or a failed refresh it clears the stored user and redirects to `/login`.

### 3.3 Routes

The navbar bell (`components/layout/Navbar/NotificationBell.tsx`) polls the unread count every 60 s and loads the latest notifications when opened.

`components/app/Router.tsx` holds a flat route list. Each route uses the `canAccess` rule of its sidebar link in `constants/links.ts`, and the sidebar hides links and empty groups the role can't use (display only). `FireIncidents`, `FireIncidentDetail`, `Investigations` and `InvestigationDetail` are code-split with `@loadable/component`.

| Status | Pages |
|---|---|
| Implemented | `FireIncidents`, `FireIncidentDetail`, `Investigations`, `InvestigationDetail`, `Personnel`, `Offices`, `Positions`, `IncidentClassification`, `Settings`, `MyProfile`, `LoginPage` |
| Implemented (admin) | `AuditLog` (`/auditlog`, lazy-loaded) |
| Placeholder | `Dashboard`, `IncidentMap`, `FireStations`, `Monitoring`, `ResponseUnits`, `Evidence`, `IncidentReports`, `Statistics` |

The frontend hides controls by role for usability only. The backend enforces every rule.
