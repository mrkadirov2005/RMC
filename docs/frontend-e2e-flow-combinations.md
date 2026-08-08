# Frontend E2E Flow Combinations

## 1. Purpose

This document defines the browser-level business journeys for the React application. Each E2E test must begin from a known fixture, interact through the UI for the behavior under test, and verify both the visible result and the persisted result after reload.

The application uses hash routes, so `/students` below means `/#/students` in the browser.

## 2. Actors and baseline fixtures

| Actor | Required fixture | Primary landing page |
|---|---|---|
| Owner | Active owner with access to centers A and B | `/owner/manage` |
| Center admin | Active superuser with all permissions in center A | `/dashboard` |
| Limited admin | Active superuser with selected permissions only | First permitted route or `/unauthorized` |
| Teacher | Active teacher assigned to class A and its students | `/teacher-portal` |
| Student | Active student assigned to class A | `/student-portal` |
| Frozen student | Student whose account is frozen | `/student-portal`, read-only |

Shared data should include two isolated centers, two teachers in center A, one teacher in center B, active and archived students, two classes, scheduled sessions, rooms and slots, discounts, payments, debts, assignments, subjects, and online tests in several lifecycle states.

## 3. Combination dimensions

Every relevant flow must cover these combinations instead of testing only one happy path:

- Actor: owner, full admin, limited admin, teacher, student, anonymous.
- Scope: correct center, another center, changed owner center, guessed record ID.
- State: empty, populated, loading, success, validation error, API error, retry.
- Mutation: create, inspect, edit, archive/delete, restore where supported.
- Navigation: sidebar click, direct URL, reload, browser back/forward.
- Viewport: desktop and one mobile/tablet smoke viewport for critical flows.
- Session: remembered login, session-only login, logout, expired/invalid token.

## 4. Authentication and route-protection flows

### E2E-01 — Center admin login and logout

1. Open `/login/superuser` while logged out.
2. Submit empty values and verify required-field messages.
3. Submit wrong credentials and verify the server error without losing the username.
4. Submit valid center-admin credentials.
5. Verify redirect to `/dashboard`, the admin identity, and center A context.
6. Reload and verify the authenticated session is restored.
7. Log out and verify protected routes redirect to login.

Combinations: remember-me on/off, inactive account, locked account, expired token, direct protected URL before login, and limited admin landing behavior.

### E2E-02 — Owner login and active-center switching

1. Log in at `/login/owner`.
2. Verify redirect to `/owner/manage` and owner-only navigation.
3. Select center A and open students, teachers, and reports.
4. Switch to center B and verify all visible data refetches with no center-A records.
5. Reload and verify the valid selected center persists.
6. Log out and verify active-center state is cleared.

Combinations: no centers, one center, stale stored center, failed center load, direct owner route as ordinary admin, and attempted owner-only route as teacher/student.

### E2E-03 — Teacher, student, and frozen-student login

1. Log in as teacher and verify `/teacher-portal` plus teacher-only navigation.
2. Log out, log in as student, and verify `/student-portal` plus student-only navigation.
3. Log in as a frozen student and verify the frozen/read-only presentation.
4. Attempt a write action as the frozen student and verify it is blocked without changing data.

Combinations: wrong password, inactive teacher/student, deleted actor, direct cross-role URLs, and login responses/storage that never expose password hashes.

### E2E-04 — Authorization and permission matrix

For every protected top-level route, open it through navigation when allowed and by direct URL when denied.

| Route group | Owner | Full admin | Limited admin | Teacher | Student |
|---|---:|---:|---:|---:|---:|
| Dashboard | Denied/redirected | Allowed | Role allowed | Denied | Denied |
| Students | Allowed with selected center | Allowed | Permission dependent | Denied | Denied |
| Teachers/classes/payments/subjects/assignments/debts | Selected-center/permission rules | Permission dependent | Permission dependent | Only explicitly allowed views | Denied |
| Owner management/reports/centers | Allowed | Denied | Denied | Denied | Denied |
| Teacher portal | Denied | Denied | Denied | Allowed | Denied |
| Student portal/my tests | Denied | Denied | Denied | Denied | Allowed |
| Test management | Selected-center/permission rules | Permission dependent | Permission dependent | Permission dependent | Denied |

Verify both hidden navigation entries and server-backed denial; hiding a menu item alone is not sufficient.

