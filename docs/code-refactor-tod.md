# Code Refactor TOD

## Goal

The goal is not to rewrite the RMC CRM project. The goal is to refactor it gradually so the current codebase becomes easier to maintain, test, and extend.

Main focus areas:

- standardize backend Layered Architecture;
- introduce practical DDD boundaries around real business rules;
- make Drizzle schema updates safer and more systematic;
- clean up frontend Feature-Based Architecture;
- move business logic out of UI components;
- protect refactors with build checks and focused tests.

## Required Scope

This TOD directly covers the requested Code Refactor topics:

- Layered Architecture;
- DDD (Domain-Driven Design);
- Drizzle Schema Update Steps;
- Frontend Feature-Based Architecture:
  - Hooks;
  - Shared;
  - Utils;
  - no business logic in the UI layer.

## Reality Check

This is a complete TOD and roadmap for the requested refactor topics. It is not a promise that the whole architecture can be fully implemented in one week.

For one week, the realistic goal is:

- audit the full project;
- define the target architecture;
- document the rules;
- choose pilot modules/features;
- extract a few high-value domain rules;
- fix the Drizzle migration direction;
- prepare the next PR backlog.

Full implementation should be done through multiple small PRs after this TOD.

## Current Project Overview

The repository has three main parts:

- `service/` - Express backend with TypeScript, PostgreSQL, Sequelize migrations, Drizzle dependency, and raw `pg` queries.
- `ui/` - React/Vite frontend with Redux Toolkit, feature folders, shared API client, and reusable UI components.
- `bot/` - Telegram bot using Node.js and PostgreSQL.

Verified baseline:

- Backend build passes: `npm --prefix service run build`.
- Frontend build passes: `npm --prefix ui run build`.
- Backend modules contain roughly 150 TypeScript/JavaScript files.
- Frontend features contain roughly 250 TypeScript/TSX files.

## Key Findings

### Backend Layering Exists, But Is Not Fully Standardized

The backend already has a good starting structure:

- `controllers/`
- `services/`
- `repositories/`
- `routes/`
- `dtos/`
- `shared/`

Examples:

- `service/src/modules/students/controllers/student.controller.ts`
- `service/src/modules/students/services/student.service.ts`
- `service/src/modules/students/repositories/student.repository.ts`
- `service/src/modules/classes/controllers/class.controller.ts`

Issues:

- Controllers repeat tenant scope, teacher scope, `403`, `404`, and `500` response logic.
- `service/src/shared/controller.ts` already exists, but it is not used consistently across all controllers.
- Some services are thin pass-through layers, while other services contain real business logic.
- Some repositories are too large. For example, `student.repository.ts` is over 700 lines.
- Most backend files use CommonJS style inside `.ts` files, so TypeScript is not being used to its full potential.

### Domain Logic Is Spread Across Layers

Business rules currently live in different places:

- Student discount sync logic is in `student.service.ts`.
- Student transfer payment allocation is in `student.repository.ts`.
- Payment, discount, debt, attendance, grade, test, and scope rules are spread between controllers, services, repositories, and frontend pages.

Target direction:

- Domain rules should not live in controllers or UI.
- Repositories should not own business rules.
- Services/use cases should orchestrate workflows.
- Pure domain rules should be extracted into testable functions.

### Drizzle Is Present, But Not Yet the Source of Truth

Current state:

- `drizzle-orm` and `drizzle-kit` are installed.
- `service/src/db/schema.ts` defines only a small set of tables:
  - `app_settings`
  - `translations`
  - `saved_filters`
  - `notifications`
  - `teacher_payment_credentials`
  - `rooms`
  - `classes`
- The actual app uses many more tables through Sequelize migrations and raw SQL.
- `service/drizzle.config.json` does not define a schema path or migration output folder.
- Most data access still uses `pool.query(...)`.

Verified facts:

- There are about 241 `pool.query` usages in `service/src`.
- Around 28 repository files use raw SQL.
- Drizzle should be treated as a gradual migration target, not as the current source of truth.

### Frontend Feature Structure Exists, But Needs Cleanup

The frontend already has feature folders:

- `ui/src/features/crm/students`
- `ui/src/features/crm/classes`
- `ui/src/features/crm/payments`
- `ui/src/features/crm/grades`
- `ui/src/features/crm/attendance`
- `ui/src/features/teacher`
- `ui/src/features/student`
- `ui/src/features/owner`

Good signs:

- Several features already have `components`, `hooks`, `types`, `utils`, `requests.ts`, and `queries.ts`.
- `students`, `payments`, `grades`, `attendance`, `classes`, and `teachers` already use some page-level hooks.

Issues:

- Several page/component files are still very large.
- Some UI components and pages still call APIs directly.
- `ui/src/shared/api/api.ts` is too large and acts as a global endpoint registry.
- Some `requests.ts` files only re-export from the shared API file.
- Global `slices/` are separated from feature ownership.
- Legacy files still exist:
  - `PaymentsPageOld.tsx`
  - `GradesPageOld.tsx`
  - `AttendancePageOld.tsx`

