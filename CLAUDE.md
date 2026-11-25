# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

BFP-CMS (BFP Casualty Monitoring System) records and reports casualties of Bureau of Fire Protection (Philippines) emergency responses. It is being rebuilt from FIIS, a fire incident / investigation system (see BFP-CMS Domain Rules below). It is two independent npm projects with no root workspace:

- `backend/` — NestJS 12 + Prisma 7 (PostgreSQL via `@prisma/adapter-pg`), ESM (`"type": "module"`)
- `frontend/` — React 19 + Vite 8 + TanStack Query + Zustand + shadcn/ui (base-ui) + Tailwind v4

It deploys as a single app: NestJS serves the API under `/api` and the built React app (`frontend/dist`) for every other path. The root `package.json` only orchestrates the two projects (not an npm workspace); other commands run inside the relevant directory.

## Commands

### Root

```bash
npm run install:all   # npm install in backend and frontend
npm run build         # frontend build, then backend build
npm start             # production: one server on PORT serving API + frontend
npm run dev:backend   # in one terminal
npm run dev:frontend  # in another; Vite proxies /api to localhost:3000
```

### Backend (`cd backend`)

```bash
npm run start:dev                 # watch mode, port from PORT (default 3000)
npm run build                     # nest build -> dist/
npm run lint                      # oxlint --type-aware src/ test/
npm run format                    # prettier (single quotes, trailing commas)
npm test                          # vitest run (all *.spec.ts)
npx vitest run src/modules/office/office.service.spec.ts   # single test file
npx vitest run -t "should be defined"                      # filter by test name
npm run test:e2e                  # vitest with vitest.config.e2e.ts (test/*.e2e-spec.ts)
# E2E tests run against the database in backend/.env. Each creates its own
# records with a unique suffix and deletes them in afterAll.
npm run seed                      # reference data (categories, agencies, injury types); idempotent
SEED_DEV=true npm run seed        # plus a sample office tree and a SUPER_ADMIN from
                                  # SEED_SUPER_ADMIN_ACCOUNT/_PASSWORD/_EMAIL (refused in production)
```

Prisma (config is `prisma7.config.ts`, which reads `DATABASE_URL` from `.env`):

```bash
npx prisma migrate dev --name <name> --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts    # regenerates src/generated/prisma
```

Required env vars (see `src/config/configuration.ts` and `auth.service.ts`): `DATABASE_URL`, `JWT_SECRET`, `REFRESH_SECRET`, `DEFAULT_PASSWORD`, `PORT`. Optional `FRONTEND_DIST` overrides the frontend build location (default `../frontend/dist` relative to the backend's cwd). Optional `UPLOAD_DIR` sets where attachment files are stored (default `./uploads` relative to the backend's cwd, git-ignored; keep it outside any web root and include it in backups).

### Frontend (`cd frontend`)

```bash
npm run dev        # Vite dev server; proxies /api to localhost:3000
npm run build      # tsc -b && vite build
npm run lint       # eslint
```

There is no frontend test setup.

## Backend architecture