## 5. Setup and people-management flows

### E2E-05 — Create and manage a center

1. Log in as owner and navigate to `/centers`.
2. Add a center with all required identity/contact fields.
3. Verify it appears once and becomes selectable as an active center.
4. Edit an optional field and confirm omitted fields remain unchanged.
5. Attempt duplicate/invalid creation and verify inline errors.
6. Delete or deactivate the disposable center and verify it is no longer selectable.

Combinations: ordinary admin denial, duplicate code/name, missing required fields, API failure with retained form data, and center containing dependent records.

### E2E-06 — Create and manage a teacher

1. Log in as center admin.
2. Navigate to **Teachers** (`/teachers`).
3. Click add teacher and complete identity, contact, specialty, salary/payment, username, and status fields exposed by the form.
4. Submit once and verify success.
5. Search for the teacher and verify exactly one row.
6. Open teacher detail and verify every saved field and generated/default credentials presentation.
7. Edit the teacher while leaving optional fields untouched; verify they are preserved.
8. Assign the teacher to a class/student and verify dependencies on detail.
9. Attempt deletion with dependencies, then follow the supported reassign/force flow.

Combinations: duplicate username, generated username collision, invalid percentage, other-center ID, limited admin without `CRUD_TEACHER`, reload persistence, and deletion blocked by attendance/grade history.

### E2E-07 — Create and manage a student

1. Log in as center admin and navigate to **Students** (`/students`).
2. Click **Add student** and reach `/students/new`.
3. Fill identity, enrollment, contact, school, acquisition source, teacher, class, username, and password.
4. Configure each supported discount combination and verify its preview.
5. Submit and verify duplicate clicks cannot create two students.
6. Search by enrollment and username; verify exactly one result.
7. Open detail and verify all fields, class, teacher, status, credentials state, and discount summary.
8. Edit selected fields and verify omitted values are preserved.
9. Log in with the new student credentials and verify matching portal identity/class.

Combinations: required fields, duplicate username, duplicate enrollment, fixed/percent × monthly/serial, zero price, invalid class/teacher pairing, client-supplied center tampering, server failure preserving form state, and owner creation after switching centers.

### E2E-08 — Student transfer, freeze, archive, restore, and purge

1. Open an active student in class A.
2. Transfer to class B and verify the confirmation and new active membership.
3. Verify class A retains historical membership and class B shows the active student once.
4. Verify teacher A loses active ownership and teacher B gains it where applicable.
5. Freeze the student and verify the student can read but cannot mutate.
6. Unfreeze, archive/soft-delete, and verify removal from normal lists.
7. Open `/archive`, restore the student, and verify class/history/login remain intact.
8. Purge only a disposable archived fixture with the authorized owner flow.

Combinations: same target class, missing target, other-center class, teacher-unowned class, cancel confirmation, FK-blocked purge, wrong-center guessed ID, and teacher UI lacking freeze/archive controls.

### E2E-09 — Telegram lead conversion

1. Log in as an authorized admin and open `/telegram-registrations`.
2. Filter and inspect a pending registration.
3. Convert it into a student, completing required class/teacher fields.
4. Verify one student is created and the registration state changes.
5. Repeat/reload and verify conversion is idempotent.
6. Reject a separate pending registration and verify its terminal state.

Combinations: other-center lead, already converted/rejected lead, missing required data, API failure, empty list, and admin without student permission.

## 6. Academic setup and lesson flows

### E2E-10 — Subject and assignment lifecycle

1. Log in as an authorized admin.
2. Create a subject, verify it in the list, edit it, and test duplicate validation.
3. Create assignments targeted to a class, teacher, and individual student as supported by the UI.
4. Verify only relevant actors see each assignment.
5. Submit as the student where the UI supports submission.
6. Grade as the assigned teacher/admin and verify status/content persistence.
7. Delete a disposable assignment and test dependency handling for the subject.

Combinations: wrong center, unrelated teacher/student, invalid/regressive status, missing content/date, soft-deleted target, and API error/retry.

### E2E-11 — Room creation, slot generation, booking, and cancellation

