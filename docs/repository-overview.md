# RMC Repository Overview

A multi-tenant Education CRM ("RMC") for managing centers, teachers, students, classes, payments, attendance, grades, tests, and a coin-based gamification/reward system. It exposes a superuser/admin CRM, dedicated teacher and student portals, an owner multi-center console, and a Telegram bot for students/parents.

## 1. Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend (`ui/`) | React 19 + TypeScript + Vite 7 | `HashRouter`-based SPA, feature-first folder layout |
| Frontend state | Redux Toolkit + `redux-persist` | Domain slices in `ui/src/slices`, persisted drafts (e.g. session workflow) |
| Frontend UI kit | MUI 7 + Radix UI primitives + Tailwind CSS 3 + `class-variance-authority` | MUI for CRM screens, Radix/Tailwind (`components/ui`) for a shadcn-style design system |
| Frontend data fetching | Axios (`shared/api/api.ts`) + `@tanstack/react-query` (selectively) | Central Axios client with interceptors for auth/tenant headers |
| Frontend testing | Vitest + Testing Library (unit) · Playwright (e2e) | `ui/e2e` holds workflow-combination e2e specs |
| Backend (`service/`) — **primary, in production** | Express.js 4 + TypeScript (CommonJS) | Layered module architecture (routes → controllers → services → repositories) |
| Backend ORM | Drizzle ORM (query builder, `db/schema.ts`) + Sequelize (migrations only, `db:migrate`) | Drizzle for runtime queries; Sequelize CLI purely for schema migrations in `service/db/migrations` |
| Backend auth | `jsonwebtoken` + `bcryptjs`, custom RBAC middleware | JWT with `userType` (superuser/teacher/student/parent) + permission codes |
| Backend validation | `class-validator` / `class-transformer` DTOs + `zod` (partial) | DTOs under `service/src/dtos` |
| Backend hardening | `helmet`, `express-rate-limit`, `cors`, `morgan` | Standard Express middleware stack |
| Primary database | PostgreSQL (via `pg`) | Auto-created and auto-migrated on boot (`ensureDatabaseAndMigrate.ts`) |
| Secondary database | MongoDB (via `mongodb` driver) | Optional; stores `request_logs` (HTTP audit trail), TTL-configurable |
| API docs | `swagger-jsdoc` + `swagger-ui-express` | Served at `/docs` |
| Backend (`nest/`) — **parallel migration target, not live** | NestJS + TypeScript + Drizzle | Side-by-side rewrite of `service/`; some modules fully ported (students, payments, discounts, settings, etc.), others still shells (`CONVERSION_STATUS.md`) |
| Bot (`bot/`) | Node.js + `node-telegram-bot-api`-style polling bot | Talks directly to the same Postgres DB for student login, class lists, latest-session stats |
| Monorepo tooling | npm workspaces-style multi-package repo (no Lerna/Turborepo) | Root `package.json` orchestrates `service`/`ui`/`bot` via `concurrently` |
| Deployment | Docker (`Dockerfile` per package, root `docker-compose.yml`), Nginx (`ui/nginx.conf`), Vercel config (`ui/vercel.json`) | `README.docker.md` documents the containerized path |
| Ops/backup | Shell scripts (`scripts/backup.sh`, cron installer) | `pg_dump` + CSV exports + optional Mongo dump, S3 and Telegram delivery |

## 2. Business Logic Summary

