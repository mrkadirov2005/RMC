# Express + React Test Plan

## 1. Scope

This document describes tests for:

- the Express/TypeScript backend in `service/`;
- the React/TypeScript frontend in `ui/`;
- the PostgreSQL data used by the Express service and MongoDB request logging where relevant.

The Nest backend in `nest/` is explicitly excluded. The Telegram bot in `bot/` is also outside the executable test scope, although the Express endpoints used by Telegram registration and student views are included.

The recommendations are based on the routes, controllers, services, repositories, database schema, React routes, pages, hooks, Redux slices, and tests currently present in the repository as of 2026-08-08.

## 2. System map and critical rules

### Actors and access

| Actor | Main UI | Important access rules |
| --- | --- | --- |
| Owner | `/owner/manage`, `/owner/reports` | Global access, chooses an active center for center-scoped work, owns engineering/system operations |
| Superuser/admin | CRM dashboard and management pages | Bound to a center; access also depends on explicit permissions |
| Teacher | `/teacher-portal` | Can see assigned classes/students and teaching workflows; payment access uses separate credentials/token |
| Student | `/student-portal` | Can see only their own portal/test data; a frozen account remains readable but is blocked from writes |

Authentication is JWT-based. Invalid, missing, and expired tokens return `401`; wrong roles or permissions return `403`. Data is isolated by `center_id`, and teacher access is further constrained by effective class/student ownership. Soft-deleted rows must normally be excluded.

### Domain flow

```text
Center
  -> teachers, superusers, rooms
  -> classes -> generated sessions -> attendance + lesson scores -> grades + coins
  -> students -> discounts -> payments/debts -> reports
              -> assignments
              -> online-test assignments -> submissions -> grading/results
  -> archive (soft-deleted students/classes/teachers/payments)
```

Cross-cutting features include parents, notifications, audit logs, saved filters, search, CSV/Sheets import-export, translations, settings, request logs, Telegram registration conversion, and system health/engineering operations.

### Highest-risk invariants

- No center-scoped request may read or mutate another center's data, even if an ID is guessed.
- Teachers may only access their effective classes/students; they cannot freeze students or reassign teacher ownership.
- Student transfers retain previous-class history and reject missing or identical target classes.
- Soft deletion hides records from normal lists; restoration returns them; permanent purge has stricter owner restrictions and handles foreign-key conflicts.
- Monthly and serial discounts are mutually coordinated. A payment stores a discount snapshot; a consumed monthly discount is deactivated in the same transaction as payment creation.
- Session generation follows the class weekday/time and date bounds, and reruns must skip duplicates.
- A lesson workflow saves attendance, score components, grades, and coins transactionally. A session may have at most one stellar student.
- Re-saving a lesson adjusts the existing source coin transaction instead of double-awarding coins.
- Test visibility depends on center, actor, creator, assignment, and privacy. Submission and grading totals must remain internally consistent.

## 3. Test levels and conventions

Use four levels:

1. Backend unit tests: Jest with repositories and infrastructure mocked. Test one controller, service, middleware, DTO/parser, or pure calculation at a time.
2. Frontend unit/component tests: Vitest, React Testing Library, `user-event`, and Mock Service Worker (MSW). Test observable behavior, not implementation details.
3. Integration tests: start an exported Express app against a disposable PostgreSQL database, call it with Supertest, and verify both HTTP responses and stored data. Use a real Mongo container only for request-log integration cases.
4. E2E tests: Playwright against the built React app, real Express service, and seeded disposable databases.

Recommended file layout:

```text
service/src/**/tests/*.test.js             existing and new unit tests
service/test/integration/**/*.test.ts      API + PostgreSQL integration tests
ui/src/**/tests/*.test.tsx                 component/page tests
e2e/fixtures/                              role login and seed helpers
e2e/flows/**/*.spec.ts                     browser journeys grouped by flow
```

Every test should use deterministic dates, timezone `Asia/Tashkent` where user-visible dates matter, stable generated identifiers, and independent fixtures. Integration/E2E cleanup should reset only its own database or center, never shared development data.

## 4. Backend unit tests (`service/`)

### Flow A: authentication, authorization, and tenant scope — P0

Middleware and shared helpers:

- `generateToken`, custom expiry, and payment token contain the intended actor, center, class, permissions, and expiry claims.
- `requireAuth` accepts a valid bearer token and rejects missing scheme, malformed token, invalid signature, and expired token with the correct status/message.
- A frozen student can issue `GET` requests but receives `423 STUDENT_ACCOUNT_FROZEN` for `POST`, `PUT`, `PATCH`, and `DELETE`; the database lookup ignores deleted students.
- `requireRole`, `requireOwner`, `requirePermission`, and any/all permission checks cover owner bypass, allowed roles, absent user, and denied user.
- `requireSelfOrAdmin`, ownership helpers, and student-data access reject another student's ID.
- Tenant parsing covers center from authenticated admin, owner-selected center header/query, teacher's fixed center, missing center, invalid center, and attempts to override a non-owner center.
- Repository scoping helpers always combine `center_id`, teacher ownership, and `deleted_at IS NULL` rather than replacing an existing predicate.

Actor login services/controllers:

- Superuser, owner, teacher, student, and parent login: success, wrong username, wrong password, inactive/suspended actor, deleted actor, and response that never exposes a password hash.
- Owner login attempt counters increment on failure and reset on success.
- Teacher payment login uses separate credentials, produces a short-lived payment-access token, and never upgrades the normal teacher token silently.
- Password creation/change/reset hashes values, verifies the old password, rejects duplicates/weak or missing data as defined by DTOs, and invalidates no unrelated account.

### Flow B: center and staff setup — P0/P1

- Center create/update/delete validates required fields and unique identities; owner global listing is safe while center admins cannot escape their scope.
- Teacher creation generates a unique username/default password, hashes it, assigns the authenticated center, and ignores client-supplied platform metadata.
- Explicit duplicate teacher usernames return the documented conflict response.
- Teacher update does not accidentally blank optional fields omitted from the request.
- Teacher deletion unassigns dependent class/student relationships and soft-deletes the teacher in the correct center.
- Superuser creation and permission changes normalize permission arrays and cannot grant access across centers.
- Owner CRUD never returns hashes; registration secret/registration restrictions, account state, and change-password cases are covered.

### Flow C: student onboarding, editing, transfer, freeze, archive — P0

- Student list query parser covers page/limit bounds, search, status, teacher, class, school, acquisition source, sort, and null-class filters.
- Create hashes an optional password and forwards every supported identity/contact/school/acquisition field.
- Controller always replaces a client-provided `center_id` with the authenticated scope.
- Duplicate username and enrollment number map PostgreSQL `23505` to `409` with distinct messages.
- Teacher create/update strips `is_frozen`; update also strips `teacher_id`.
- Student update preserves omitted fields and rejects a missing, deleted, other-center, or teacher-unowned student.
- Discount synchronization creates the selected serial/monthly discount, updates an existing one, deactivates the opposite kind, and disables both when `is_discounted` becomes false.
- Fixed and percentage discounts clamp correctly so the final price never becomes negative; zero/empty price behavior is explicit.
- Transfer rejects missing student, missing target class, same class, other-center class, and teacher-unowned class; success records `previous_class_id` and exposes historical membership without duplicating the active student.
- Freeze/unfreeze can be performed only by authorized admins. Frozen state is reflected on subsequent login and middleware checks.
- Soft delete, deleted listing, archive restore, and purge cover not found, unsupported entity, wrong center, successful restore, FK conflict, and restricted permanent-delete identity.
- Credential reset/change covers old-password mismatch and missing student.
- Coin ledger add/update/delete and source-upsert update the balance by the delta difference, are center/teacher scoped, and roll back on failure.

### Flow D: class scheduling, rooms, and sessions — P0

- Class creation rejects a teacher outside the center, generates a code when omitted, applies payment defaults, and persists schedule JSON and date bounds.
- Schedule parsing accepts full and short weekday names, rejects invalid JSON/days, handles explicit end time, and computes duration correctly.
- Monthly generation includes only matching weekdays between class start/end dates, handles month/year edges and leap day, and returns created/skipped counts.
- Repeated generation is idempotent at the repository uniqueness boundary.
- A teacher can only list/generate/delete sessions for assigned classes.
- Create session calculates end time and rejects an absent/wrong-center class.
- Deleting a class soft-deletes its future/sibling sessions as intended; restoring behavior is tested separately.
- Room CRUD detects duplicate room identity and capacity/field errors within a center, not across centers.
- Slot batch/date-range generation validates time order and date range and does not produce overlaps/duplicates.
- Booking rejects an unavailable, wrong-center, overlapping, or already-booked slot; update/cancel frees availability and stays scoped.