Verified legacy size:

- `PaymentsPageOld.tsx` - 899 lines
- `GradesPageOld.tsx` - 887 lines
- `AttendancePageOld.tsx` - 801 lines
- Total: 2587 lines

### Bot Is Also a Refactor Candidate

The `bot/` folder is small as a package, but `bot/index.js` is a large single file.

Current issues:

- `bot/index.js` is over 1000 lines.
- Telegram API calls, command handling, registration flow, SQL queries, and formatting logic live together.
- The bot uses direct `pool.query(...)`.
- Bot database access can drift from backend service rules if both evolve separately.

Target direction:

- Split bot code into `handlers`, `services`, `repositories`, `formatters`, and `config`.
- Reuse backend domain rules where possible, especially for student results, payments, lessons, and registrations.
- Keep Telegram message formatting separate from business/data access logic.

### Cross-Cutting Areas Must Not Be Skipped

These are not separate product features, but they affect every refactor:

- Auth and RBAC rules.
- Tenant/center isolation.
- DTO validation and request parsing.
- Error handling and response shape.
- Request logging and audit logging.
- Import/export and Google Sheets integration.
- i18n/translations.
- Environment/config management.
- Test strategy and CI/local verification commands.
- TypeScript strictness, especially reducing `any` over time.

## Target Backend Architecture

Recommended backend structure:

```text
service/src/
  app/
    createApp.ts
    registerRoutes.ts
    errorHandler.ts
  modules/
    students/
      domain/
        student.entity.ts
        student.rules.ts
        student.errors.ts
      application/
        createStudent.usecase.ts
        updateStudent.usecase.ts
        transferStudent.usecase.ts
      infrastructure/
        student.repository.ts
        student.mapper.ts
      presentation/
        student.controller.ts
        student.routes.ts
        student.dto.ts
      index.ts
  shared/
    auth/
    db/
    errors/
    http/
    tenant/
```

Layer rules:

- Routes define endpoints and middleware.
- Controllers parse HTTP input and return HTTP responses.
- Application/use case layer controls business workflows.
- Domain layer contains pure business rules and invariants.
- Repositories only talk to the database.
- Shared utilities are only for cross-cutting concerns like auth, tenant scope, validation, errors, and transactions.
- Infrastructure/system exceptions must be documented, for example health checks, reset tools, logging, and low-level tenant DB helpers.

## DDD Plan

Recommended bounded contexts:

- `Identity & Access` - login, users, roles, permissions, payment access.
- `Centers` - tenant scope, center ownership, center settings.
- `People` - students, teachers, parents.
- `Classes & Scheduling` - classes, rooms, room slots, sessions, calendar.
- `Learning` - subjects, assignments, tests, grades, attendance.
- `Finance` - payments, debts, discounts, refunds, invoices, payment plans, teacher payments.
- `Communication` - notifications, translations, Telegram registrations, Telegram students.
- `Operations` - imports/exports, audit logs, request logs, system tools, archive.

Domain rule candidates:

- student transfer allocation;
- class capacity and teacher ownership;
- tenant/center isolation;
- serial discount vs monthly discount;
- payment amount snapshot: original amount, discount amount, final amount;
- debt generation and payment completion;
- attendance/session uniqueness;
- grade score and points calculation;
- test visibility, assignment, submission, and grading lifecycle;
- soft delete vs purge permissions.

First DDD extraction candidates:

- `PaymentRules`
- `StudentTransferRules`
- `GradeScoringRules`

## Drizzle Schema Update Steps

### 1. Fix Drizzle Config

Add or migrate to a proper `drizzle.config.ts` with:

- schema path;
- migration output folder;
- database URL from environment variables;
- PostgreSQL dialect;
- naming/casing conventions.

### 2. Inventory the Existing Database

Use these sources:

- `service/db/migrations/*.js`
- `service/db/schema/*.sql`
- actual PostgreSQL schema;
- raw SQL queries inside `service/src/modules/*/repositories/*.ts`.

Inventory checklist:

- table names;
- columns and types;
- primary keys;
- foreign keys;
- unique indexes;
- nullable fields;
- soft delete columns;
- timestamps;
- tenant fields such as `center_id`;
- money/decimal fields;
- JSON/JSONB fields;
- status/enums.

### 3. Split Schema by Context

Suggested structure:

```text
service/src/db/schema/
  index.ts
  centers.ts
  identity.ts
  people.ts
  classes.ts
  learning.ts
  finance.ts
  communication.ts
  operations.ts
  relations.ts
```

### 4. Add Types and Mappers

Use Drizzle types for database rows:

- `InferSelectModel`
- `InferInsertModel`

Then keep these types separate:

