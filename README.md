# RMC (Local, no Docker)

This repo can run **without Docker**. You just need local installs of:
- Node.js (for `service/` + `ui/`)
- PostgreSQL (required)
- MongoDB (optional; only used for request logging)

## 1) Configure environment

Backend reads env vars from `service/.env` (already in the repo). Adjust as needed:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `MONGO_URI`, `MONGO_DB` (optional)

## 2) Install dependencies

```bash
cd . && npm install
cd service && npm install
cd ../ui && npm install
```

## 3) Run

In two terminals:

```bash
cd service && npm run dev
```

```bash
cd ui && npm run dev
```

Backend listens on `PORT` from `service/.env` (defaults to `4000` if unset).

Or from the repo root:

```bash
npm run dev
```

## Database auto-create + migrations

On backend startup, Postgres is bootstrapped automatically:
- Creates the database (if missing)
- Runs all Sequelize migrations in `service/db/migrations`

Control flags (all optional):
- `AUTO_CREATE_DB` (default: `true`)
- `AUTO_MIGRATE` (default: `true`)
- `DB_ADMIN_USER`, `DB_ADMIN_PASSWORD`, `DB_ADMIN_DB` (defaults to `DB_USER/DB_PASSWORD` and `postgres`)

For Docker-based setup, see `README.docker.md`.