### Flow E: lesson attendance, scoring, grades, and coins — P0

- Attendance CRUD normalizes every supported status and enforces the unique student/session record.
- Grade calculations handle absent components, zero totals, decimals, percentage boundaries, and invalid scores.
- Bulk lesson save validates class/session/records, student membership, teacher ownership, and at most one stellar student.
- Selected attendance values map correctly (`On time` to `Present`, `Excused` to `Absent R`, etc.).
- The service transaction upserts attendance and grades for each student, calculates the total, and commits all students together.
- Any failing student/coin write rolls back attendance, grades, and coin changes for the entire lesson.
- Coin mapping handles exact thresholds and values between thresholds. Stellar bonus is added once.
- Re-saving the session changes the source transaction and balance by the difference; disabling coin awards removes the prior award rather than leaving stale coins.
- Deleting/clearing a scored session reverses the lesson coin transaction consistently.
- Lesson-scoring settings validate mappings, ordering, numeric values, defaults, owner/admin write access, and teacher read-only access.

### Flow F: assignments and subjects — P1

- Subject CRUD is center-scoped and handles duplicates and dependencies.
- Assignment creation supports class, teacher, and individual-student targeting as represented by the current schema.
- Lists expose only assignments relevant to the actor and exclude deleted entities.
- Status transitions permit `Pending -> Submitted -> Graded` and reject invalid/regressive transitions if not supported.
- Update/delete rejects another center or another teacher's assignment.
- Student submission content/date and teacher grading are preserved and do not leak to unrelated students.

### Flow G: payments, discounts, debts, and teacher finance — P0

- Payment draft defaults date, `UZS`, `Cash`, tuition type, completed status, and unique references.
- Payment create chooses explicit monthly discount first, then active monthly, then serial, and no discount otherwise.
- Fixed/percent calculations persist `original_amount`, `discount_amount`, `final_amount`, kind/type/value, and `discount_id` as an immutable snapshot.
- `is_complete` honors an explicit value; otherwise it compares paid amount to final amount, including zero and partial payments.
- Consuming a monthly discount inserts the payment and deactivates the discount in one transaction; either both commit or both roll back. Serial discount remains active according to current rules.
- Payments list/get/update/delete/purge are center scoped; teacher payment views require the separate payment access and only show owned students.
- Receipt and transaction references reject duplicates if the database enforces uniqueness.
- Debt totals and status changes reconcile with partial/full payment rules and exclude deleted payments.
- Teacher salary percentage and finance summaries handle zero revenue, missing percentage, date ranges, center scope, and rounding.
- Refund creation cannot exceed the original eligible payment, state transitions are valid, and processed refunds affect summaries once.
- Invoice totals equal item totals/discounts, and payment plan installment status/date calculations handle overdue boundaries.

### Flow H: online test lifecycle — P0

- Test creation normalizes booleans/JSON, type, timing, attempts, privacy, creator, center, questions, and reading passages in one transaction.
- A failed nested question/passage insert rolls back the test.
- Test visibility covers owner, center admin, creating teacher, non-creating teacher, assigned class/student, privacy flags, other center, and student.
- Question/passages CRUD stays within the parent test's center and preserves order, options, answer key, points, and passage links.
- Assignment validates student/class membership in the center, avoids duplicate assignments, and records actor/IP metadata where used.
- Start rejects unassigned/unavailable tests, exceeded attempts, too-early/expired windows, and another student's identity; success creates one in-progress submission with timing metadata.
- Repeated start follows the intended resume/new-attempt rule and never creates accidental duplicate active attempts.
- Submit validates submission ownership/status/deadline, accepts only questions in the test, saves answers atomically, auto-grades objective types, calculates earned/possible totals, and changes status once.
- Manual grading is restricted to an authorized teacher/admin, validates scores against question points, recomputes final totals/summary, and is idempotent.
- Results/submission detail redact answer keys or private data from students until allowed and stay center/teacher scoped.