- HTTP DTO type;
- domain model type;
- database row type;
- frontend response type.

### 5. Migrate Gradually From Raw SQL to Drizzle

Recommended order:

1. Small/read-only modules: `translations`, `settings`, `saved_filters`.
2. Medium modules: `rooms`, `subjects`, `centers`.
3. Large modules: `students`, `classes`, `payments`.
4. Complex workflows: `attendance`, `grades`, `tests`, `import_export`, `reports`.

### 6. Migration Workflow

Rule:

- Every schema change must have a migration.
- Every migration must be reviewed before running in production.
- Sequelize migrations should not be deleted immediately.
- During transition, document which tool owns new migrations.
- Take a backup/snapshot before production schema changes.

Important correction:

- Do not immediately move or delete Sequelize migrations.
- First document the transition strategy, then migrate module by module.

## Target Frontend Architecture

Recommended feature structure:

```text
ui/src/features/crm/students/
  api/
    students.api.ts
  model/
    students.slice.ts
    students.selectors.ts
  hooks/
    useStudentsData.ts
    useStudentsFilters.ts
    useStudentMutations.ts
    useStudentsPage.ts
  components/
    StudentsTableView.tsx
    StudentsFilterPanel.tsx
    StudentFormDialog.tsx
  utils/
    studentFormOptions.ts
    studentMappers.ts
  types.ts
  index.ts
```

Rules:

- Feature API belongs inside the feature folder.
- Feature state/selectors should have clear ownership.
- `shared/api` should contain the Axios client and cross-cutting interceptors, not every endpoint in the app.
- Page components orchestrate.
- Hooks load data, mutate data, and derive state.
- Components render UI from props.
- Utils are pure functions.

## Hooks

Current good examples:

- `useStudentsPage`
- `useStudentsData`
- `useStudentsFilters`
- `useStudentsModal`
- `usePaymentsPage`
- `useGradesPage`
- `useAttendancePage`
- `useClassesPage`

Refactor rules:

- Split large `useXPage` hooks into smaller hooks:
  - `useXData`
  - `useXFilters`
  - `useXMutations`
  - `useXSelection`
  - `useXDialogs`
- Mutation logic should live in hooks, not page JSX.
- Hooks should not contain layout text or component-specific styling.
- Prefer a consistent return shape:

```ts
return {
  state,
  derived,
  actions,
  permissions,
};
```

## Shared

Allowed in `shared/`:

- API client;
- auth/session helpers;
- tenant/center scope helpers;
- reusable UI-independent utilities;
- shared components used by multiple features;
- CSV import/export helpers;
- stable identity helpers.

Should not be in `shared/`:

- feature-specific API modules;
- feature-specific status options;
- payment/discount business calculations;
- student-only form behavior;
- modal workflow logic;
- domain-specific selectors.

## Utils

Rules:

- `ui/src/utils` should contain only truly global helpers.
- Feature-specific helpers should live inside the feature folder.
- Money, discount, date/time, grade, and attendance calculations should be pure and tested.
- Avoid generic helper files that become grab bags.

Suggested split:

```text
ui/src/shared/utils/
  formatMoney.ts
  formatDate.ts
  storage.ts

ui/src/features/crm/payments/utils/
  paymentMath.ts
  paymentMappers.ts
```

## No Business Logic in UI

UI components may contain:

- rendering;
- local input state;
- callbacks from props;
- loading/empty/error states;
- layout and accessibility props.

UI components should not contain:

- API calls;
- endpoint paths;
- discount/payment/debt formulas;
- grade calculation;
- tenant or role decision logic;
- localStorage parsing;
- bulk delete workflows;
- transfer allocation logic;
- raw entity normalization.

Examples to clean:

- Move student import/export, bulk delete, transfer, and group owner update logic out of `StudentsPage.tsx`.
- Move direct room slot `fetch(...)` calls into API modules/hooks.
- Move payment discount math from `PaymentFormPage.tsx` and `usePaymentsPage.ts` into a tested payment utility.
- Move repeated totals and grouping calculations from components into hooks/selectors.
- Wrap localStorage access in shared auth/storage helpers.

## First Files to Review

These files should be reviewed first because they represent the main refactor risks and patterns.

Backend:

- `service/src/index.ts` - app startup, route registration, middleware, shutdown logic.
- `service/src/shared/controller.ts` - existing controller helper that should become a standard.
- `service/src/shared/tenant.ts` and `service/src/shared/tenantDb.ts` - tenant/center isolation helpers.
- `service/src/middleware/auth.ts` - auth, RBAC, owner checks, frozen student checks.
- `service/src/modules/students/controllers/student.controller.ts` - repeated scope and response handling.
- `service/src/modules/students/services/student.service.ts` - student workflows and discount sync.
- `service/src/modules/students/repositories/student.repository.ts` - large repository with SQL and transfer allocation logic.
- `service/src/modules/payments/services/payment.service.ts` - finance workflow candidate.
- `service/src/modules/grades/services/grade.service.ts` - grade/scoring rule candidate.
- `service/src/modules/tests/services/test.service.ts` - test lifecycle and assignment candidate.