1. Navigate to `/rooms` and create a room with name, capacity, and location.
2. Verify duplicate identity and invalid capacity errors.
3. Generate slots for selected weekdays and a bounded date range.
4. Verify correct dates/times with no overlaps or duplicates after rerun.
5. Book a slot for a compatible class and verify booked styling/details.
6. Attempt the same/conflicting booking and verify one clear conflict with no duplicate.
7. Cancel the booking and verify availability returns.

Combinations: invalid time order/date range, other-center class/room, capacity mismatch if enforced, concurrent booking, timezone boundary, and mobile calendar view.

### E2E-12 — Class creation, scheduling, and enrollment

1. Create prerequisite teacher, room, and subject fixtures.
2. Navigate to `/classes` and create a class with teacher, room, capacity, price, weekdays, time/duration, and date bounds.
3. Verify generated class code when omitted.
4. Generate sessions for a selected month.
5. Verify only matching weekdays inside class bounds appear, including month/year edges.
6. Rerun generation and verify created/skipped counts with no duplicates.
7. Enroll or edit a student into the class.
8. Open class detail and verify schedule, room, teacher, price, sessions, and student.
9. Log in as the teacher and verify the assigned class/student in the portal.

Combinations: invalid schedule JSON/day/time, teacher from another center, missing teacher, leap day, class end date, duplicate code, unassigned teacher denial, and soft delete behavior.

### E2E-13 — Daily lesson completion and correction

1. Log in as the assigned teacher and open the class/session workflow.
2. Select attendance, homework, activity, points, and coin actions.
3. Mark all students and verify completion counters.
4. Exercise each attendance mapping and score boundary.
5. Select exactly one stellar student and verify a second selection is prevented/replaced.
6. Save once; verify success and cleared draft.
7. Reload and verify every saved value.
8. Correct one student's score and save again.
9. Log in as that student and verify attendance, grade, and coins reflect only the corrected delta.
10. Verify the same values in admin class/student statistics.

Combinations: incomplete records, invalid score, failed save retaining draft, concurrent double submit, transactional rollback, coin action removed after prior award, transferred student history, frozen student, and unrelated teacher denial.

### E2E-14 — Calendar navigation

1. Open `/calendar` as admin, teacher, and student.
2. Verify each actor sees only permitted sessions/classes.
3. Navigate month/week/day controls and open a session detail/workflow where authorized.
4. Verify local date/time rendering around day/month boundaries.
5. Reload and verify selected calendar state behaves as intended.

Combinations: empty calendar, deleted/cancelled session, student direct workflow URL denial, owner center switch, and mobile viewport.

## 7. Finance flows

### E2E-15 — Discounted payment and debt reconciliation

1. Create/open a student with an active monthly discount.
2. Navigate to `/payments/new` and select the student.
3. Verify tuition, discount kind/value, original amount, and final amount load correctly.
4. Create a partial payment and verify incomplete state plus immutable receipt snapshot.
5. Start a second payment and verify the monthly discount was consumed once.
6. Complete the remaining amount and verify debt status/totals.
7. Verify payment history in admin and student portals.
8. Repeat with a serial discount and verify it remains active under current rules.

Combinations: fixed/percent, monthly/serial/no discount, zero final amount, duplicate receipt/reference, invalid amount, failed transaction rollback, concurrent duplicate submit, edit/delete/purge, date/method filters, and other-center guessed IDs.

### E2E-16 — Teacher payment-access flow

1. Log in as teacher and open Payments.
2. Verify finance details are locked until separate payment credentials are supplied.
3. Submit wrong and then valid payment credentials.
4. Verify only the teacher's students/payments are visible.
5. Let/inject payment-token expiry and verify the view relocks without logging out the normal teacher session.

Combinations: teacher without payment credentials, unrelated student, direct URL before unlock, remembered normal token without payment token, and payment API failure.

### E2E-17 — Finance dashboard, refunds, invoices, and plans

1. Log in as admin with finance permission and open `/finance`.
2. Apply date, teacher, class, and source filters; verify cards, charts, and tables agree.
3. Open `/finance/teacher/:teacherId` and verify salary percentage, revenue, and zero-data behavior.
4. Exercise visible refund, invoice, and payment-plan operations if exposed by the current UI.
5. Verify processed refunds affect summaries once and overdue boundaries are correct.

Combinations: zero revenue, decimals/rounding, missing salary percentage, refund above eligible amount, invalid state transition, owner center switching, limited-admin denial, and no `NaN`/stale chart series.

## 8. Online-test flows