### Flow I: portals, reports, and secondary modules — P1/P2

- Student dashboard composes only the authenticated student's attendance, grades, debts, payments, class, teacher, subjects, tests, assignments, room, and schedule. A failing optional section returns its safe fallback without corrupting other sections.
- Teacher portal endpoints include only assigned classes/students and correctly aggregate attendance, grades, assignments, tests, and payment access.
- Overview/payment/attendance/retention reports honor center and inclusive date filters, aggregate statuses correctly, use stable UTC month keys, and calculate intake/churn groupings by source/teacher/class.
- Notifications list only the actor's records; read/delete ownership and superuser creation are enforced.
- Saved filters are private to actor and center; malformed filter JSON is rejected.
- Global search honors actor scope, entity filter, query length, pagination, and soft deletion.
- CSV import validates entity allowlists, headers, row errors, center injection, partial/all-or-nothing behavior, and formula/CSV injection safety on export.
- Translation reads are public; writes require superuser; bulk upsert is transactional and language/key uniqueness is maintained.
- Telegram registration list/convert/reject is scoped and state-transition safe; conversion is idempotent and creates one student.
- Request logging records status/duration/failure after response completion, redacts authorization/password/token data, truncates large bodies, and leaves the API operational when MongoDB is unavailable.
- Health remains public. Stats require superuser; database inspection, reset, and redeploy require owner and validate table/operation allowlists.

## 5. Frontend unit and component tests (`ui/`)

### Flow A: login, persistence, and route protection — P0

- Each login page submits to the correct actor endpoint, shows validation/server errors, disables duplicate submission, and redirects to the actor's landing page.
- Remember-me stores credentials in `localStorage`; session mode uses `sessionStorage`; logging out clears token, user, active center, Redux-persisted auth, and payment access.
- Auth initialization handles valid state, malformed user JSON, missing token/user half-state, and expired/unauthorized API responses.
- `ProtectedRoute` covers uninitialized, anonymous, wrong user type, required/excluded role, missing permission, owner redirect, and successful rendering.
- Owner startup selects a valid stored center or the first returned center and emits/refetches on `active-center-changed`; ordinary admins cannot change scope.
- Axios attaches bearer and active-center metadata correctly, avoids double `/api`, handles `401` logout, `423` frozen state, and service-unavailable behavior.

### Flow B: student creation and management — P0

- Student form renders identity, contact, school, class/teacher, status/freeze, acquisition, credentials, and discount fields according to role.
- Required fields and date/number/select validation prevent submission and focus/show the relevant error.
- Selecting class/teacher options uses normalized IDs and resets stale dependent choices when center changes.
- Discount toggle and kind/type controls calculate the preview correctly and serialize the intended API payload.
- Create submits once, shows success, navigates to the list/detail, and the new row is visible after cache/Redux refresh.
- Duplicate username/enrollment errors remain on the form and preserve entered values.
- Edit hydrates all supported fields, sends intended changes, and does not overwrite omitted values.
- Student filters, pagination, selection, view modes, statistics, and empty/error/loading states work together without stale rows.
- Transfer dialog excludes the current class, reports backend errors, refreshes both class/student views, and shows prior-class history.
- Freeze, delete, restore, and purge confirmations call the correct endpoints; teacher UI never exposes prohibited controls.

### Flow C: class/session lesson workflow — P0

- Class form validates teacher, schedule days/time/end time, capacity, price, room, and date range.
- Calendar renders generated sessions on correct local dates and distinguishes planned/completed/deleted states.
- Session workflow loads current and transferred students correctly and filters deleted records as intended.
- Action selection controls which attendance/homework/activity/points/coins fields contribute to the request.
- Completion counts and “mark all” operations remain accurate after individual edits.
- Manual points clamp to `0..100`; status-to-score mapping and total calculation use fetched settings.
- Only one stellar student can be selected; removing the coins action removes the stellar bonus from the payload.
- Drafts are isolated by session, survive navigation/reload as intended, and only the successfully saved draft is cleared.
- Submit loading/error/retry prevents duplicate writes and retains the draft after failure.

### Flow D: payments and finance — P0