Drizzle/database:

- `service/src/db/schema.ts` - partial Drizzle schema.
- `service/drizzle.config.json` - incomplete Drizzle config.
- `service/db/migrations/` - current migration history.
- `service/db/schema/` - SQL schema snapshots.

Frontend:

- `ui/src/App.tsx` - large router/top-level shell.
- `ui/src/shared/api/api.ts` - oversized shared API registry.
- `ui/src/features/crm/students/StudentsPage.tsx` - page still owns several mutations.
- `ui/src/features/crm/students/hooks/useStudentsPage.ts` - good hook pattern to standardize.
- `ui/src/features/crm/payments/PaymentFormPage.tsx` - payment/discount logic candidate.
- `ui/src/features/crm/payments/hooks/usePaymentsPage.ts` - payment mutation and derived data logic.
- `ui/src/features/crm/rooms/components/RoomSlotsCalendar.tsx` - direct `fetch(...)` call.
- `ui/src/features/crm/rooms/components/RoomSlotsGenerator.tsx` - direct `fetch(...)` call.
- `ui/src/slices/` - global state ownership that should be mapped to features.
- `ui/src/store/selectors/` - selector ownership and derived data rules.

Bot:

- `bot/index.js` - large single-file bot with handlers, SQL, Telegram API calls, and formatting mixed together.

## Issue-to-Update Matrix

Use this matrix to connect each issue with the files or folders that should be updated first.

| Issue | First Files/Folders to Update | Expected Update |
| --- | --- | --- |
| Backend startup and route registration are concentrated in one file | `service/src/index.ts` | Split into `app/createApp.ts`, `app/registerRoutes.ts`, and server startup logic. |
| Repeated controller scope/error logic | `service/src/shared/controller.ts`, `service/src/modules/*/controllers/*.ts` | Standardize helpers for center scope, teacher scope, 403/404/500 responses. |
| Student controller is too responsible | `service/src/modules/students/controllers/student.controller.ts` | Keep HTTP parsing/response only; move workflow decisions into service/use cases. |
| Student repository contains business/domain logic | `service/src/modules/students/repositories/student.repository.ts` | Move transfer allocation and money/date rules into domain rule files. |
| Student service contains discount sync workflow | `service/src/modules/students/services/student.service.ts`, `service/src/modules/discounts/services/discount.service.ts` | Move reusable discount/payment rules into `domain` or `application` layer. |
| Finance rules are spread across backend/frontend | `service/src/modules/payments/services/payment.service.ts`, `ui/src/features/crm/payments/PaymentFormPage.tsx`, `ui/src/features/crm/payments/hooks/usePaymentsPage.ts` | Centralize discount/final amount rules and add tests. |
| Grade/scoring rules need a domain boundary | `service/src/modules/grades/services/grade.service.ts`, `ui/src/features/crm/grades/hooks/useGradesPage.ts` | Extract score/points calculation into pure rules/utilities. |
| Test lifecycle has complex workflow | `service/src/modules/tests/services/test.service.ts`, `ui/src/features/crm/tests/*` | Document and isolate assign/start/submit/grade rules. |
| Drizzle schema is incomplete | `service/src/db/schema.ts`, `service/drizzle.config.json`, `service/db/migrations/`, `service/db/schema/` | Fix config, inventory tables, split schema by context, pilot small tables. |
| Shared frontend API file is too large | `ui/src/shared/api/api.ts`, `ui/src/features/**/requests.ts` | Keep shared Axios client only; move endpoint wrappers into feature `api/` folders. |
| Students page owns too much workflow | `ui/src/features/crm/students/StudentsPage.tsx`, `ui/src/features/crm/students/hooks/` | Move import/export, bulk delete, transfer, group owner updates into hooks. |
| Room slot components call API directly | `ui/src/features/crm/rooms/components/RoomSlotsCalendar.tsx`, `ui/src/features/crm/rooms/components/RoomSlotsGenerator.tsx`, `ui/src/features/crm/rooms/hooks/useRoomSlots.ts` | Move endpoint calls to feature API/hook/thunk; components receive props/callbacks. |
| Legacy frontend files remain | `ui/src/features/crm/payments/PaymentsPageOld.tsx`, `ui/src/features/crm/grades/GradesPageOld.tsx`, `ui/src/features/crm/attendance/AttendancePageOld.tsx` | Confirm unused, then remove or move to `legacy/`. |
| Global slices/selectors have unclear feature ownership | `ui/src/slices/`, `ui/src/store/selectors/` | Map each slice/selector to a feature and gradually move or re-export through feature model files. |
| Direct storage/auth parsing appears in feature code | `ui/src/features/**`, `ui/src/shared/auth/`, `ui/src/utils/helpers.ts` | Wrap localStorage and auth/tenant access in shared helpers. |
| Bot is a single large file | `bot/index.js` | Split into `handlers`, `services`, `repositories`, `formatters`, and `config`. |
| TypeScript safety can be improved | `service/tsconfig.json`, backend DTO/service boundaries, frontend feature types | Reduce `any` gradually; start at DTOs, service return types, and API response mappers. |

