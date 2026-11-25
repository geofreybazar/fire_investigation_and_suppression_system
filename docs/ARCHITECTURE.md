# BFP-CMS Architecture

How the code is organized and how a request moves through it. Business rules live in [REQUIREMENTS.md](REQUIREMENTS.md); tables and relations are in [DATA_MODEL.md](DATA_MODEL.md).

This describes the code as of roadmap Phase 1 (foundation). Incident, casualty, report, notification-event and attachment modules are added in Phases 2–5 (REQUIREMENTS.md §13).

## 1. Runtime topology

BFP-CMS is two independent npm projects deployed as one process.

```
Browser ──► NestJS (PORT)
              ├── /api/*      → controllers (backend/src/modules/*)
              └── everything else → frontend/dist (SPA, index.html fallback)
                                     │
                                     ▼
                                PostgreSQL (Prisma 7, @prisma/adapter-pg)
```

- `backend/src/main.ts` sets:
  - the global `api` prefix;
  - `cookie-parser`;
  - the global `StandardSchemaValidationPipe` (Zod);
  - the global `PrismaExceptionFilter`.
- `backend/src/app.module.ts` registers `ServeStaticModule` only if `frontend/dist/index.html` exists (override with `FRONTEND_DIST`). The backend therefore runs API-only during development.
- In development, Vite (`frontend/vite.config.ts`) proxies `/api` to `localhost:3000`.

## 2. Backend

### 2.1 Module layout

Each feature in `backend/src/modules/<feature>/` follows the same shape:

| File | Responsibility |
|---|---|
| `*.controller.ts` | HTTP only: route, guards, `@RequirePermission`, `@CurrentUser()`, `@Body({ schema })` |
| `*.service.ts` | Business rules and resource-level authorization |
| `*.repository.ts` | The only layer that uses `PrismaService`; owns transactions |
| `schema/*.schema.ts` | Zod input schemas (often with the `normalizInput` transform) |
| `utils/*.ts` | Pure rule functions, unit-tested without a database |

Relative imports use the `.js` extension (ESM). Prisma types come from `src/generated/prisma/` (`client.js`, `enums.js`).

Shared code lives in `backend/src/common/`:

| Folder | Contents |
|---|---|
| `authz/` | `tier.ts` (office type → tier), `permissions.ts` (role × tier permission matrix), `section.ts` (section → response type, `assertSectionMayRecord`), `user-assignment.ts` (`canAssign`, `canManageAccount`, `sectionError`) |
| `scope/` | `jurisdiction.ts`: `officeScopeWhere`, `isOfficeInScope`, `jurisdictionWhere`, `isInJurisdiction` |
| `numbering/` | `generate-incident-number.ts` (`<FIR\|EMS\|SRF>-YYYY-MM-<REGIONCODE>-NNNNNN`) |
| `files/` | `attachment.storage.ts`, `file-type.ts` (file signature checks); used by attachments in Phase 5 |
| `guards/`, `decorators/` | `PermissionGuard` + `@RequirePermission`, `RoleGuard` + `@Roles`, `@CurrentUser`, `@AllowPendingPasswordChange` |
| `filters/` | `PrismaExceptionFilter` |
| `utils/` | `normalizeInput.ts`, `csv.ts` (CSV with a formula-injection guard) |

### 2.2 Modules and endpoints

All paths are under `/api`.

| Module | Prefix | Endpoints | Who |
|---|---|---|---|
| auth | `auth` | `POST login`, `POST logout`, `POST refresh_token` | public / cookie |
| users | `users` | `POST /`, `GET /`, `GET :id`, `PATCH /` (own password), `PATCH :id` (status), `PATCH edituser/:id`, `POST :id/reset-password` | `USER_MANAGE`; `GET :id` and `PATCH /` also for the current user |
| office | `office_api` | `POST /`, `GET /`, `GET alloffices`, `PATCH :id`, `DELETE :id` | writes `OFFICE_MANAGE`; lists also `USER_MANAGE` |
| position | `position_api` | `POST /`, `GET /`, `GET allpositions`, `PATCH :id`, `DELETE :id` | writes `POSITION_MANAGE`; lists also `USER_MANAGE` |
| notification | `notification` | `GET inbox`, `GET unread-count`, `POST read-all`, `POST :id/read`, `GET :id` and `PATCH :id` (preferences) | current user only |
| audit | `audit` | `GET /` (paginated; filter by action, entity, actor, date) | `AUDIT_VIEW`, scoped (§2.5) |