- **Routing**: `main.ts` sets a global `api` prefix, so a controller `@Controller('office_api')` is served at `/api/office_api`. `app.module.ts` registers `ServeStaticModule` (SPA fallback to `index.html`, excluding `/api/*`) only if `frontend/dist/index.html` exists, so the backend runs API-only in dev.
- **Module layout** (`src/modules/<feature>/`): `controller` → `service` → `repository`. Repositories are the only layer that touches `PrismaService`; services hold business rules and authorization. Request validation uses **Zod** schemas in `schema/*.schema.ts`, passed via `@Body({ schema: xSchema })` and enforced by the global `StandardSchemaValidationPipe` (not class-validator DTOs). Schemas often use `normalizInput` from `common/utils` as a transform.
- **ESM imports**: relative imports must use the `.js` extension (e.g. `'./office.service.js'`).
- **Prisma schema is split** across `prisma/schema.prisma` (generator + datasource) and `prisma/models/**/*.prisma`; the config points `schema` at the `prisma/` folder. The client is generated into `src/generated/prisma/` — import types/enums from `generated/prisma/client.js` or `generated/prisma/enums.js`, never `@prisma/client`. Don't hand-edit generated files.
- **Prisma errors** (`P2002` unique violations, etc.) are converted to HTTP exceptions globally by `common/filters/prisma-exception.filter.ts`, so repositories generally don't need to catch them.
- **Audit log:** changes are recorded with `recordAudit(tx, entry)` from `modules/audit/audit.writer.ts`, called by the repository **inside the transaction that makes the change**, with the affected office's `officeId`/`regionId` (REQUIREMENTS.md §9.1 lists what must be audited). Record only listed, non-sensitive fields (`auditSnapshot` / `auditChanges`); never passwords, tokens, or casualty personal or health values. Casualty status history and corrections are also kept in `CasualtyStatusEvent` and `CasualtyRevision`.
- **Notifications:** workflow notifications go through `NotificationDispatcher.notify()` (`modules/notification/notification.dispatcher.ts`) **after** the change commits; it applies user preferences, skips the actor and never throws. Wording lives in `notification.messages.ts`.
- **Jurisdiction** for any read path reuses `common/scope/jurisdiction.ts`: `officeScopeWhere()` / `isOfficeInScope()` for offices and users, `jurisdictionWhere()` / `isInJurisdiction()` for incidents (office scope plus the section filter). Out-of-scope records return 404, not 403.
- **Attachments** (rebuilt in roadmap Phase 5) are stored by `common/files/attachment.storage.ts` under `UPLOAD_DIR` (random keys, outside the web root) and only served through a download endpoint; `common/files/file-type.ts` checks file signatures.
- **Auth**: login sets `access_token` (15m) and `refresh_token` (7d) as httpOnly cookies; refresh tokens are persisted in the `RefreshToken` table and rotated on `/auth/refresh_token`. `AuthGuard` reads the cookie, and on any failure throws `TokenExpiredException` with `error: "TOKEN_EXPIRED"` — the frontend depends on that exact string to trigger a refresh. It also answers 403 `PASSWORD_CHANGE_REQUIRED` for users who must still change the default password, except on routes marked `@AllowPendingPasswordChange()`. After 5 failed logins an account is locked for 15 minutes.
- **Authorization** has two layers, both in `common/authz/`:
  1. `@RequirePermission(Permission.X)` + `@UseGuards(AuthGuard, PermissionGuard)` on controllers for coarse checks. `permissions.ts` is the role × tier matrix of REQUIREMENTS.md §7.2 (`hasPermission(user, permission)`); the tier comes from the office type (`tier.ts`). `@CurrentUser()` yields the `CurrentUserJwtPayload` (`role`, `section`, `officeId`, `officeType`). `RoleGuard`/`@Roles` remain for SUPER_ADMIN-only routes.
  2. Resource checks in services: `user-assignment.ts` (`canAssign`, `canManageAccount`, `sectionError`) decides which accounts an admin may create or manage; `section.ts` (`assertSectionMayRecord`, `sectionResponseTypeFilter`) ties encoders to their section's response type; `office/utils/office.permissions.ts` lists the office types an office manager may manage.
- **Office hierarchy** is enforced in `office/utils/office-heirarchy.validator.ts`: NHQ → Regional → District/Provincial → City/Municipal stations.
- **Incident numbers** are generated inside the create transaction via `common/numbering/generate-incident-number.ts` (`<FIR|EMS|SRF>-YYYY-MM-<REGIONCODE>-NNNNNN`), using the `IncidentNumberCounter` table keyed by (year, month, regionCode, responseType) in Asia/Manila time; regional offices carry a unique `regionCode`.
- **Build state:** roadmap Phase 1 (foundation) is built: role + section, permission matrix, jurisdiction, users/offices/positions/audit, the full BFP-CMS schema and seed. Incident, casualty, report, notification-event and attachment modules come in Phases 2–5 (REQUIREMENTS.md §13); their tables already exist.
- **Further docs:** `docs/ARCHITECTURE.md` (modules, request lifecycle, auth, workflows) and `docs/DATA_MODEL.md` (ER diagram, models, enums, migrations).

## Frontend architecture