## Coverage Statement

This document covers the major refactor and architecture issues found in the project:

- backend layering problems;
- domain/business logic placement;
- DDD boundaries;
- Drizzle schema and migration workflow;
- frontend feature ownership;
- hooks/shared/utils responsibilities;
- UI business logic cleanup;
- bot structure;
- cross-cutting concerns;
- verification and rollback rules.

For each major issue, the plan explains:

- what the issue is;
- where it appears first;
- which files or folders to inspect/update;
- what the expected fix direction is;
- how to verify the refactor.

This document is not a full bug audit, security audit, or performance audit. Those should be separate TODs if needed. This TOD is specifically for code refactor and architecture cleanup.

## Full Module Coverage

Use these tables to make sure every area of the project is included in the refactor review.

### Backend Module Checklist

| Module | Refactor Focus |
| --- | --- |
| `archive` | Keep controller/service/repository split; verify purge/restore rules and hard-delete permissions. |
| `assignments` | Isolate assignment status rules, teacher/student scope, and due-date behavior. |
| `attendance` | Extract attendance/session uniqueness rules and keep DB writes in repositories. |
| `audit_logs` | Treat as infrastructure/cross-cutting; keep write API simple and consistent. |
| `centers` | Standardize tenant/center ownership rules and use shared scope helpers. |
| `classes` | Extract class capacity, schedule, teacher ownership, session generation rules. |
| `debts` | Move debt generation/payment summary rules into finance domain/use cases. |
| `discounts` | Centralize serial/monthly discount rules and payment snapshot behavior. |
| `drizzle_repositories` | Use as migration/testing reference while moving selected repositories to Drizzle. |
| `grades` | Extract grade percentage, points, score, and session scoring rules. |
| `import_export` | Keep CSV/Google Sheets parsing separate from DB writes and business validation. |
| `invoices` | Keep invoice lifecycle and finance rules out of controllers. |
| `notifications` | Keep notification targeting/read-state rules in service layer. |
| `owners` | Verify owner auth, center ownership, and permissions boundaries. |
| `parents` | Keep parent/student access rules explicit and tested. |
| `payment_plans` | Extract installment status and due-date rules into finance domain. |
| `payments` | Centralize payment amount, discount, completion, receipt, and teacher payment rules. |
| `portal` | Keep student-facing aggregation thin; avoid duplicating core domain rules. |
| `refunds` | Keep refund/payment relationship rules in finance service/domain. |
| `reports` | Treat as read/query layer; keep report filters and aggregations isolated. |
| `rooms` | Separate room assignment rules from room slot/schedule rules. |
| `saved_filters` | Good pilot for standard controller/service/repository cleanup. |
| `search` | Keep as read/query module; ensure tenant scope is always applied. |
| `sessions` | Extract session date/time lifecycle rules and reuse from classes/calendar flows. |
| `settings` | Good pilot for Drizzle/schema cleanup; keep setting keys typed. |
| `students` | High-priority: split controller workflow, transfer rules, discount sync, and large repository. |
| `subjects` | Keep subject/class/teacher ownership rules in service layer. |
| `superusers` | Verify auth, lock/status, role, permission, and center-scope behavior. |
| `system` | Document as infrastructure exception for health/reset/redeploy operations. |
| `teachers` | Extract teacher profile/payment access/class ownership rules. |
| `telegram_registrations` | Separate conversion/rejection workflow from repository logic. |
| `telegram_students` | Keep Telegram-facing read models separate from core student/domain rules. |
| `tests` | Extract test visibility, assignment, start, submit, grade, and result lifecycle rules. |
| `translations` | Good pilot for Drizzle/schema and simple CRUD cleanup. |

### Frontend Feature Checklist