- Payment form creates stable defaults/references and serializes both status field names consistently.
- Student selection loads price and active discount; fixed/percent previews and partial/full completion are correct.
- Changing student or center clears stale discount/payment data.
- Successful create refreshes payment history, student balance/debt, finance summaries, and discount state.
- Teacher finance is blocked until payment credentials succeed; expired/failed payment token relocks the view.
- Payment filters, pagination, grouping, receipt details, edit/delete, and empty/error states are covered.
- Owner finance charts and reports render zero, large, decimal, and missing-series data without `NaN` or misleading totals.

### Flow E: online tests — P0

- Authoring form changes relevant fields by test type, validates timing/points/options/correct answers, links passages, supports reorder, and preserves drafts on server error.
- Assignment UI validates class/student target and shows existing assignments without duplicates.
- Student assigned-tests page differentiates upcoming, available, in-progress, submitted, and graded states.
- Taking a test renders each question type, saves local answers/navigation state, displays timer, warns near expiry, auto-submits once, and handles refresh/resume.
- Submission blocks unanswered/invalid answers only according to product rules and shows a confirmation summary.
- Grade page distinguishes auto-graded and manual questions, constrains awarded points, and refreshes the final summary.
- Student results hide restricted answer keys and show totals/feedback only when allowed.

### Flow F: remaining page behavior — P1/P2

- Teacher portal tabs request/render only their domain data and preserve selection while switching tabs.
- Student portal handles partially unavailable dashboard sections, frozen banner/read-only controls, schedule dates, payment history, grades, attendance, tests, and profile dialog.
- Rooms/slots calendar tests overlap visualization, generation form, availability, booking, cancellation, timezone, and responsive views.
- Dashboard/report filters refetch consistently and charts/totals share the same filtered data.
- Archive, retention, Telegram registrations, translations, settings/sidebar order, engineering, request logs, notifications, saved filters, and search each cover loading, empty, success, permission, and server-error states.
- Common dialogs have accessible names, focus trapping/restoration, Escape behavior, and keyboard-submit rules; tables/forms meet label and keyboard navigation basics.
- Language and theme changes update visible content without losing route or form state.

## 6. API integration tests (Express + PostgreSQL)

These tests should exercise middleware, validation, controller, service, repository, transactions, and real constraints together. Export app construction separately from `listen()` so Supertest can mount it without starting a production server.

### Integration flow 1: actor and center isolation — P0

1. Seed two centers, an owner, two admins, two teachers, and students/classes in each center.
2. Log each actor in through the real endpoint.
3. Verify missing/invalid/expired token responses.
4. Verify each admin sees only their center and cannot override the center header/query.
5. Verify owner can select either center but a center-required mutation fails without a concrete center.
6. Verify each teacher sees only assigned class/student records.
7. Guess IDs from the other center for every representative GET/PUT/DELETE and expect `404` or `403` without leakage.
8. Verify a frozen student can read their portal and cannot perform a representative write.

### Integration flow 2: student onboarding to portal login — P0

1. Admin logs in and creates a student with credentials, class/teacher, acquisition source, and monthly discount.
2. Assert the database has a hashed password, forced center, correct relationships, and exactly one active discount.
3. Fetch/filter the list and detail; verify no hash is returned.
4. Attempt duplicate username and enrollment; expect `409` and no extra rows.
5. Log in as the student and fetch portal dashboard; assert only their data.
6. Change password, reject the old password, and accept the new one.
7. Freeze the student; verify reads work and writes return `423`; unfreeze and verify restoration.

### Integration flow 3: student transfer and archive lifecycle — P0

1. Create two classes in one center and one in another.
2. Transfer the student to the second same-center class.
3. Assert active `class_id`, `previous_class_id`, historical class listing, and teacher visibility.
4. Reject same-class and other-center transfers without mutation.
5. Soft-delete the student; assert normal queries/login exclude them and archive includes them.
6. Restore and verify login/list membership returns.
7. Soft-delete again; verify unauthorized purge is denied and restricted owner purge handles dependencies predictably.

### Integration flow 4: class schedule to completed lesson — P0

1. Admin creates teacher, room, class schedule, bounded dates, and enrolled students.
2. Generate a month of sessions; query PostgreSQL for exact dates/times.
3. Generate again and assert no duplicates plus correct skipped count.
4. Teacher logs in, opens an assigned session, and bulk-submits attendance/scores/points with one stellar student.
5. Assert one attendance and grade per student plus the correct balance/source coin transaction.
6. Re-submit corrected values; assert rows are updated, not duplicated, and balance changes by the delta.
7. Force a database error on one record and assert the whole lesson transaction rolls back.
8. Verify student portal and reports reflect the committed lesson.