- **Multi-tenancy**: Data is scoped by `edu_centers` (centers/branches). Owners operate across centers; superusers/teachers/students are scoped to one center via `branch_id`/`center_id` on the JWT and enforced through `shared/tenant.ts` / `shared/tenantDb.ts`.
- **People & orgs**: `owners` (top-level account), `superusers` (admin staff with granular `PERMISSION_CODES`), `teachers`, `students`, `parents` (linked to students via `parent_students`), `centers`, `rooms`/`physical_rooms`, `classes` (with schedule, capacity, room), `subjects`.
- **Academics**: `classes` → `sessions`/`class_sessions` → `attendance`, `grades`, `assignments`. A **test engine** (`tests`, `test_questions`, `reading_passages`, `test_assignments`, `test_submissions`, `test_answers`, `test_results_summary`) supports multi-type quizzes, timed taking, auto/manual grading.
- **Gamification**: `student_coin_transactions` — scores are converted to coins via a piecewise/interpolated score→coin curve (`coinCalculator.ts`, e.g. 100%→+20 coins, 65%→0, ≤45%→−20), used to reward/penalize performance and shown to students via the portal and Telegram bot.
- **Finance**: `payments`, `payment_plans` + `payment_plan_installments`, `invoices` + `invoice_items`, `discounts`, `refunds`, `debts` (auto-detected unpaid-month analysis), plus an owner-facing `finance`/reports module for cross-center financial rollups.
- **Operational tasks**: `teacher_tasks` (admin-assigned tasks to teachers with status/assignee), `assignments` (class/personal), `notifications`, `saved_filters`, `audit_logs` (change history), `archive`/`retention` (soft-delete / lifecycle).
- **Acquisition/CRM signals**: `student_acquisition_sources`, `student_action_reasons` (why a student joined/left) feed retention and reporting.
- **Telegram integration**: `telegram_registrations`, `telegram_students`, `telegram_student_registrations` — students self-register via bot (pending row, not a real `students` record until approved), then log in with username/password to view classes, latest session performance, and coins.
- **Request auditing**: Every HTTP request is logged to MongoDB `request_logs` (method, path, user identity, status, duration) independent of Postgres audit logs, for observability/security review.
- **RBAC model**: `userType` (`superuser | teacher | student | parent`) is the coarse gate (route/role-level, `requireRole` in `index.ts`); `PERMISSION_CODES` (e.g. `CRUD_STUDENT`, `CRUD_PAYMENT`, `VIEW_FINANCE`, `MANAGE_TESTS`, `MANAGE_USERS`) are the fine-grained gate enforced both server-side (`middleware/rbac.ts`) and client-side (`ProtectedRoute` + `adminPageAccess.ts`). Owners implicitly bypass all permission checks.

## 3. System Design

```
                         ┌───────────────────────────┐
                         │        ui/ (Vite SPA)      │
                         │  Redux slices + Axios API  │
                         └──────────────┬─────────────┘
                                        │ REST (JWT bearer)
                                        ▼
┌────────────────────┐   direct SQL   ┌───────────────────────────────┐
│  bot/ (Telegram)    │───────────────▶│   service/ (Express, live)    │
│  polling bot        │                │ routes → controllers →        │
└─────────┬───────────┘                │ services → repositories       │
          │                            └───────┬─────────────┬────────┘
          │                                    │             │
          ▼                                    ▼             ▼
   PostgreSQL (shared) ◀── Drizzle/Sequelize ──┘      MongoDB (request_logs)

          (parallel, not yet live)
          ┌───────────────────────────────┐
          │  nest/ (NestJS rewrite target) │  — same Postgres via Drizzle,
          │  module/controller/service/    │    modules ported incrementally
          │  repository DDD layering       │
          └───────────────────────────────┘
```

- **Request flow (service/)**: `index.ts` wires global middleware (`cors`, `helmet` implied via deps, JSON body parsing, `requestLogger` → Mongo) then mounts one Express router per domain under `/api/*`, each gated by `requireAuth` (JWT) and `requireRole(...)` at the mount point, with finer `requirePermission` checks inside individual routes/controllers. Each module follows `routes/ → controllers/ → services/ → repositories/`, keeping SQL/Drizzle access inside repositories.
- **Multi-tenancy enforcement**: `shared/tenant.ts` / `shared/tenantDb.ts` scope repository queries to the caller's `center_id`/`branch_id` unless the caller is an owner.
- **Frontend architecture** (documented in `ui/ARCHITECTURE.md`): feature-first folders (`features/<area>/<feature>`) separate `Page.tsx` (routing/composition only, no transport), `components/` (render + interaction), `hooks/` (API orchestration), `*Model.ts`/`model/` (pure business rules & payload building), and `types.ts` (domain/DTO types). ESLint's `no-restricted-imports` enforces that pages can't import the transport client directly. Redux owns server-derived/cross-route state; ephemeral UI state (dialogs, inputs) stays local; persisted drafts use dedicated persisted slices instead of raw `localStorage`.
- **Auth flow**: Login endpoints per `userType` issue a JWT (`generateToken`) containing id, `userType`, `role`, `center_id`/`branch_id`, and `permissions`. The UI stores this via `shared/auth/authStorage.ts`, attaches it as a Bearer token in the Axios client, and `ProtectedRoute` + `RoleBasedRedirect` in `App.tsx` gate routes client-side by `userType`/`role`/`PERMISSION_CODES`, mirroring the server checks.
- **Database bootstrap**: On backend startup, `ensureDatabaseAndMigrate.ts` creates the Postgres DB if missing and runs all Sequelize migrations automatically (toggleable via `AUTO_CREATE_DB`/`AUTO_MIGRATE`), so the schema is self-provisioning in dev.
- **Migration-in-progress**: `nest/` is a structurally-parallel NestJS reimplementation of `service/` (same Drizzle schema, DDD-style module/controller/service/repository folders per domain) developed side by side; the Express app remains the system of record until modules are fully ported (tracked in `nest/CONVERSION_STATUS.md`).

