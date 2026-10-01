# Xayrullo — Code Refactor TOD (1 week)

**Repo:** `RMC` (EduCRM). Node/Express backend (`service/`) + React/Vite frontend (`ui/`). Bot in `bot/`.

**Focus:** Layered architecture, DDD, Drizzle schema migration, frontend feature-based cleanup (no business logic in UI).

---

## 1. Current state (baseline audit)

### Backend `service/src/`

- **Two ORMs coexist.** `drizzle-orm@0.38` + `sequelize@6.37`. Drizzle schema (`db/schema.ts`) only covers **7 tables** (app_settings, translations, saved_filters, notifications, teacher_payment_credentials, rooms, classes). Everything else = raw `pool.query` (`pg`) — **230+ raw SQL calls** across 28 repository files.
- **Module layering exists** (`modules/<name>/{controllers,repositories,services}`), but:
  - Controllers use `.ts` extension but body is CommonJS (`const pool = require(...)`) — no real typing.
  - Some modules only have controllers, no services (e.g. `archive`, `discounts`, `refunds`, `saved_filters`).
  - `services/BaseService.ts` (abstract class) exists but is barely extended — most modules skip it.
- **Two service directories.** `service/src/services/` (BaseService, StudentService) and `service/src/modules/<n>/services/` — duplication / unclear which is canonical.
- **No DDD.** No domain entities, no value objects, no aggregate roots. Business rules (money rounding, transfer allocation, day-prorated billing) live inline in repositories (e.g. `student.repository.ts:7 buildTransferAllocation`).
- **No test coverage.** One `.test.js` file in `students/services/tests/`. Jest configured but unused.
- **Sequelize migrations run separately from Drizzle** (`sequelize-cli db:migrate` in package.json). Schema drift risk.

### Frontend `ui/src/`

- **Feature-based structure exists** under `features/crm/<domain>/` with per-domain `hooks/`, `components/`, `types.ts`.
- **`*Old.tsx` files left behind** after the payments/grades/attendance split — 3 files, ~2500 lines of dead code:
  - `payments/PaymentsPageOld.tsx` (899 lines)
  - `grades/GradesPageOld.tsx` (887 lines)
  - `attendance/AttendancePageOld.tsx` (801 lines)
- **Business logic in UI components.** Direct `fetch()` calls bypassing the api client / slice pattern:
  - `rooms/components/RoomSlotsCalendar.tsx:60` — `fetch('/api/classes?...')`
  - `rooms/components/RoomSlotsGenerator.tsx:96` — `fetch('/api/room-slots/slots/generate', ...)`
- **Money math in components** (e.g. proration, discount kind handling in `usePaymentsPage` `handleSubmit` computes final_amount inline — should be a domain helper).
- **`shared/` folder is thin** — only `api/`, `auth/`, `dataCsv.ts`, `studentIdentity.ts`. Utils scattered under `utils/`, `lib/`.
- **`utils/` = grab bag.** `helpers.ts`, `dropdownOptions.ts` — no clear domain boundary.
- **No dedicated `types/` per feature** consistently; some features have `types.ts`, some don't.

### Cross-cutting

- **No architecture doc.** No `ARCHITECTURE.md`, no ADRs.
- **`FEATURES.md`, `README.md` short**, don't describe layering rules.

---

## 2. Deliverables (week plan)

### Day 1–2 — Layered Architecture (backend)

**Goal:** every module respects `Controller → Service → Repository → DB`. No shortcuts.

- [ ] **Audit every module** — grep for `pool.query` in `controllers/*.ts` and `services/*.ts`. Move all raw SQL down to `repositories/`.
- [ ] **Delete `service/src/services/`** (top-level). Merge `BaseService` into `shared/` if still useful, otherwise drop it — `abstract BaseService` with one field is scaffolding.
- [ ] **Fill missing service layers.** Every module needs `services/<n>.service.ts` even if it currently just forwards to the repository — this is where domain logic will land.
- [ ] **Convert repositories to real TypeScript.** Remove `const pool = require(...)` → `import { pool } from '../../../db/pool'`. Add return types.
- [ ] **One controller per resource.** `student.controller.ts` currently mixes list/create/transfer/coins — split by use case or keep single file but factor handlers as thin `(req,res) => service.doThing(req.body)`.
- [ ] **Document the contract** in `service/ARCHITECTURE.md`:
  - Controller: HTTP parsing + validation only.
  - Service: business rules, orchestrates repositories.
  - Repository: SQL only.
  - Never skip a layer.

### Day 2–3 — DDD (Domain-Driven Design)

**Goal:** extract domain entities and business rules out of repositories.

- [ ] **Identify aggregates.** From the schema: `Student`, `Class`, `Payment`, `Grade`, `Attendance`, `Teacher`, `Center`, `RoomSlot`.
- [ ] **Create `service/src/domain/<aggregate>/`** for the top 3 (start with `Payment`, `Student`, `Class` — highest business complexity).
  - `entity.ts` — plain object + factory + invariants.
  - `rules.ts` — pure functions (money math, proration, discount kind, transfer allocation from `student.repository.ts:7`).
  - No I/O in this layer.