### Integration flow 5: discount, payment, debt, and reporting — P0

1. Create student price/debt and active monthly discount.
2. Create a partial payment and assert snapshot calculations and incomplete state.
3. Assert payment insert and monthly-discount deactivation committed together.
4. Retry with the same reference and assert duplicate protection/no double accounting.
5. Complete payment, verify debt/finance aggregates, student history, and teacher scoped view.
6. Create/process a valid refund and reject an excessive/duplicate refund.
7. Verify overview/payment reports for inclusive date edges and other-center exclusion.

### Integration flow 6: online test from authoring to result — P0

1. Teacher/admin creates a test with passage, objective question, manual question, timing, and privacy rules.
2. Assign it to a same-center class/student; reject another-center assignment.
3. Student logs in, lists assignment, starts once, and resumes the same in-progress attempt.
4. Submit answers; assert objective auto-score, pending manual score, status, timestamps, and summary.
5. Teacher grades the manual answer; assert bounded score and recomputed final result.
6. Student fetches result with correct answer-key redaction.
7. Verify unrelated teacher/student and other center cannot fetch submission/result.

### Integration flow 7: room booking conflict — P1

1. Create room and generate slots across a date range.
2. Book a slot for a class and verify it disappears from availability.
3. Attempt duplicate/overlapping and cross-center bookings; expect conflict/not found.
4. Cancel booking and verify availability returns.

### Integration flow 8: import, archive, audit, and request logs — P1

1. Import a small valid CSV into a selected center and assert created rows/audit record.
2. Import invalid/malicious rows and assert documented row errors, no center override, and transaction policy.
3. Export and verify headers, scoping, escaping, and soft-delete behavior.
4. Perform create/update/delete/restore actions and verify audit entries.
5. With Mongo available, assert request status/duration and redaction; with Mongo unavailable, assert the main request still succeeds.

## 7. End-to-end browser flows (Playwright)

Each flow is a single business journey, not a collection of disconnected page checks. Seed through an isolated setup API/database fixture; perform the behavior itself through the browser unless the step is only prerequisite data.

### E2E 1: student creation flow — P0

1. Open the app as a logged-out user and navigate to the superuser login.
2. Enter valid center-admin credentials and submit.
3. Verify redirect to `/dashboard`, correct user identity, and correct active center.
4. Open **Students** from navigation and verify the list is scoped to that center.
5. Click **Add student** and reach `/students/new`.
6. Fill identity, enrollment, contact, school, class, teacher, acquisition source, username, and password.
7. Enable a discount, choose monthly/serial and fixed/percent values, and verify the preview.
8. Submit and verify loading prevents a double click.
9. Verify success feedback and navigation to list/detail.
10. Search by enrollment/username and assert exactly one new student with the chosen class/teacher/status.
11. Open the detail page and verify every saved field and discount summary.
12. Log out, log in through `/login/student` with the new credentials, and verify redirect to `/student-portal` with the same identity/class.

Variants: required-field error, duplicate username, duplicate enrollment, server error preserving data, teacher-created student with no freeze/teacher-reassignment controls, and owner changing active center before creation.

### E2E 2: class creation and student enrollment flow — P0

1. Log in as center admin.
2. Create a teacher and a room, then verify both appear in their lists.
3. Create a class with teacher, room, capacity, price, weekdays, start/end time, and date range.
4. Generate sessions for the current fixture month and verify only scheduled bounded dates appear in calendar.
5. Create or edit a student into the class.
6. Open class detail and verify teacher, room, price, session calendar, and enrolled student.
7. Log in as the teacher and verify the class/student appears in the teacher portal.

### E2E 3: daily lesson completion flow — P0

1. Log in as an assigned teacher.
2. Open **My classes**, select a class, and open today's seeded session.
3. Select attendance, homework, activity, points, and coins actions.
4. Mark every student's attendance and scores; verify completion counters.
5. Enter boundary manual points and select exactly one stellar student.
6. Save the lesson and verify success plus cleared session draft.
7. Reopen the session and verify saved values.
8. Correct one score and save again.
9. Log in as that student and verify attendance, grade/points, and coin balance changed once by the corrected amount.
10. Log in as admin and verify the same data in class/student statistics.