## 4. Folder Architecture

```
RMC/
├── service/                      # Express + TS backend (live)
│   └── src/
│       ├── index.ts              # App bootstrap, middleware wiring, route mounting
│       ├── db/                   # schema.ts (Drizzle tables), pool.ts, mongo.ts, ensureDatabaseAndMigrate.ts
│       ├── middleware/           # auth.ts (JWT), rbac.ts (permissions), validation.ts, requestLogger.ts
│       ├── dtos/                 # class-validator request/response DTOs, one file per domain
│       ├── modules/<domain>/     # students, teachers, classes, payments, grades, attendance, tests, ...
│       │   ├── controllers/      # HTTP request/response handling
│       │   ├── services/         # business logic/orchestration
│       │   └── repositories/     # Drizzle queries, DB access
│       ├── routes/               # per-domain Express routers, mounted in index.ts
│       ├── shared/                # controller.ts, tenant.ts/tenantDb.ts (multi-tenancy), password.ts
│       ├── services/              # cross-cutting BaseService.ts, StudentService.ts
│       ├── swagger/               # OpenAPI/Swagger config, served at /docs
│       └── utils/                 # coinCalculator.ts (score→coin logic), audit.ts
│   └── db/migrations/            # Sequelize migration files (schema history)
├── nest/                          # NestJS rewrite target (parallel, not live)
│   └── src/
│       ├── app.module.ts, main.ts
│       ├── common/                # auth.guard.ts, tenant-scope.ts, current-user.ts, public.decorator.ts
│       ├── database/              # database.module.ts, schema.ts (Drizzle), transaction.runner.ts
│       └── modules/<domain>/      # same domain list as service/, DDD layering per module
├── ui/                            # React + Vite SPA
│   └── src/
│       ├── App.tsx                # Router, route guards, role-based redirects
│       ├── main.tsx
│       ├── components/            # common/, layout/, ui/ (shared design system)
│       ├── features/
│       │   ├── auth/              # LoginPage, OwnerLoginPage/Register
│       │   ├── crm/<domain>/      # admin CRM: students, teachers, classes, payments, grades,
│       │   │                      # attendance, tests, assignments, debts, centers, rooms, subjects,
│       │   │                      # calendar, settings, finance, archive, retention, telegram, rbac
│       │   │   └── <domain>/{components,hooks,api,tests,tabs,utils}
│       │   ├── owner/              # Owner cross-center console (manage, reports)
│       │   ├── teacher/            # TeacherPortal.tsx + tabs (Students, Tests, Classes, Attendance, Grades, Assignments)
│       │   ├── student/            # StudentPortal.tsx (Overview, Tests, Grades, Attendance)
│       │   └── system/             # ServiceStatusGuard, health checks
│       ├── slices/                 # one Redux slice per domain (authSlice, studentsSlice, paymentsSlice, ...)
│       ├── store/                  # Redux store config + selectors
│       ├── shared/
│       │   ├── api/api.ts          # Central Axios client + per-domain API objects
│       │   └── auth/               # authStorage.ts, centerScope.ts, paymentAuthStorage.ts
│       ├── i18n/                   # LanguageContext + translation API
│       └── theme/                  # ThemeContext
│   └── e2e/                        # Playwright workflow-combination tests
├── bot/                            # Telegram bot (Node.js), talks directly to Postgres
├── docs/                           # Documentation (this file lives here)
├── scripts/                        # backup.sh, cron installer, CSV/import normalization scripts
└── docker-compose.yml, README*.md  # Root orchestration & docs
```

## 5. User Roles & Action Flows

Roles are driven by JWT `userType` (`superuser`, `teacher`, `student`) plus `role` (e.g. `owner` within `superuser`) and fine-grained `PERMISSION_CODES`, enforced by `ProtectedRoute` in `ui/src/App.tsx` and mirrored server-side in `service/src/middleware/rbac.ts`.