### E2E-18 — Author, edit, assign, take, grade, and review a test

1. Log in as an authorized teacher/admin and open `/tests`.
2. Create a timed test with a reading passage, objective question, and manual question.
3. Verify validation, ordering, points, options, correct answers, timing, privacy, attempts, and saved detail.
4. Edit the test and verify omitted/nested data is preserved.
5. Assign it to a student and class; repeat assignment and verify no duplicate.
6. Log in as the assigned student and open `/my-tests`.
7. Start the test, answer questions, navigate away/back, reload, and verify resume/timer/answer persistence.
8. Submit after confirmation and verify objective grading plus manual-pending state.
9. Log in as the assigned teacher and grade the manual answer within its point limit.
10. Verify total, pass state, summary, and feedback.
11. Log back in as student and verify final results with answer-key privacy rules.

Combinations: private/public, student/class/all-students assignment, unassigned student, unrelated teacher, too early, expired, inactive, attempt limit, retake, timer auto-submit, unanswered required question, invalid question ID, manual score above maximum, duplicate submit, concurrent start, and cross-center IDs.

## 9. Portals, reporting, and supporting-feature flows

### E2E-19 — Teacher portal full navigation

1. Log in as teacher and visit `/teacher-portal`.
2. Exercise classes, students, attendance, grades, assignments, tests, and payment tabs.
3. Select class/student filters and verify every tab remains teacher-scoped.
4. Open a class/session workflow and return without losing intended selection.
5. Verify empty/error states for optional sections do not break other tabs.

Combinations: teacher with no assignments, multiple classes, transferred student, payment locked/unlocked, direct guessed IDs, and API partial failure.

### E2E-20 — Student portal full navigation

1. Log in as student and visit `/student-portal`.
2. Verify identity, profile, class/teacher, weekly schedule, attendance, grades, coins, debts, payments, assignments, and tests.
3. Open profile dialog/detail and verify no other student's data.
4. Navigate to calendar and my tests, then return.
5. Verify a failed optional dashboard section shows a safe fallback while other data remains usable.

Combinations: active/frozen/transferred student, no class, no finance history, partial API failure, another student ID in URL/request, and responsive viewport.

### E2E-21 — Owner reports and retention/intake

1. Log in as owner and open `/owner/reports`.
2. For center A, verify finance, students, teachers, discounts, retention, and attendance sections.
3. Apply date/source/teacher/class filters and verify charts, rows, and totals share the same scope.
4. Switch to center B and verify all sections refetch without stale center-A identities.
5. Open admin `/retention?view=retention` and `?view=intake`; verify stable filtered cohorts.

Combinations: empty center, UTC month boundary, no churn/intake, large/decimal totals, browser back/forward between query views, reload persistence, and failed report endpoint.

### E2E-22 — Archive, settings, translations, logs, and engineering

1. Verify archive filters, restore, purge confirmation, unsupported type, and permission denial.
2. Verify settings load/save, validation, role-based read/write behavior, sidebar order, language, and theme persistence.
3. Verify public translation reads and authenticated superuser edit/bulk-save behavior.
4. Open `/logs`, filter request logs, inspect a record, and verify secrets/passwords/tokens are redacted.
5. Open `/engineering` and verify health/stats access by role; owner-only destructive/database actions require confirmation and allowlisted input.

Combinations: Mongo unavailable with application still usable, malformed filters, empty log results, failed settings save, invalid system table/operation, ordinary admin versus owner, and service health degradation.

### E2E-23 — Search, filtering, pagination, and saved UI state

1. On students, teachers, classes, payments, debts, and other list pages, exercise search, entity/status filters, sorting, pagination, and view modes.
2. Verify changing a filter resets pagination appropriately.
3. Reload/back-forward and verify only intended state persists.
4. Verify selections do not refer to rows removed by a refetch.
5. Verify empty, loading, and API-error states.

Combinations: special/SQL-like text, Unicode, no results, last-page deletion, limit bounds, rapid query changes, stale response ordering, center switch, and mobile list/table modes.

### E2E-24 — Service failure and recovery

1. Log in and open a populated data page.
2. Make health or API requests fail in the E2E environment.
3. Verify the service-unavailable experience, preserved authentication, and disabled destructive actions.
4. Restore the service and retry.
5. Verify return to the intended route with fresh data and no duplicate mutation.