Variants: incomplete markings, attempted second stellar student, failed save retaining draft, frozen student still receiving teacher-recorded data, and transferred student historical visibility.

### E2E 4: payment with discount flow — P0

1. Log in as admin and open a student with an active monthly discount.
2. Navigate to **Payments** and start a new payment.
3. Select the student; verify original tuition and discount are loaded.
4. Enter a partial amount/method/date and verify final amount and incomplete state.
5. Submit and verify receipt/history contains the immutable original, discount, and final values.
6. Start another payment and verify the consumed monthly discount is no longer automatically offered.
7. Complete the remaining payment and verify debt and dashboard/report totals.
8. Log in as the student and verify payment history.
9. Log in as teacher, unlock payment access with payment credentials, and verify only owned-student payments are visible.

### E2E 5: student transfer, freeze, archive, restore flow — P0

1. Log in as admin and open an active student's detail page.
2. Transfer from class A to class B and verify confirmation.
3. Verify class B shows active membership and class A retains transferred/history presentation.
4. Log in as the relevant teachers and verify ownership changes.
5. Freeze the student; log in as the student and verify read-only banner and blocked write behavior.
6. Unfreeze, then soft-delete the student with confirmation.
7. Verify disappearance from normal list and presence in **Archive**.
8. Restore and verify the student reappears with class/history intact and can log in.

### E2E 6: online test lifecycle — P0

1. Log in as teacher/admin and open **Tests**.
2. Create a timed test containing a reading passage, an objective question, and a manually graded question.
3. Preview/detail-check the saved test and assign it to a class/student.
4. Log out and log in as the assigned student.
5. Open assigned tests, start the available test, answer both questions, navigate between them, and verify answer persistence/timer.
6. Submit after confirmation and verify objective result plus pending manual grading state.
7. Log in as the assigned teacher, open submissions, and grade the manual answer.
8. Verify the computed total and feedback.
9. Log back in as the student and verify final score/feedback with answer-key privacy respected.

Variants: unassigned student, early/expired availability, refresh/resume, timer auto-submit, attempt limit, unanswered question, score above max, and unrelated teacher access.

### E2E 7: room slot and booking flow — P1

1. Log in as admin and create a room.
2. Generate slots for selected weekdays/date range.
3. Inspect calendar dates/times and book a slot for a class.
4. Verify booked styling/details and absence from available choices.
5. Attempt a conflicting booking and verify a clear error without duplicate entry.
6. Cancel the booking and verify availability returns.

### E2E 8: owner multi-center reporting flow — P1

1. Log in as owner and verify redirect to owner management.
2. Select center A and verify student/teacher/finance/attendance totals match its seeded data.
3. Change to center B and verify every panel refetches and no center-A identity remains.
4. Apply date/source/teacher/class filters to reports and verify charts, tables, and totals agree.
5. Refresh and verify valid active-center persistence.
6. Attempt an owner-only engineering database view as admin and verify denial; verify owner access.

### E2E 9: CSV import to managed student flow — P1

1. Log in as admin and open import UI if exposed by the application.
2. Upload a valid student CSV and review mapping/preview.
3. Submit and verify success/error counts.
4. Find the imported student in the scoped list and edit missing fields.
5. Export students and verify the new record appears with correct escaping.
6. Upload a file with invalid and cross-center fields and verify safe row errors and no leaked/created records.

### E2E 10: service failure and recovery flow — P1

1. Log in and open a data page.
2. Make the test environment return health/API failure.
3. Verify the service-unavailable experience appears, current auth is not corrupted, and destructive controls cannot be used.
4. Restore the service and trigger retry/recovery.
5. Verify return to the intended route with freshly loaded data and no duplicate mutation.

## 8. Non-functional suites

### Security — P0