| Role | Entry point | Primary user action flow | Key screens / files |
|---|---|---|---|
| **Owner** (`superuser` + `role=owner`) | `/login/owner` → `/owner/manage` | Registers/manages centers → creates superuser accounts per center → reviews cross-center finance & stats in Owner Reports → adjusts owner-level branding/settings | `features/auth/OwnerLoginPage.tsx`, `OwnerRegisterPage.tsx`, `features/owner/OwnerManager.tsx`, `features/owner/OwnerReports.tsx`, `features/crm/centers/CentersPage.tsx` |
| **Superuser / Admin** (`superuser`, non-owner) | `/login/superuser` → `/dashboard` | Manages students/teachers/classes → records payments/discounts/debts → marks attendance & enters grades → builds & assigns tests → assigns teacher tasks → reviews reports/audit logs | `features/crm/dashboard/Dashboard.tsx`, `students/StudentsPage.tsx` → `StudentDetailPage.tsx`, `teachers/TeachersPage.tsx` → `TeacherDetailPage.tsx`, `classes/ClassesPage.tsx` → `ClassDetailPage.tsx` → `SessionWorkflowPage.tsx`, `payments/PaymentsPage.tsx`, `debts/DebtsPage.tsx`, `tests/CreateTestPage.tsx` → `TestAssignPage.tsx` → `GradeSubmissionPage.tsx`, `teacherTasks/TeacherTasksPage.tsx` |
| **Teacher** | `/login/teacher` → `/teacher-portal` | Views assigned classes & rosters → takes attendance per session → enters/edits grades → creates class tests and grades submissions → posts assignments → tracks own payment/tasks from admin | `features/teacher/TeacherPortal.tsx`, `components/TeacherStudentsTab.tsx`, `TeacherClassesTab.tsx`, `TeacherAttendanceTab.tsx`, `TeacherGradesTab.tsx`, `TeacherTestsTab.tsx`, `TeacherAssignmentsTab.tsx`, `TeacherPaymentsTab.tsx` |
| **Student** | `/login/student` → `/student-portal` | Views dashboard/overview → takes assigned tests (`TakeTestPage`) → checks grades, attendance, coin balance → views payment history and weekly schedule | `features/student/StudentPortal.tsx`, `StudentPortalContent.tsx`, `StudentSnapshotCards.tsx`, `StudentWeeklySchedule.tsx`, `StudentPaymentHistory.tsx`, `StudentProfileDialog.tsx`, shared `TakeTestPage.tsx`/`ViewSubmissionPage.tsx` |
| **Parent** (backend-modeled, limited UI) | via `parents` API / bot | Linked to one or more students (`parent_students`); views child's academic/payment info (primarily surfaced through the Telegram bot today) | `service/src/modules/parents/*`, `service/src/routes/parentRoutes.ts` |
| **Telegram user (student/prospect)** | Telegram bot conversation | `Ro'yhatdan o'tish` (register) → creates pending row in `telegram_student_registrations` (not a real student until admin approves) → `Kirish` (login) with username/password against active students → `Darslar` lists enrolled classes → selecting a class → `Oxirgi dars` shows latest session score, attendance, and coin change | `bot/index.js`, `service/src/modules/telegram_students/*`, `service/src/modules/telegram_registrations/*` |

### Cross-cutting flow: Class session lifecycle (superuser/teacher)

1. Admin creates a `class` (schedule, room, teacher, capacity) via `ClassesPage.tsx`.
2. A `session`/`class_session` occurs; teacher or admin opens `SessionWorkflowPage.tsx` to run attendance + grading in one guided flow.
3. Attendance is marked (`attendance` table) and grades are entered (`grades` table); grade percentage feeds `coinCalculator.ts` to post a `student_coin_transactions` entry.
4. Results become visible to the student portal and Telegram bot ("Oxirgi dars").
5. Missed payments surface in `DebtsPage.tsx` (unpaid-month analysis) for admin follow-up, tying back into `payments`/`payment_plans`.

### Cross-cutting flow: Test lifecycle (superuser/teacher → student)

1. Superuser/teacher builds a test via the `CreateTestPage.tsx` wizard (basic info → questions incl. reading passages → settings → review).
2. Test is assigned to a class or individual students via `TestAssignPage.tsx` (`test_assignments`).
3. Student takes the test in `TakeTestPage.tsx` (timer, navigator, flagging) → creates a `test_submission` with `test_answers`.
4. Teacher/admin grades it in `GradeSubmissionPage.tsx` (auto-gradable question types plus manual scoring) → `test_results_summary` updated, coins awarded.
5. Student/teacher review results in `ViewSubmissionPage.tsx`.