- **Data flow**: `src/service/*.service.ts` (axios calls) → `src/hooks/<feature>/use*.ts` (one TanStack Query hook per query/mutation; mutations invalidate query keys and show toasts via `utils/resubaleToast.ts`) → `components/features/<feature>/` → `pages/`.
- **API client**: every service calls `axiosJWT("/api/<controller-prefix>")` from `service/AxiosCreate.ts`, which sends cookies and, on a `TOKEN_EXPIRED` response, performs a single shared `POST /api/auth/refresh_token` and retries; `Unauthorized` redirects to `/login`.
- **Dev proxy**: `vite.config.ts` proxies only `/api` to the backend; new controllers need no proxy changes.
- **Permissions** for showing links and controls come from `utils/permissions.ts`, a display-only mirror of `backend/src/common/authz/permissions.ts`; keep the two in step. Sidebar groups and page access rules are `NAV_GROUPS` in `constants/links.ts`.
- Global user state lives in `store/userStore.ts` (Zustand). Routes are a flat list in `components/app/Router.tsx`. `@/` aliases `src/`. shadcn components go in `src/components/ui` (style `base-vega`, built on `@base-ui/react`). React Compiler is enabled via Babel.

## Development Workflow

### Before Implementing a Feature

- Inspect the existing implementation, related modules, Prisma models, frontend components, hooks, services, and tests before editing.
- Read relevant requirements and architecture documentation when available.
- Identify reusable code before creating new components, hooks, services, or utilities.
- For multi-file changes or business-logic changes, propose an implementation plan before editing.
- Identify affected database models, API contracts, authorization rules, UI states, and tests.
- Ask for clarification when requirements conflict or critical business rules are unknown.
- Do not invent BFP policies or silently change approved business rules.

### During Implementation

- Implement one bounded feature or task at a time.
- Follow the existing module structure, naming conventions, error handling, and data flow.
- Avoid unrelated refactoring and unnecessary dependencies.
- Preserve backward compatibility unless a breaking change is explicitly approved.
- Keep controllers focused on HTTP handling, services responsible for business rules, and repositories responsible for database access.
- Keep frontend API calls in services, server-state operations in TanStack Query hooks, and reusable UI in appropriate components.
- Reuse existing shared components, utilities, validation schemas, and query-key conventions.

### After Implementation

- Run relevant backend tests and frontend/backend verification commands.
- Review the final diff for correctness, security, unintended changes, and missing edge cases.
- Report modified files, database migration implications, commands executed, test results, and remaining risks.
- Never claim a test, build, migration, or verification succeeded unless it was actually executed successfully.
- Do not commit changes unless requested.

## BFP-CMS Domain Rules

The system is being rebuilt from FIIS (fire incidents + investigations) into **BFP-CMS, the BFP Casualty Monitoring System**. `docs/REQUIREMENTS.md` (BFP-CMS revision 1, 2026-11-25) is the source of truth for the target rules below. Read the relevant section and its FR IDs before implementing a feature. Anything tagged OPEN there (§12) must be asked about, not guessed. Phase 1 (§13) is built; later phases are not. The FIIS rules are in git history (REQUIREMENTS.md revision 12, commit `936a920`). `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md` describe the current code and are updated per phase.

### Scope and decisions

- BFP-CMS records casualties (**fatalities and injured only**: `INJURED`, `DECEASED`) of Fire, EMS and Special Rescue (HAZMAT, CSSR, …) responses, one record per person.
- Investigations are retired; do not rebuild them. FIIS data is test data, and the schema restarts from a new baseline (a dev DB reset still needs explicit approval).
- Casualty records need no approval. Quality comes from validation, the `isComplete` flag, duplicate warnings, corrections with a reason and revision history, and soft deletion.
- BFP-AIMS: an optional external reference per incident, unique per source system. No live integration yet.

### Offices

- The office structure is unchanged from FIIS: NHQ → Regional → District/Provincial → City/Municipal station (`office-heirarchy.validator.ts`), with `parentId`, `regionId` and `regionCode`. There are no substations.
- Jurisdiction is the user's office plus the offices below it, using the existing `id OR parentId OR regionId` rule (to live in a shared `common/scope/jurisdiction.ts`). Out-of-scope records return 404.

### Roles and sections

- Roles are `SUPER_ADMIN`, `ADMIN`, `ENCODER` and `VIEWER`. The tier comes from the user's office type. `section` is `OPERATIONS`, `EMS` or `SRF`, required for ENCODER and station VIEWER and refused for ADMIN.
- The section fixes the response type: OPERATIONS → FIRE, EMS → EMS, SRF → SPECIAL_RESCUE. The incident's response type is taken from the encoder's section, never from the client. A wrong section returns 403 on writes and 404 on reads.
- Only an admin over the user's office sets the section, with the designation reference (Special Order). Section changes are audited. Writes re-read the user's role, section, office and active flag from the DB.
- `SUPER_ADMIN` is a single account created manually in the database. No API may create or assign it. Only NHQ `ADMIN` and `SUPER_ADMIN` create Regional admins.
- Encoding happens at City/Municipal stations only. Higher offices monitor.

