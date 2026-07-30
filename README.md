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

## Automated backups

The project includes `scripts/backup.sh` for scheduled database backups.

It backs up:
- full PostgreSQL CRM data with `pg_dump`
- readable CSV exports for every public PostgreSQL table
- MongoDB request logs with `mongodump` when Mongo is available
- optional S3 upload via `BACKUP_S3_URI`
- optional Telegram bot upload via `BACKUP_TELEGRAM_BOT_TOKEN` and `BACKUP_TELEGRAM_CHAT_ID`
- local retention cleanup via `BACKUP_RETENTION_DAYS`

Configure these in `service/.env`:

```bash
BACKUP_DIR=/home/ubuntu/rmc-backups
BACKUP_CRON_SCHEDULE="0 * * * *"
BACKUP_LOG_FILE=/var/log/rmc-backup.log
BACKUP_RETENTION_DAYS=14
BACKUP_S3_URI=s3://your-rmc-backups/prod
BACKUP_MONGO=true
BACKUP_EXPORT_POSTGRES_TABLES=true
BACKUP_TELEGRAM_BOT_TOKEN=123456789:AA...
BACKUP_TELEGRAM_CHAT_ID=-1001234567890
BACKUP_TELEGRAM_CAPTION=RMC automated backup
```

For Telegram backups, add the bot to the target chat/channel first, then set the chat ID. The script sends one compressed archive for the whole backup run. Inside the archive, `postgres_*.dump` is the restore-ready full database backup and `postgres_tables/*.csv` contains readable exports for tables such as students, teachers, classes, payments, discounts, attendance, grades, and the rest of the public schema.

Run once manually:

```bash
npm run backup
```

Install hourly cron:

```bash
npm run backup:install-cron
```

Equivalent manual cron entry:

```bash
0 * * * * cd /path/to/RMC && /bin/sh scripts/backup.sh >> /var/log/rmc-backup.log 2>&1
```

Restore PostgreSQL:

```bash
pg_restore --clean --if-exists -d "$DB_NAME" /path/to/postgres_crm_db_YYYYMMDD_HHMMSS.dump
```

Restore MongoDB logs:

```bash
mongorestore --uri "$MONGO_URI" --archive=/path/to/mongo_crm_logs_YYYYMMDD_HHMMSS.archive.gz --gzip
```
