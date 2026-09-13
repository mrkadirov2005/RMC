# TODO — Pending Owner Actions

Things that are built and waiting on you, not on me. Ping me when you've done one and I'll wire it in.

## Backups

- [ ] **Hosted Postgres mirror.** Create a free Neon or Supabase project, grab its connection string, give it to me. I'll set `BACKUP_REMOTE_POSTGRES_URL` in `service/.env` on the server. Nightly backup will then `pg_dump | psql --clean --if-exists` a full replace into it — a live queryable copy, not just a file.
- [ ] **Google Sheets export.** Create a Google Cloud service account, enable the Sheets API, share your target spreadsheet with the service account's email as Editor, send me the service account JSON key + spreadsheet ID/URL. I'll place the key on the server and set `GOOGLE_SHEETS_SERVICE_ACCOUNT_FILE` + `GOOGLE_SHEETS_SPREADSHEET_ID`. Pushes `students, teachers, classes, payments, invoices, debts, attendance, teacher_salaries` as formatted tabs nightly, plus a Summary tab — table list is configurable via `GOOGLE_SHEETS_TABLES`.

## Security cleanup (flagged, not yet actioned)

- [ ] `service/.env` and a few other env files (`.env.save`, `.env_back`, `ui/.env`, `ui/.env.development`) are committed in this **public** GitHub repo and may contain real secrets (DB password, JWT signing key, Telegram bot token). Needs: rotate anything real, remove from git history, add to `.gitignore`.
- [ ] MongoDB (`crm_mongo`) is running with zero authentication on a port bound to the host (27017). Needs auth enabled or the port unbound from the public interface.
- [ ] ~70 orphaned/anonymous Docker volumes from old `docker compose` project names (`service_*`) sitting on the server — harmless but worth `docker volume prune` at some point.

## Reference

Full backup plan/rationale: `docs/backup-plan.md`. Backup script: `scripts/backup.sh`. Cron installer: `scripts/install-backup-cron.sh` (nightly 3am, already installed on the server).