### Incidents and casualties

- The incident belongs to the reporting station. Region, province/district and city/municipality come from the office, never from the client.
- Responding units and personnel are listed on the incident. A casualty belongs to one incident and is counted once, under the reporting office.
- Incident numbers reuse `generate-incident-number.ts` and the `IncidentNumberCounter`, keyed additionally by response type, in Asia/Manila time, inside the create transaction. Do not add a second numbering implementation.
- The only casualty status change is `INJURED → DECEASED`; `DECEASED` is final. Wrong entries are fixed by corrections (reason required, revision kept), never by overwriting history.
- Soft deletion with a reason, by the station ADMIN or `SUPER_ADMIN`. Only `SUPER_ADMIN` restores. Deleted records are excluded from statistics.

### Personal information (RA 10173)

- Casualty personal information (names, DOB, address, contact) and sensitive information (injury and death details) are stored apart from classification fields. Statistics and de-identified exports never read them.
- Mask personal information per the REQUIREMENTS.md §7.2 matrix, and audit views from outside the reporting station and exports that include personal information. Never put names or medical details in logs, errors or audit `changes`.

## Security and Authorization

- Enforce authentication, role permissions, and office/data scope in the backend.
- Use existing AuthGuard, RoleGuard, @Roles(), @CurrentUser(), and authorization services where appropriate.
- Check authorization inside service operations when access depends on the target resource, acting user's office, or organizational hierarchy.
- Never assume that hiding a button or restricting a frontend route provides authorization.
- Preserve the established office hierarchy and role × office-type permission rules.
- Prevent unauthorized cross-office reads, updates, assignments, and access to sensitive attachments.
- Never expose password hashes, refresh tokens, JWTs, secrets, or other sensitive fields in API responses or logs.
- Preserve the existing httpOnly cookie authentication and refresh-token rotation flow.
- Avoid logging sensitive incident, investigation, or personal information unnecessarily.

## Database and Migration Safety

- Inspect the split Prisma schema and prisma7.config.ts before modifying database models.
- Do not hand-edit generated Prisma client files.
- Review the impact of schema changes on existing relations, indexes, unique constraints, services, API contracts, and frontend consumers.
- Use Prisma transactions when multiple database operations must succeed or fail together.
- Prefer atomic database operations and appropriate uniqueness constraints for concurrency-sensitive workflows.
- Create named migrations using the existing Prisma 7 configuration.
- Never run prisma migrate reset, destructive SQL, or production migrations without explicit approval.
- Do not modify or delete existing migration history to resolve a migration error without investigating its cause.
- Regenerate the Prisma client after schema changes using the project's configured command.
- Check generated-client imports and TypeScript errors after schema changes.

## Testing and Verification

### Backend

- Add or update Vitest tests for new business rules and important edge cases.
- Test authorization failures, invalid transitions, missing records, duplicate records, and transaction-sensitive behavior where relevant.
- Follow the existing service and repository test conventions.
- Run relevant tests first, then broader tests when practical.
- Run linting and the backend build when relevant.

### Frontend

- Run the frontend lint and production build for affected UI changes.
- Verify loading, error, empty, success, validation, and unauthorized states where applicable.
- Follow existing TanStack Query invalidation and toast conventions.
- Verify form validation and API error handling.
- Do not introduce a new frontend testing framework without approval.

### Completion Criteria

A feature is not complete merely because its code has been written. Verify its acceptance criteria, applicable tests, authorization behavior, and build results. Clearly report any checks that could not be run.

## Change Boundaries

- Do not rebuild existing functionality without first identifying a concrete reason.
- Do not replace established libraries, architectural patterns, or authentication mechanisms without approval.
- Do not silently rename Prisma fields, enums, API endpoints, or query keys that other parts of the application depend on.
- Prefer minimal, targeted changes consistent with the current architecture.
- When requirements, documentation, and code disagree, identify the discrepancy and ask for clarification if the intended behavior cannot be established confidently.