| Feature | Refactor Focus |
| --- | --- |
| `auth` | Keep login/register forms UI-only; move auth API/session handling to hooks/shared auth. |
| `crm/archive` | Move restore/purge workflows into hooks; keep table/cards presentational. |
| `crm/assignments` | Keep filters/mutations in hooks and assignment status helpers in feature utils. |
| `crm/attendance` | Keep attendance statistics and status mapping out of UI components. |
| `crm/calendar` | Move schedule/session calculations to hooks/utils; wrap localStorage settings. |
| `crm/centers` | Keep center CRUD mutation flow in hooks and center scope logic shared. |
| `crm/classes` | Extract session generation, capacity, room/schedule helpers, and class mutations. |
| `crm/dashboard` | Keep aggregations in queries/selectors, not visual components. |
| `crm/debts` | Move debt analysis calculations and mutations into hooks/utils. |
| `crm/finance` | Keep teacher finance aggregation in hooks/selectors. |
| `crm/grades` | Move grade formulas and status mappings to utils/selectors. |
| `crm/hooks` | Keep only CRM-wide hooks; avoid feature-specific logic here. |
| `crm/layouts` | Layout constants only; no business rules. |
| `crm/logs` | Keep request-log filtering/query building in hooks/api layer. |
| `crm/payments` | High-priority: extract discount/payment math and mutation workflows. |
| `crm/rbac` | Keep permission definitions centralized and reusable. |
| `crm/rooms` | Remove direct `fetch(...)`; move room slot logic to feature API/hooks. |
| `crm/server` | Treat as operations feature; keep system API calls in feature API/hooks. |
| `crm/settings` | Wrap localStorage and settings API behavior; avoid settings logic in JSX. |
| `crm/students` | High-priority: move import/export, bulk delete, transfer, and group owner updates into hooks. |
| `crm/subjects` | Keep CRUD/filtering in hooks and subject options in feature utils. |
| `crm/teachers` | Move teacher CRUD, password, payment access, and detail mutations into hooks. |
| `crm/telegram` | Move registration convert/reject workflows into feature hooks/api. |
| `crm/tests` | Extract test creation, assignment, taking, submission, grading workflows into hooks/utils. |
| `owner` | Split owner manager state, statistics, finance, settings, and table workflows clearly. |
| `student` | Keep portal UI presentational; move dashboard/profile/schedule derivations to hooks/selectors. |
| `system` | Keep service health checks in hooks and UI states in components. |
| `teacher` | Split large teacher portal tabs into hooks/services; remove API-heavy logic from components. |

## Verification Commands

Run these checks before and after each meaningful refactor:

```bash
npm --prefix service run build
npm --prefix service run test
npm --prefix ui run build
npm --prefix ui run test
npm --prefix bot run check
```

Optional grep checks:

```bash
rg "pool\.query" service/src/modules/*/controllers service/src/modules/*/services
rg "fetch\(" ui/src/features -g "*.tsx" -g "*.ts"
rg "window\.confirm|localStorage" ui/src/features -g "*.tsx" -g "*.ts"
```

## Non-Goals

These should not be attempted as part of the first one-week TOD:

- full backend rewrite;
- full Drizzle migration for every repository;
- deleting Sequelize migrations immediately;
- replacing Redux Toolkit;
- rewriting the router;
- redesigning the UI;
- refactoring all features at once;
- changing business behavior without a separate product decision;
- removing legacy files before confirming they are unused.

## Risks and Rollback

Main risks:

- schema drift between Sequelize migrations, SQL snapshots, Drizzle schema, and the real database;
- broken tenant/center isolation during controller/service refactors;
- behavior changes in finance, discounts, transfers, grades, attendance, and tests;
- frontend behavior regressions when moving API/mutation logic out of components;
- bot behavior drift if bot SQL remains separate from backend/domain rules;
- oversized PRs that are hard to review.

Rollback strategy:

- use small PRs by module or feature;
- keep existing behavior covered by tests before extraction;
- keep Sequelize migrations stable during Drizzle transition;
- avoid production schema changes without backup;
- keep old implementation available until the pilot replacement is verified;
- use build/test/grep checks as acceptance gates.

## Execution Playbook

Use this section as the practical execution guide. The idea is to follow the rules and order below without needing to redesign the plan every time.

### Execution Order

Follow this order for every refactor batch:

1. Pick one module or one frontend feature.
2. Read the current flow from route/page entry point to database/API call.
3. Write down the current responsibilities.
4. Identify logic that is in the wrong layer.
5. Move only one kind of logic at a time.
6. Add or update focused tests if the moved logic affects behavior.
7. Run verification commands.
8. Commit or prepare PR only when behavior is preserved.

Do not mix backend, frontend, Drizzle, and bot refactors in the same PR unless the change is very small and directly connected.

### Backend Execution Rules

For each backend module, apply these rules:

- Route files only define URLs, validation middleware, auth middleware, and controller handlers.
- Controller files only read `req`, call service/use case functions, and return `res`.
- Controller files should not contain SQL, calculations, or business decisions.
- Service/use case files own workflow decisions.
- Domain rule files own pure calculations and invariants.
- Repository files own database queries only.
- Shared helpers should be used for repeated tenant scope, auth, validation, and error response logic.
- If a repository file becomes too large, split it by concern, not randomly.

Backend refactor checklist:

- [ ] No raw SQL in controller.
- [ ] No business calculation in controller.
- [ ] Repeated scope checks use shared helpers.
- [ ] Business rules are in service/use case or domain rules.
- [ ] Repository only performs database access.
- [ ] Errors have consistent shape.
- [ ] Tests/build pass.