### 2.3 Request lifecycle

```
cookie access_token
  → AuthGuard          verifies JWT, sets request.user (CurrentUserJwtPayload); any failure → 401 { error: "TOKEN_EXPIRED" }
  → PermissionGuard    checks @RequirePermission(...) against the role × tier matrix
  → Validation pipe    Zod schema from @Body({ schema })
  → Controller         passes @CurrentUser() to the service
  → Service            resource-level authorization (jurisdiction, section, assignment rules) and business rules
  → Repository         Prisma queries; multi-step writes in $transaction, with recordAudit(tx, …)
  → PrismaExceptionFilter  maps Prisma errors (P2002 unique, etc.) to HTTP errors
```

`CurrentUserJwtPayload` (`src/types/jwt.payload.ts`) carries `sub`, `account_number`, `role`, `section`, `positionId`, `officeId` and `officeType`. Every authorization decision starts from it. Writes to incidents and casualties (from Phase 2) re-read the user's role, section, office and active flag from the database (FR-USR-005).

### 2.4 Authentication

- `POST /api/auth/login` checks the password with bcrypt and rejects inactive users. It sets two httpOnly cookies: `access_token` (15 min) and `refresh_token` (7 days). The password hash is never returned. After 5 failed logins the account is locked for 15 minutes.
- Users created through the API, and users whose password an admin reset, have `mustChangePassword` set. The flag is carried in the JWT. `AuthGuard` answers 403 `PASSWORD_CHANGE_REQUIRED` except on routes marked `@AllowPendingPasswordChange()`.
- Refresh tokens are stored in the `RefreshToken` table as SHA-256 hashes.
  - `POST /api/auth/refresh_token` validates the stored token and the user's `isActive` flag, then rotates both cookies.
  - `POST /api/auth/logout` deletes the stored token and clears both cookies.
  - An admin password reset deletes all of the user's refresh tokens.
- The frontend depends on the exact error string `TOKEN_EXPIRED` to trigger a refresh (§3.2).

### 2.5 Authorization

There are two layers.

1. **Coarse permission checks:** `@RequirePermission(...)` with `@UseGuards(AuthGuard, PermissionGuard)`. `common/authz/permissions.ts` is REQUIREMENTS.md §7.2 as data: for each role, the tiers at which it holds each permission. Tiers come from `common/authz/tier.ts`: NHQ, REGIONAL, DISTRICT_PROVINCE and STATION.
2. **Resource and scope checks in services.**
   - **Jurisdiction** (`common/scope/jurisdiction.ts`). An office is in a user's jurisdiction when one of these holds:
     - it is the user's office;
     - for district/provincial users, its `parentId` is the user's office;
     - for regional users, its `regionId` is the user's office;
     - the user is at NHQ or is SUPER_ADMIN (no filter).

     For incidents, `jurisdictionWhere` adds `deletedAt: null` and, for encoders and section viewers, the section's response type. Out-of-scope records answer 404.
   - **Accounts** (`common/authz/user-assignment.ts`).
     - `canAssign(actor, role, office)`: SUPER_ADMIN can never be granted. Encoders exist only at stations. Regional admins work within their region but cannot create regional admins. District/provincial admins work in their stations and create viewers in their own office. Station admins create encoders and viewers of their own station.
     - `canManageAccount`: an admin manages an account they could have created.
     - `sectionError`: a section is required for encoders and station viewers, optional for viewers above station level, and refused for admins.
   - **Offices** (`office/utils/office.permissions.ts`): SUPER_ADMIN manages every type, NHQ admins every type below NHQ, and regional admins every type below regional. Each check also requires jurisdiction.
   - **Audit reading** (`audit.service.ts`): SUPER_ADMIN and NHQ admins read everything. Regional admins read entries whose office or region is theirs. District/provincial admins read their office and its stations. Station admins read their own office. Everyone also reads their own actions.

### 2.6 Office hierarchy

`office/utils/office-heirarchy.validator.ts` enforces NHQ → Regional → District/Provincial → City/Municipal station. A regional office has a unique `regionCode` (`office/utils/validateRegionCode.ts`). Every office below it stores `regionId`, so region-scoped queries need one filter instead of walking the tree. When an office moves, its descendants are re-regioned in the same transaction, and their records follow them.

