# Teacher Salary Tracking — Plan

## Context

There is currently no salary/payroll concept in the system. `teachers.salary_percentage` exists but is unused except for an inconsistent, hardcoded 20% calculation in the Owner Finance panel. Admins/owners have no way to record "this teacher was paid their salary for month X, this amount, by whom," or see it alongside how many of that teacher's students actually paid tuition that month. The Payments page's "Statistics" tab currently shows a lifetime (not month-scoped) per-teacher paid/unpaid table that doesn't touch salary at all.

**Goal:** add an admin/owner-only **Salary** feature — a general statistics page listing every teacher with their last-month salary status and student-payment %, a per-teacher detail/history view where admins/owners mark salaries as paid (recording who marked it and their role), and an entry point surfaced from the Payments → Statistics tab (replacing its current per-teacher table) rather than the sidebar.

**Confirmed with user:**
| Question | Decision |
|---|---|
| How is salary amount determined? | Manually entered/marked by an admin or owner — no auto-calculation from `salary_percentage` |
| Who can mark a salary paid? | Both admin and owner; the record must store **who** marked it — name and role — as a durable snapshot, not just a foreign key |
| "% submitted" vs "% paid" | Same metric — % of the teacher's students who paid tuition for that month |
| Sidebar entry? | None — access via a link from Payments → Statistics tab, plus a direct route |

## 1. Data Model — new table `teacher_salaries`

| Column | Type | Notes |
|---|---|---|
| `salary_id` | `SERIAL PK` | |
| `center_id` | `INT` | Tenant scope |
| `teacher_id` | `INT NOT NULL` | `REFERENCES teachers(teacher_id) ON DELETE CASCADE` |
| `salary_year` | `INT NOT NULL` | |
| `salary_month` | `INT NOT NULL` | `CHECK (salary_month BETWEEN 1 AND 12)` |
| `amount` | `NUMERIC(12,2) NOT NULL DEFAULT 0` | Manually entered by admin/owner |
| `is_paid` | `BOOLEAN NOT NULL DEFAULT false` | |
| `paid_at` | `TIMESTAMP NULL` | |
| `marked_by_id` | `INT NULL` | id in `owners` or `superusers` — polymorphic, no FK (see §2) |
| `marked_by_user_type` | `VARCHAR(20) NULL` | Always `'superuser'` today; future-proofing |
| `marked_by_role` | `VARCHAR(50) NULL` | e.g. `'owner'`, `'admin'` |
| `marked_by_name` | `VARCHAR(200) NULL` | Snapshot of first+last name (fallback: username) at time of marking |
| `payment_method` | `VARCHAR(50) NULL` | |
| `notes` | `TEXT NULL` | |
| `created_at` / `updated_at` | `TIMESTAMP` | |
| — | `UNIQUE (teacher_id, salary_year, salary_month)` | One record per teacher per month |
| — | Indexes on `center_id`, `teacher_id` | |

- File: `service/db/migrations/<timestamp>-teacher-salaries.js`, same raw-SQL `CREATE TABLE IF NOT EXISTS` style as `20260818000001-teacher-tasks.js`, with a `down()` that drops the table. Runs automatically on backend boot (`AUTO_MIGRATE`) and via `npm run db:migrate`.
- Add matching `teacherSalaries = pgTable('teacher_salaries', {...})` to `service/src/db/schema.ts`, exported from `module.exports`.
- `scripts/backup.sh` needs no changes — it already backs up all public tables generically.

## 2. Backend Module (`service/src/modules/salaries/`)

Mirrors the `teacherTasks` module shape (`index.ts`, `controllers/`, `services/`, `repositories/`).

| Piece | Responsibility |
|---|---|
| `repositories/salary.repository.ts` | `findRecord`, `upsertRecord`, `updateRecord`, `listHistoryForTeacher`, `listTeacherOverview({centerId, year, month})` — joins `teachers` with a per-teacher student-payment aggregate using the existing `COALESCE(classes.teacherId, students.teacherId)` scoping pattern (from `payment.repository.ts` / `report.repository.ts`), filtered to `payment_status = 'Completed'`, `deleted_at IS NULL`, `payment_date` in the target month |
| `services/salary.service.ts` | `getOverview` (defaults to previous calendar month), `getTeacherDetail`, `markPaid`, `updateRecord` — resolves `marked_by_name`/`marked_by_role` from the acting user (see below) |
| `controllers/salary.controller.ts` | `getScopedCenterId`/`isGlobalUser` tenant checks, `teacherInCenter` ownership validation, uniform error handling — same conventions as `teacherTask.controller.ts` |
| `service/src/dtos/salaries.dto.ts` | `MarkSalaryPaidDto` (`teacher_id`, `salary_year`, `salary_month`, `amount`, `payment_method?`, `notes?`), `UpdateSalaryDto` — `class-validator` style, matching `debts.dto.ts` |
| `service/src/routes/salaryRoutes.ts` | `GET /`, `GET /teacher/:teacherId`, `POST /mark-paid`, `PATCH /:id` — all `requireAuth, requireRole('superuser')` (owners pass via the standard `role==='owner'` bypass; teachers are **not** granted access) |

**Resolving "who marked it"** — the JWT only carries `id`, `username`, `role`, `userType` (no name), and critically `id` is polymorphic: when `role === 'owner'`, `id` is a row in the `owners` table (per `owner.controller.ts` login: `generateToken({ id: owner.owner_id, ..., role: 'owner' })`); otherwise it's a row in `superusers`. The service branches on `role === 'owner'` to look up the correct table and build `marked_by_name = firstName + lastName` (fallback `username`).

