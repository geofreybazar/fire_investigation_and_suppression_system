# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

FIIS is a fire incident / investigation information system for the BFP (Bureau of Fire Protection, Philippines). It is two independent npm projects with no root workspace:

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
```

Prisma (config is `prisma7.config.ts`, which reads `DATABASE_URL` from `.env`):

```bash
npx prisma migrate dev --name <name> --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts    # regenerates src/generated/prisma
```

Required env vars (see `src/config/configuration.ts` and `auth.service.ts`): `DATABASE_URL`, `JWT_SECRET`, `REFRESH_SECRET`, `DEFAULT_PASSWORD`, `PORT`. Optional `FRONTEND_DIST` overrides the frontend build location (default `../frontend/dist` relative to the backend's cwd).

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
- **Auth**: login sets `access_token` (15m) and `refresh_token` (7d) as httpOnly cookies; refresh tokens are persisted in the `RefreshToken` table and rotated on `/auth/refresh_token`. `AuthGuard` reads the cookie, and on any failure throws `TokenExpiredException` with `error: "TOKEN_EXPIRED"` — the frontend depends on that exact string to trigger a refresh.
- **Authorization** has two layers:
  1. `@Roles(...)` + `@UseGuards(AuthGuard, RoleGuard)` on controllers for coarse role checks; `@CurrentUser()` yields the `CurrentUserJwtPayload`.
  2. Role × office-type permission maps (`users/utils/*.permissions.ts`, `office/utils/office.permissions.ts`, `OfficeAuthorizationService`) restrict which office types a role may manage/assign. Roles (`ROLE` enum in `prisma/models/user.prisma`) are tiered NHQ / REGIONAL / DISTRICT_PROVINCE / station; `REGIONAL_ADMIN` queries are scoped to their own office and offices whose `regionId` is theirs.
- **Office hierarchy** is enforced in `office/utils/office-heirarchy.validator.ts`: NHQ → Regional → District/Provincial → City/Municipal stations.
- **Incident numbers** are generated inside a transaction via `fire-incident/utils/generate-incident-number.ts`, using the `IncidentNumberCounter` table keyed by (year, month, regionCode) in Asia/Manila time; regional offices carry a unique `regionCode`.
- **Known gaps:** `docs/REQUIREMENTS.md` §10 lists where the current code and schema differ from the approved requirements (e.g. the fire-incident endpoint is an unguarded stub, `FireIncident` has no `officeId`, and `REKINDLE` and `CITY_MUNICIPALITY_CHIEF_INVESTIGATOR` are not yet in the enums), with the approved fix priority in §10.1.

## Frontend architecture

- **Data flow**: `src/service/*.service.ts` (axios calls) → `src/hooks/<feature>/use*.ts` (one TanStack Query hook per query/mutation; mutations invalidate query keys and show toasts via `utils/resubaleToast.ts`) → `components/features/<feature>/` → `pages/`.
- **API client**: every service calls `axiosJWT("/api/<controller-prefix>")` from `service/AxiosCreate.ts`, which sends cookies and, on a `TOKEN_EXPIRED` response, performs a single shared `POST /api/auth/refresh_token` and retries; `Unauthorized` redirects to `/login`.
- **Dev proxy**: `vite.config.ts` proxies only `/api` to the backend; new controllers need no proxy changes.
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

## FIIS Domain Rules

The approved business requirements are in `docs/REQUIREMENTS.md` (revision 10, approved 2026-10-10). It is the source of truth for the rules below. Read the relevant section and its FR IDs before implementing a feature. Anything still tagged OPEN there must be asked about, not guessed.

### Roles

- `SUPER_ADMIN` is a single developer-held account created manually in the database. No API may create or assign `SUPER_ADMIN`. For fire incidents it can only view, delete and restore. It has full access to investigations and administration.
- `NHQ_ADMIN` and `REGIONAL_ADMIN` manage users, offices and positions only; they have no access to fire incidents. Only `NHQ_ADMIN` (and `SUPER_ADMIN`) may create `REGIONAL_ADMIN`.
- `CITY_MUNICIPALITY_OPERATION` is the station's chief of operations; it approves incident creation and makes no incident changes. `CITY_MUNICIPALITY_COMMEL` (radio operator) has the same permissions as `CITY_MUNICIPALITY_OPERATION_STAFF`.
- `CITY_MUNICIPALITY_CHIEF_INVESTIGATOR` is an approved new role (not yet in the enum).
- Non-admin roles see approved incidents of their own office and all offices below it.

### Fire Incidents

- Treat FireIncident as the authoritative incident record. It is owned by the submitter's office, which is always a city/municipal station.
- Only `CITY_MUNICIPALITY_OPERATION_STAFF` and `CITY_MUNICIPALITY_COMMEL` create and update incidents and timeline entries. Creation is pending until the station's `CITY_MUNICIPALITY_OPERATION` approves it. Updates need no approval. Pending and rejected incidents are visible only to the station operations group and `SUPER_ADMIN`. Staff may remove only rejected, never-approved incidents.
- Only `SUPER_ADMIN` deletes approved incidents. Deletion is soft: it hides the incident and all connected data. `SUPER_ADMIN` can restore.
- Incident location is required and persisted with the incident. Region, province/district and city/municipality are derived from the submitter's office, never taken from the client. `placeOfOccurence` and `barangay` are typed by the user; latitude/longitude are optional. Incident date fields are optional.
- Status uses the exact Prisma enum identifiers `VERIFICATION`, `ON_GOING`, `FIRE_UNDER_CONTROL`, `FIRE_OUT`, `FIRE_OUT_UPON_ARRIVAL`, `FALSE_ALARM`, plus the approved `REKINDLE`. Follow the transition table in `docs/REQUIREMENTS.md` §3.3:
  - `FIRE_OUT` can only move to `REKINDLE`, and `REKINDLE` only back to `FIRE_OUT`.
  - `FIRE_OUT_UPON_ARRIVAL` and `FALSE_ALARM` are final.
- Alarm level only goes up (skips allowed), changes only through a timeline entry, and does not change on rekindle.
- Validate status and alarm transitions in the backend. Do not rely on frontend controls to enforce business rules.
- Every status or alarm change creates an `IncidentTimeline` entry. `occurredAt` is user-entered; ordering and "previous status" use `occurredAt`; `createdAt` is server-set. Corrections void the original entry and add a replacement; never overwrite or erase history.

### Incident Numbering

- Reuse the existing incident-number generation utility; the format `YYYY-MM-<REGIONCODE>-NNNNNN` is approved.
- Generate the incident number inside the transaction that approves the incident (pending incidents have no number).
- Preserve the counter uniqueness constraint for year, month, and region code.
- Use Asia/Manila consistently for incident-number date boundaries.
- Do not introduce a second incident-numbering implementation or bypass the existing counter.
- Investigation numbers are `INV-<incidentNo>-<NN>` (per-incident sequence), generated when the investigation starts. They do not use the incident counter.

### Investigations

- An incident may have several investigations, with **at most one open** (assigned and not yet approved). The unique `fireIncidentId` constraint is approved for removal.
- Investigations can start only when the incident is `FIRE_OUT` or `FIRE_OUT_UPON_ARRIVAL`, and they are optional.
- The handling office starts as the owning station. Its chief investigator may:
  - start an investigation (create and assign an investigator of the handling office in one step), or
  - refer the case up to any ancestor office, or down within the station's chain, or
  - do nothing.
- No referral and no reassignment while an investigation is open. An investigator with an open investigation cannot be deactivated, moved or edited.
- Only the assigned investigator edits and submits the report. Only the handling chief investigator reviews, approves or rejects it.
  - Rejected reports go back for editing.
  - Approval requires `classification` and `causeOfFire` to not be `UNDER_INVESTIGATION`; it completes and locks the investigation.
  - After approval, the case may be referred up or down for a new investigation. Statistics use the latest completed investigation.
- Keep incident lifecycle state separate from investigation-specific fields, such as cause, classification, origin, and investigation dates. Rekindling does not affect an open investigation.
- Do not invent investigation rules or classifications beyond `docs/REQUIREMENTS.md`.

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