- [ ] **Move `buildTransferAllocation`, `roundMoney`, `toDateOnly`** out of `student.repository.ts` into `domain/payment/rules.ts`.
- [ ] **Value objects for money.** `Money { amount: number, currency: 'UZS' }` — hard-code UZS for now since frontend already does.
- [ ] **Services depend on domain.** `payment.service.ts` calls `PaymentRules.applyDiscount(...)` instead of computing inline.
- [ ] **Write one runnable check per rule** (Jest, since it's configured). Assert-based `demo()` at minimum for `buildTransferAllocation` — pure function, easy to test.

### Day 3–4 — Drizzle Schema Update Steps

**Goal:** one ORM. Drizzle owns the schema. Sequelize migrations frozen or removed.

- [ ] **Inventory all tables.** Query `information_schema.tables` on the actual DB → list vs. `schema.ts` (7 tables) → find the delta (~20+ missing).
- [ ] **Generate Drizzle definitions** for all missing tables. Prefer `drizzle-kit introspect:pg` to pull from the DB into a starting file, then hand-clean.
- [ ] **Migration path:**
  1. Introspect current DB → `schema.introspected.ts`.
  2. Diff against `schema.ts` — merge missing tables in.
  3. Add relations (`relations()` from drizzle-orm) so repository joins can be typed.
  4. Snapshot: `drizzle-kit generate` → commit the SQL snapshot to `service/drizzle/`.
- [ ] **Freeze Sequelize.** Move `sequelize-cli` migrations to `service/legacy_migrations/`, remove `npm run migrate` script pointing at it. New migrations only via `drizzle-kit`.
- [ ] **Repositories switch to Drizzle gradually.** Don't rewrite all 28 at once — pick 3 highest-traffic (`students`, `payments`, `classes`), convert those to Drizzle query builder. Leave rest as raw SQL until later cycle. Mark converted files at the top: `// migrated: drizzle`.
- [ ] **Document the steps** in `service/DRIZZLE_MIGRATION.md`:
  1. `drizzle-kit introspect:pg` on new tables.
  2. Merge into `db/schema.ts`.
  3. `drizzle-kit generate` — creates `drizzle/NNNN_*.sql`.
  4. Review SQL, commit.
  5. `drizzle-kit migrate` on the target env.
  6. Repository imports the table object and uses `db.select().from(...)`.

### Day 4–5 — Frontend Feature-Based Architecture

**Goal:** clean layering inside `ui/src/features/crm/<domain>/`. No business logic in UI.

- [ ] **Delete `*Old.tsx` files** — 3 files, ~2500 lines. Recovered via git if ever needed.
- [ ] **Standardize per-domain folder:**
  ```
  features/crm/<domain>/
    <Domain>Page.tsx           # thin orchestrator, < 250 lines
    components/                # dumb view components
    hooks/                     # useDomainPage.ts + smaller hooks
    utils/                     # domain-specific pure helpers
    types.ts                   # local types
    queries.ts                 # (optional) selectors / query helpers
  ```
- [ ] **Kill inline `fetch()` in components.** Route through the axios client + slice thunks:
  - `rooms/components/RoomSlotsCalendar.tsx:60` → move to `slices/classesSlice.ts` (fetchClasses already exists — reuse).
  - `rooms/components/RoomSlotsGenerator.tsx:96` → new `slices/roomSlotsSlice.ts` thunk or extend existing `roomsSlice.ts`.
- [ ] **Extract business math out of UI.**
  - `usePaymentsPage.handleSubmit` discount calc → `features/crm/payments/utils/paymentMath.ts` (pure).
  - Any `.reduce(sum, ...)` totals in components → hooks / utils.
- [ ] **`shared/` cleanup.** Anything used by 2+ features moves to `shared/`. Keep it small — util grab-bags are the anti-pattern.
- [ ] **`utils/` audit.** Split by concern:
  - `utils/format/` — money, date formatters.
  - `utils/dropdownOptions.ts` — keep.
  - Delete anything unused (`command find src -name "*.ts" -exec grep -L helperName {} \;`).
- [ ] **Rule enforced in review:** components render, hooks orchestrate, utils compute. If a component has more than one `.reduce` / `.filter` chain on domain data, that logic belongs in a hook or util.

### Day 5 — Docs + PR

- [ ] `service/ARCHITECTURE.md` — layered rules, DDD boundaries.
- [ ] `service/DRIZZLE_MIGRATION.md` — the 6-step recipe above.
- [ ] `ui/ARCHITECTURE.md` — feature-based rules, no `fetch()` in components, business logic in hooks/utils.
- [ ] One PR per concern (not one giant PR): layered-arch, ddd-extract, drizzle-schema, ui-cleanup. Reviewer can merge independently.

---

## 3. Non-goals (this week)

- Full Drizzle migration of all 28 repositories — do 3, document the pattern, leave the rest.
- Rewriting the frontend router / state management (Redux Toolkit stays).
- Adding a test framework — reuse existing Jest for backend rule checks only.
- Sequelize removal from `node_modules` — freeze it, remove next cycle.

---

## 4. Risk & rollback

- **Two ORMs during transition:** frozen Sequelize migrations still runnable if needed. Drizzle only owns *new* migrations.
- **DDD extraction is pure refactor:** rules moved from repositories to `domain/`, callers updated. If tests pass on `buildTransferAllocation` before/after, correctness preserved.
- **UI `fetch()` removal:** 2 call sites only. Low risk. Confirm rooms page still works in preview.

---

## 5. Success criteria

- Zero `pool.query` in `controllers/*.ts` and `services/*.ts` (grep-checkable).
- Zero `fetch(` / `axios.` in `ui/src/features/crm/*/components/*.tsx` (grep-checkable).
- `db/schema.ts` covers every table the app writes to.
- Three sample domain rules (`buildTransferAllocation`, discount calc, grade percentage) live in `service/src/domain/` with runnable assert-based demos.
- Three docs shipped: two backend, one frontend.
- `*Old.tsx` files gone.