- Run an authorization matrix against representative endpoints for all actors, permissions, centers, ownership states, and HTTP methods.
- Test ID guessing, center-header tampering, mass assignment (`center_id`, role, permissions, hashes, freeze, teacher ownership), SQL-like search text, CSV formula injection, oversized JSON, malformed JSON, and unsafe system table/redeploy inputs.
- Assert logs, API responses, Redux state snapshots, and browser storage never expose password hashes, raw passwords, registration secrets, full authorization headers, or payment credentials.
- Verify CORS and production JWT secret configuration are explicit; the development fallback secret must cause a production configuration test failure.

### Reliability and concurrency — P0/P1

- Concurrent payment submissions with the same reference create one payment and consume a monthly discount once.
- Concurrent monthly session generation creates no duplicate sessions.
- Concurrent lesson saves do not double-award coins and result in one grade/attendance per student/session.
- Concurrent test start/submit calls respect attempt limits and terminal status.
- Concurrent room bookings yield one winner and one conflict.
- Database/Mongo transient failures either roll back atomic workflows or degrade only the optional logging feature.

### Performance — P1

- Measure paginated students/payments/search at realistic center sizes and ensure query count does not grow per row.
- Bulk lesson save, test authoring/submission, CSV import, dashboard, and retention reports get explicit response-time budgets.
- React list pages should remain responsive with realistic pages, avoid repeated identical fetches, and lazy-load large routes.

### Accessibility and responsive behavior — P1

- Automated `axe` checks on login, dashboard, student form/detail, class lesson workflow, payment form, test authoring/taking/grading, and dialogs.
- Keyboard-only create/edit/submit journeys, visible focus, labels/error associations, modal focus restoration, table alternatives, chart summaries, and color-independent status cues.
- E2E smoke viewports for desktop and common mobile/tablet sizes used by teachers/students.

## 9. Fixture design

Maintain a small named fixture graph:

- owner `owner_main`;
- center A and center B;
- admin with all permissions, admin with limited permissions;
- teacher A1 with payment access, teacher A2 without it, teacher B1;
- active, inactive, frozen, transferred, discounted, indebted, and archived students;
- scheduled class with past/today/future sessions and a second transfer target class;
- room with free/booked slots;
- serial-discount and monthly-discount students;
- public/private/assigned/unassigned/timed tests with objective/manual questions.

Factories should return both database IDs and login identities. Test data must use fixed dates relative to a shared test clock; avoid relying on the actual current month. Passwords and secrets must be test-only.

## 10. Implementation order and quality gates

### Phase 1: P0 safety net

1. Refactor Express bootstrap to export `app` without listening and add Supertest/PostgreSQL integration infrastructure.
2. Add auth/tenant/permission/frozen-account unit and integration matrices.
3. Add student onboarding/transfer/archive, payment/discount, lesson transaction/coins, and online-test lifecycle integration suites.
4. Add React component tests for protected routing, student form, lesson workflow, payment form, and test-taking timer/state.
5. Add Playwright and implement E2E 1, 3, 4, and 6.

### Phase 2: P1 business breadth

Add class/room booking, owner reporting, teacher/student portals, import/export, service recovery, accessibility, and concurrency suites.

### Phase 3: P2 supporting modules

Complete notifications, saved filters, translations, request logs, Telegram views, engineering tooling, and lower-risk CRUD matrices.

Suggested pull-request gates:

- every changed service/controller/repository has unit coverage for new branches;
- every changed API workflow has at least one real-database integration case;
- every changed P0 user journey has a Playwright happy path and important denial/error path;
- backend Jest, frontend Vitest, TypeScript builds, lint, integration tests, and P0 E2E all pass;
- no blanket coverage percentage should replace flow coverage, but track line/branch trends and prevent decreases in changed modules.

## 11. Existing coverage and immediate gaps

Existing backend tests cover selected class, student, teacher, and payment controllers/services/repositories plus shared tenant/controller helpers and several Drizzle repositories. Existing frontend tests cover pagination, API response/URL helpers, student identity, session workflow calculations/drafts, lesson points, and toast errors.

The most urgent uncovered areas are:

1. real Express + PostgreSQL integration tests;
2. auth middleware, RBAC, owner/center isolation, and frozen-student enforcement;
3. transactional bulk lesson save and coin correction/rollback;
4. the complete online-test lifecycle;
5. React page/component interactions for all major forms and portals;
6. browser E2E infrastructure and flow tests;
7. concurrency cases around payments, sessions, lesson coins, test attempts, and room bookings.

