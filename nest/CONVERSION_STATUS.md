# Nest Conversion Status

This Nest backend is side-by-side with `service/`. The Express backend is untouched.

## Database Layer

- Drizzle is wired globally through `DRIZZLE_DB`.
- Runtime Nest repositories/services use Drizzle query builders such as `db.select().from(...)`, `db.insert(...)`, `db.update(...)`, and `db.transaction(...)`.
- Drizzle table definitions live in `src/database/schema.ts`.
- `PG_POOL` remains only as the low-level Postgres connection used to initialize Drizzle and close the pool on shutdown.
- `npm run build` passes.

## Fully Converted First

These modules have real Nest controllers/application services/repositories instead of generic shell behavior:

- `students`
- `discounts`
- `payments`
- `settings`
- `translations`
- `saved-filters`
- `notifications`
- `audit-logs`
- `centers`
- `reports`
- `rooms`
- `refunds`
- `subjects`

## Structure Present, Needs Endpoint-Specific Logic

These modules already exist in DDD/layered folders and compile, but still need their Express-specific behavior ported endpoint by endpoint:

- `archive`
- `assignments`
- `attendance`
- `classes`
- `debts`
- `grades`
- `import-export`
- `invoices`
- `owners`
- `parents`
- `payment-plans`
- `portal`
- `room-slots`
- `search`
- `sessions`
- `superusers`
- `system`
- `teachers`
- `telegram-registrations`
- `telegram-students`
- `tests`

## Verification

- `npm run build` passes in `nest/`.