### DDD Execution Rules

Use DDD only where there is real business complexity. Do not create empty domain folders for simple CRUD.

Extract domain rules when:

- the same calculation appears in more than one place;
- a rule affects money, discount, grades, attendance, tests, or transfer logic;
- a rule needs unit tests;
- frontend and backend may otherwise duplicate different versions of the same rule.

Domain rule checklist:

- [ ] Function is pure.
- [ ] Function does not call database.
- [ ] Function does not read HTTP request/response.
- [ ] Function has clear input and output.
- [ ] Edge cases are tested.
- [ ] Service/use case calls the rule.

Recommended first rules:

- student transfer allocation;
- payment discount calculation;
- grade score/points calculation.

### Drizzle Execution Rules

Treat Drizzle as a gradual migration path.

Do:

- complete schema inventory before rewriting large repositories;
- start with small tables;
- keep Sequelize migrations stable during transition;
- document which migration tool owns new schema changes;
- use Drizzle types to improve safety at repository boundaries.

Do not:

- delete existing migrations immediately;
- convert all repositories at once;
- trust partial Drizzle schema as the full database source of truth;
- change production schema without backup and review.

Drizzle checklist:

- [ ] Config has schema path.
- [ ] Config has migration output path.
- [ ] Schema file covers selected table fully.
- [ ] Relations/indexes are documented.
- [ ] Migration strategy is written.
- [ ] Pilot repository still passes tests.

### Frontend Execution Rules

For each frontend feature, use this responsibility split:

- Page: connects feature pieces and layout.
- Hook: data loading, mutations, filters, selections, dialogs, derived state.
- Component: renders UI from props.
- API module: endpoint wrappers.
- Utils: pure calculations, mappers, formatters.
- Model/slice/selectors: state ownership and derived data.

Frontend refactor checklist:

- [ ] Page component is mostly orchestration.
- [ ] UI components do not call API directly.
- [ ] UI components do not know endpoint paths.
- [ ] UI components do not contain business formulas.
- [ ] Mutations are in hooks or thunks.
- [ ] Repeated derived data is in hooks/selectors/utils.
- [ ] Feature-specific API is not hidden inside global shared API.
- [ ] Feature-specific helpers are inside the feature folder.
- [ ] Shared folder contains only cross-feature logic.
- [ ] Build/tests pass.

### UI Business Logic Rule

When reviewing a UI file, ask this:

- Is this code deciding business behavior?
- Is this code calculating money, debt, discount, grade, attendance, or test result?
- Is this code calling an API?
- Is this code parsing auth/user/tenant state?
- Is this code doing bulk workflow logic?

If yes, move it out of the UI component.

Correct destination:

- API call -> feature `api/` or thunk.
- Mutation workflow -> feature hook.
- Calculation -> feature `utils/` or backend domain rule.
- Permission decision -> RBAC helper/hook.
- Tenant/center logic -> shared auth/scope helper.
- Formatting only -> shared or feature formatter.

### Bot Execution Rules

Bot refactor should follow the same idea:

- handlers receive Telegram updates;
- services decide workflow;
- repositories query database;
- formatters build message text;
- config reads environment variables.

Bot checklist:

- [ ] Handler does not contain SQL.
- [ ] Handler does not contain long message-building blocks.
- [ ] Repository does not contain Telegram-specific formatting.
- [ ] Shared business behavior matches backend behavior.
- [ ] Bot smoke check passes.

### Stop Conditions

Stop and split the work if:

- one PR touches too many modules;
- a refactor changes business behavior unexpectedly;
- Drizzle migration requires production schema decisions;
- tenant/center access rules become unclear;
- tests fail and the failure is not directly understood;
- frontend refactor requires UI redesign.

### Done Checklist for Each PR

Before finishing any PR:

- [ ] Scope is one module, one feature, or one clear cross-cutting concern.
- [ ] Behavior is unchanged unless explicitly planned.
- [ ] Layer responsibilities are cleaner than before.
- [ ] Tests were added or updated for changed behavior.
- [ ] Backend build passes if backend changed.
- [ ] Frontend build passes if frontend changed.
- [ ] Bot check passes if bot changed.
- [ ] Notes are added to architecture docs if a rule/pattern changed.

## One-Week TOD Plan

### Day 1: Architecture Audit

- Inventory backend modules, routes, controllers, services, and repositories.
- Inventory frontend pages, hooks, components, slices, and API usages.
- Inventory bot handlers, SQL queries, Telegram API calls, and formatting logic.
- Inventory cross-cutting behavior: auth, RBAC, tenant scope, validation, logging, i18n, imports/exports.
- Create a "current vs target" architecture diagram.
- Define backend and frontend module templates.
- List top risky files by size and business complexity.