Combinations: health failure before login, failure during form submit, timeout, `401`, `403`, `423`, `500`, malformed response, and recovery after reload.

## 10. Cross-flow business chains

These chains validate that one feature's output becomes another feature's input.

### Chain A — Center to completed lesson

Owner creates center → admin creates teacher → admin creates room and subject → admin creates class and sessions → admin creates/enrolls student → teacher completes lesson → student sees attendance, grade, and coins → owner sees report changes.

### Chain B — Student onboarding to paid tuition

Admin creates discounted student → student logs in → admin records partial and final payments → monthly discount is consumed once → debt reconciles → teacher payment view shows only owned student → owner finance totals update.

### Chain C — Student lifecycle across classes

Admin creates student in class A → teacher A sees student → admin transfers to class B → history remains in class A → teacher B sees active student → admin freezes/unfreezes → archives/restores → student can log in with preserved identity/history.

### Chain D — Test lifecycle

Teacher authors test → assigns student/class → student starts/resumes/submits → objective question auto-grades → teacher manually grades → student sees permitted result → summaries/reporting show one attempt.

### Chain E — Room and schedule conflict

Admin creates room → generates slots → creates/schedules class → books slot → second conflicting booking loses → cancellation restores availability → class/calendar reflect the final booking state.

## 11. Test implementation rules

- Use Playwright projects for desktop Chromium plus one critical mobile viewport; add Firefox/WebKit smoke coverage after P0 stability.
- Seed prerequisites through isolated fixture helpers or database setup, but perform the business action being tested through the browser.
- Generate unique usernames, enrollment numbers, class codes, and payment references per worker.
- Do not make tests depend on execution order. Cross-flow chains may share a fixture specification, not mutable state from an earlier test.
- Prefer role/name/label selectors and add stable `data-testid` only where accessible selectors cannot uniquely express intent.
- Assert network success and user-visible state, then reload or query through the UI to prove persistence.
- Capture trace, screenshot, video, console errors, and failed responses on retry/failure.
- Treat unexpected browser console errors, unhandled promise rejections, and failed API calls as test failures unless explicitly expected.
- Run destructive cases only against disposable records in the dedicated E2E database.

## 12. Suggested Playwright suite layout

```text
ui/e2e/
  fixtures/
    actors.ts
    data.ts
    auth.ts
  helpers/
    navigation.ts
    forms.ts
    assertions.ts
  auth/
  access/
  centers/
  teachers/
  students/
  classes/
  lessons/
  rooms/
  finance/
  tests/
  portals/
  reports/
  supporting/
  reliability/
```

## 13. Initial execution priority

1. P0: E2E-01 through E2E-04, E2E-06 through E2E-08, E2E-12, E2E-13, E2E-15, and E2E-18.
2. P1: E2E-05, E2E-09 through E2E-11, E2E-14, E2E-16, and E2E-19 through E2E-24.
3. Cross-flow chains A through E.
4. Browser/viewport expansion, accessibility checks, and performance budgets.

## 14. Engineering page runner

Owners can run an individual allowlisted flow or the complete suite from **Engineering → E2E Flows**. The page polls the backend for output and shows the active run, exit state, duration, recent runs, cancellation, and the isolated database name.

On the EC2 service configure the runner paths and isolated database:

```env
NODE_ENV=development
E2E_UI_DIR=/absolute/path/to/RMC/ui
E2E_DB_NAME=crm_frontend_e2e_test
E2E_DB_HOST=127.0.0.1
E2E_DB_PORT=5432
E2E_DB_USER=crm_user
E2E_DB_PASSWORD=replace-me
E2E_RUN_TIMEOUT_MS=1800000
```

When PostgreSQL is another Docker service, use its Compose service name for `E2E_DB_HOST` instead of `127.0.0.1`. The configured database name must end in `e2e_test`; otherwise the runner refuses to start because the E2E seeder resets its database.

Install the browser runtime once on the machine/container that runs the backend command:

```bash
cd /absolute/path/to/RMC/ui
npm install
npx playwright install --with-deps chromium
```

No runner enable flag is required. The API accepts only the flow IDs returned by `GET /api/system/dev/e2e/flows`; it does not accept spec paths or arbitrary command arguments. Only authenticated owners can list, start, inspect, or cancel runs.
