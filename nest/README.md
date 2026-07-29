# RMC Nest Backend

This folder is a side-by-side NestJS conversion of the current Express backend in `service/`.

The old backend is intentionally untouched.

Converted with richer domain/application logic first:

- `students`
- `discounts`
- `payments`
- shared auth, tenant scope, validation, and database infrastructure

The full Express backend module map is also present under `src/modules` with the same layered structure:

`archive`, `assignments`, `attendance`, `audit-logs`, `centers`, `classes`, `debts`, `grades`, `import-export`, `invoices`, `notifications`, `owners`, `parents`, `payment-plans`, `portal`, `refunds`, `reports`, `rooms`, `room-slots`, `saved-filters`, `search`, `sessions`, `settings`, `subjects`, `superusers`, `system`, `teachers`, `telegram-registrations`, `telegram-students`, `tests`, and `translations`.

Architecture:

- `domain`: entities, value objects, repository ports, domain contracts
- `application`: use cases/application services
- `infrastructure`: Postgres repositories and framework adapters
- `interfaces`: HTTP controllers and DTOs

Run after installing dependencies:

```bash
npm install
npm run start:dev
```

The Nest app defaults to port `5001` so it can run beside the Express service.