Deliverables:

- `architecture-audit.md`
- backend/frontend target folder structure
- top risky files list

### Day 2: Backend Layer Standard

- Standardize `shared/controller.ts` usage.
- Normalize scope and error response patterns.
- Write route/controller/service/repository responsibility rules.
- Pilot refactor on a small module, such as `reports`, `settings`, `translations`, or `saved_filters`.
- Add or update focused tests.

Deliverables:

- one pilot backend refactor
- controller/service/repository checklist

### Day 3: DDD Rules

- Finalize bounded context names.
- Document core business rules for each context.
- Extract 2-3 pure domain rules:
  - student transfer;
  - payment/discount calculation;
  - grade/session scoring.
- Add unit tests for extracted rules.

Deliverables:

- `domain-map.md`
- domain rule tests

### Day 4: Drizzle Schema Plan

- Inventory database tables.
- Fix Drizzle config.
- Split schema plan by context.
- Add Drizzle schema for 1-2 small tables.
- Document raw SQL + Drizzle coexistence rules.

Deliverables:

- `drizzle-migration-plan.md`
- pilot Drizzle schema
- migration checklist

### Day 5: Frontend Feature Architecture

- Thin down `shared/api/api.ts`.
- Pick one feature as the frontend pilot.
- Move API/mutation/business logic out of page/components.
- Keep presentational components props-only.

Pilot candidates:

- `students` - already has hooks, but page still owns mutations.
- `rooms` - direct `fetch(...)` calls exist.
- `payments` - payment/discount math needs extraction.

Deliverables:

- one frontend feature refactor
- feature template
- UI/business logic checklist

### Day 6: Cleanup and Tests

- Audit `*Old.tsx` files and remove or move to `legacy/` only after confirming no route imports.
- Reduce type duplication.
- Add API response mappers.
- Add a lightweight bot refactor plan if bot behavior is in scope for the next sprint.
- Add focused tests for:
  - pagination;
  - mappers;
  - money/discount;
  - filters/selectors.

Deliverables:

- cleanup PR
- test coverage checklist

### Day 7: Presentation and Roadmap

- Prepare final TOD presentation.
- Add risk matrix.
- Add 30/60/90 day roadmap.
- Define what will not be refactored now.

Deliverables:

- final Markdown doc
- presentation bullets
- phased roadmap

## Priority Backlog

### P0: Refactor Safety

- Keep backend and frontend build checks green.
- Use one concern per PR.
- Avoid large rewrites.
- Add tests before moving high-risk business rules.
- Preserve current behavior unless the task explicitly changes it.

### P1: Backend

- Split `service/src/index.ts` into app creation, route registration, and server startup.
- Standardize controller scope/error helpers.
- Introduce use case naming for business workflows.
- Break large repositories into smaller query groups.
- Reduce `any` usage at DTO and service boundaries.
- Add typed domain errors or typed result objects.

### P1: Drizzle

- Complete Drizzle config.
- Inventory full database schema.
- Split schema by bounded context.
- Add relations and indexes.
- Pilot Drizzle on small modules first.
- Document Sequelize-to-Drizzle transition rules.

### P1: Frontend

- Move endpoint wrappers from `shared/api/api.ts` into feature APIs.
- Standardize `api`, `model`, `hooks`, `components`, `utils`, and `types` folders.
- Move mutation/business logic out of pages and components.
- Audit legacy `*Old.tsx` files.
- Clarify feature ownership for Redux slices/selectors.

### P1: Bot

- Split `bot/index.js` into handlers, services, repositories, formatters, and config.
- Keep Telegram API integration separate from business rules.
- Keep SQL/database access in bot repositories only.
- Reuse backend/domain rules where possible instead of duplicating calculations.
- Add smoke checks for the main bot commands.

### P1: Cross-Cutting

- Standardize auth/RBAC checks.
- Standardize tenant/center scope helpers.
- Standardize error response shape.
- Review request/audit logging boundaries.
- Document environment variable ownership.
- Plan gradual TypeScript strictness improvement.

### P2: Quality

- Add ESLint/import-boundary rules.
- Add repository/service/use-case tests.
- Add hook and utility tests.
- Add typed API response mappers.
- Update architecture docs.

## Success Criteria

The refactor TOD is successful when:

- backend and frontend builds pass;
- controller/service/repository responsibilities are clear;
- no raw SQL exists in controllers;
- raw SQL in services is limited to documented infrastructure/system exceptions;
- Drizzle schema coverage is planned and piloted;
- UI components do not directly call APIs;
- business logic lives in hooks, use cases, domain rules, or pure utilities;
- bot responsibilities are documented if bot refactor is included in scope;
- auth, RBAC, tenant scope, validation, logging, and config are covered as cross-cutting rules;
- legacy files are audited;
- new architecture rules are documented;
- changed behavior is protected by focused tests.