### 2.7 Cross-cutting

| Concern | Where |
|---|---|
| Notifications | `modules/notification/notification.dispatcher.ts`: `NotificationDispatcher.notify(event)`, called after a change commits. Recipients are specific users, or active holders of some roles in some offices. It applies preferences (`casualtyAlerts`, `recordCorrections`), skips the actor, and never throws. Wording is in `notification.messages.ts` (record numbers only, never names). Event triggers come with the incident and casualty modules |
| Audit trail | `modules/audit/audit.writer.ts`: `recordAudit(tx, entry)`, called by repositories inside the transaction that makes the change. `auditChanges`/`auditSnapshot` record only listed, non-sensitive fields. User audits include `role`, `section` and `sectionDesignationRef` |
| Seed | `src/seed/seed.ts`, run with `npm run seed`. It loads reference data idempotently. `SEED_DEV=true` adds a sample office tree and a SUPER_ADMIN from environment variables, and is refused in production |
| Prisma error mapping | `common/filters/prisma-exception.filter.ts` |
| Config | `config/configuration.ts` (`DATABASE_URL`, `JWT_SECRET`, `REFRESH_SECRET`, `DEFAULT_PASSWORD`, `PORT`); optional `FRONTEND_DIST`, `UPLOAD_DIR` |
| Prisma client | `prisma.service.ts`, `prisma.module.ts`; config `prisma7.config.ts` |

### 2.8 Tests

Vitest specs sit next to each controller, service and repository. The pure rule modules have `*.spec.ts` beside them, in `common/authz`, `common/scope` and `common/numbering`. `permissions.spec.ts` walks the §7.2 matrix row by row. E2E tests use `test/*.e2e-spec.ts` with `vitest.config.e2e.ts`, against the database in `backend/.env`.

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
| `service/` | `auth`, `user`, `office`, `position`, `notification`, `audit` services and `AxiosCreate.ts` |
| `hooks/` | per-feature query and mutation hooks |
| `interface/` | request and response types and Zod form schemas |
| `components/ui/` | shadcn components (`base-vega` style on `@base-ui/react`) |
| `components/common/` | shared dialogs, pagination, skeletons, `form/FormFields.tsx`, `PageHeader`, `EmptyState`, `ComingSoon` |
| `components/layout/` | `Layout`, `AppSidebar` (one group per `NAV_GROUPS` entry, icons in `navIcons.tsx`), `Navbar` (clock, notification bell, theme toggle) |
| `store/userStore.ts` | Zustand global user state (the login response: role, section, office) |
| `utils/permissions.ts` | display-only mirror of `common/authz`: `hasPermission`, `can`, `assignableRoles`, `sectionRule` |
| `constants/` | role, section and rank labels (`personnel.ts`), sidebar groups (`links.ts`) |

`@/` aliases `src/`. React Compiler is enabled through Babel. Theme tokens live in `src/index.css`.

### 3.2 API client and token refresh

`service/AxiosCreate.ts` creates an axios instance with `withCredentials: true`.

- On a `TOKEN_EXPIRED` response it runs a single shared `POST /api/auth/refresh_token`, so concurrent requests wait on one promise. It then retries the original request once.
- On `Unauthorized`, or when the refresh fails, it clears the stored user and redirects to `/login`.

### 3.3 Routes

`components/app/Router.tsx` holds a flat route list. Each route uses the `canAccess` rule of its link in `constants/links.ts`, and the sidebar hides links and empty groups the user can't use. Both are display only.

| Status | Pages |
|---|---|
| Implemented | `Dashboard` (shortcuts; casualty KPIs come in Phase 4), `Personnel` (role, section and designation-order fields), `Offices`, `Positions`, `AuditLog` (lazy-loaded), `Settings`, `MyProfile`, `LoginPage`, `ForcePasswordChange` |
| Planned | Incidents (Phase 2), Casualties (Phase 3), Statistics, Reports, Map and exports (Phase 4), attachments (Phase 5) |

The navbar bell polls the unread count every 60 s. Notifications link to `/incidents/:id` or `/casualties/:id`.

The frontend hides controls by role for usability only. The backend enforces every rule.