Mount in `service/src/index.ts`:
```ts
app.use('/api/salaries', requireAuth, requireRole('superuser'), salaryRoutes);
```

Add `MANAGE_SALARY` to `PERMISSIONS` in `service/src/middleware/rbac.ts` and mirror it as `PERMISSION_CODES.MANAGE_SALARY` in `ui/src/types/index.ts`.

## 3. Frontend

| Piece | Detail |
|---|---|
| Routing (`ui/src/App.tsx`) | `/salary` and `/salary/:teacherId`, lazy-loaded, `ProtectedRoute requiredUserType="superuser" requiredPermission={PERMISSION_CODES.MANAGE_SALARY}` — same shape as the existing `/finance` route. **No `Sidebar.tsx` change.** |
| Permission grant list | Add `{ label: 'Salary', path: '/salary', permission: PERMISSION_CODES.MANAGE_SALARY }` to `ADMIN_PAGE_ACCESS` in `ui/src/features/crm/rbac/adminPageAccess.ts` so owners can grant regular admins access (separate concern from the sidebar) |
| API client | `salaryAPI` in `ui/src/shared/api/api.ts`: `getOverview(params)`, `getTeacherDetail(teacherId)`, `markPaid(payload)`, `updateSalary(id, payload)` |
| Redux slice | `ui/src/slices/salariesSlice.ts` — async-thunk slice mirroring `teacherTasksSlice.ts` (`fetchSalaryOverview`, `fetchTeacherSalaryDetail`, `markSalaryPaid`, `updateSalaryRecord`); registered in `ui/src/store/index.ts`. Justified per `ui/ARCHITECTURE.md`: cross-route server data used by both the new Salary pages and the Payments Statistics tab |
| `ui/src/features/crm/salary/SalaryPage.tsx` | The general statistics page — summary cards (teacher count, total salary marked-paid, avg paid-student %), month picker (defaults to last full month), and a teacher list built from the same reusable scaffold `FinancePage.tsx`/`TeacherTasksPage.tsx` already use: `PageHeader`/`PageToolbar` search, `ViewModeToggle`, `PaginationBar`, shadcn `Table` — there's no single generic "global list" component to import, so this scaffold *is* the reused pattern. Columns: Teacher, Center, Last-Month Salary, Paid? badge, Marked By (name + role), Students Paid %, Students Unpaid %, Student Count. Row click → `/salary/:teacherId` |
| `ui/src/features/crm/salary/SalaryTeacherDetailPage.tsx` | One teacher's salary history (last N months) + "Mark as Paid" dialog + the same student paid/unpaid breakdown (visually similar to `TeacherPaymentsTab.tsx`'s paid badge table) |
| `components/MarkSalaryPaidDialog.tsx` | Form (amount, payment method, notes) → `markSalaryPaid` thunk, styled like `TeacherTasksPage.tsx`'s existing Dialog |
| `model/salaryModel.ts` | Pure functions: `resolveDefaultPeriod()`, `formatSalaryPeriod(year, month)`, `buildSalaryRows(...)` — unit-tested per `ARCHITECTURE.md`'s money/permissions guidance. Reuses `isPaidPayment`/`getMonthKey` from `payments/utils/paymentHistory.ts` for consistency |
| Payments → Statistics tab (`PaymentsFolderTabs.tsx`, `activeTab === 'statistics'` block) | Replace the existing lifetime per-teacher `<Table>` (Teacher/Students/Worked/Paid/Unpaid/Paid Students/Unpaid Students) with a compact **last-month salary summary table** (Teacher, Last-Month Salary, Paid? badge, Students Paid %) sourced from `salariesSlice`, plus a "View full Salary report →" link to `/salary`. Row click → `/salary/:teacherId`. The overall payment stat cards and paid/unpaid progress bar above it are unrelated and stay as-is |

## 4. DevOps

| Item | Impact |
|---|---|
| New services / env vars / Docker changes | None — same Postgres instance, same deploy path |
| Migration execution | Automatic via `AUTO_MIGRATE` on boot, or `npm run db:migrate` |
| API docs | Add `swagger-jsdoc` comments to `salaryRoutes.ts`, served at `/docs`, matching every other route file |
| Backups | `scripts/backup.sh` requires no changes (generic per-table pg_dump/CSV export already covers new tables) |
| Optional follow-up | Port the `salaries` module into `nest/src/modules/` for parity with the in-progress NestJS rewrite — not required since `nest/` isn't live |

## 5. Testing / Verification

| Layer | Coverage |
|---|---|
| Backend | Jest unit tests for `salary.repository.ts`'s month-window/COALESCE query and `salary.service.ts`'s `markPaid` / owner-vs-superuser name resolution |
| Frontend | Vitest tests for `salaryModel.ts` pure functions (default-period resolution, percent math) and slice reducers; optional Playwright coverage for the mark-as-paid flow |
| Manual | Log in as an owner and as a non-owner superuser; verify `/salary` and `/salary/:teacherId` render; mark a salary paid as each role and confirm `marked_by_name`/`marked_by_role` reflect the correct account; verify the Payments → Statistics tab shows the new summary table and links out correctly |

---
*No code has been written for this feature yet — this document is the plan only.*
