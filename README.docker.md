# Docker (Full Stack)

## Local development: main vs develop

The dev commands decide by the branch you are on:

| Command | On `main` | On `develop` / any other branch |
|---|---|---|
| `npm run dev`, `dev:ui` | as before: UI against the production API (`ui/.env`) | UI against the local backend |
| `npm run dev:backend` | as before: backend with `service/.env` | local databases + backend on :4000 |
| `npm run dev:full` | as before | everything local |
| `npm run dev:local` | everything local | everything local |

`npm run dev` inside `ui/` follows the same rule (see `ui/vite.config.ts`). `vite build` and the
production deploy are never affected. `npm run dev:local:stop` stops the local databases (data
is kept).

- Databases come from `docker-compose.local.yml`: Postgres on `127.0.0.1:5434`, Mongo on
  `127.0.0.1:27018` (off the default ports so other projects can keep 5432/27017). They use
  the existing `rmc_postgres_data` / `rmc_mongo_data` volumes.
- `scripts/local-env.sh` holds the local settings and sets them as environment variables, so
  `service/.env` and `ui/.env*` stay as they are.
- Telegram, backups to the Telegram group, the Google Sheets export and the Engineering
  redeploy button are switched off locally. The bot and backup containers are not started, and
  `npm run dev:bot` is not local: it would use the production bot token.
- Never run `docker compose down -v` on these volumes.


This repo can run **backend + PostgreSQL + MongoDB + Telegram bot** fully in Docker.

## Run

From the repo root:

```bash
docker compose up -d --build
```

To start the Telegram bot, provide your BotFather token:

```bash
TELEGRAM_BOT_TOKEN=123456:your-token docker compose up -d --build
```

Or create `bot/.env` from `bot/.env.example` and run the normal command:

```bash
cp bot/.env.example bot/.env
docker compose up -d --build
```

If port `4000` is unavailable on your machine, override the host port:

```bash
BACKEND_PORT=4001 docker compose up -d --build
```

Services:
- Backend: `http://localhost:${BACKEND_PORT:-4000}`
- Postgres: `localhost:5432`
- Mongo: `localhost:27017`
- Telegram bot: `crm_telegram_bot` container
- Nightly backup worker: `crm_backup` container
- Drizzle Studio: `crm_drizzle_studio` container, server-only on `127.0.0.1:4983`

The backup worker runs every day at 00:00 in `Asia/Tashkent` by default, stores
archives in the persistent `backup_data` volume, and uploads the archive to the
configured Telegram group when `BACKUP_TELEGRAM_BOT_TOKEN` and
`BACKUP_TELEGRAM_CHAT_ID` are set in `service/.env`. The owner can also start a
run from **Engineering → Backup → Run backup now**. Set `BACKUP_TIMEZONE`,
`BACKUP_HOUR`, and `BACKUP_MINUTE` to change the schedule.

For the complete backup workflow, environment configuration, Google Sheets
integration, Telegram group setup, verification, and troubleshooting, see
`docs/backup_important/README.md`.

PostgreSQL schema is auto-initialized from `service/db/schema/` on first start (stored in the `postgres_data` volume).

## Drizzle Studio (database browser)

The `drizzle-studio` container starts with the stack. It listens only on the
server itself (`127.0.0.1:4983`), so it is never reachable from the internet and
needs no extra AWS security group rule. Anyone who reaches it can read and edit
every table, so keep it that way.

By default it uses the stack's own Postgres. To point it at another database,
put the login in a `.env` file next to `docker-compose.yml` on the server:

```bash
STUDIO_DB_HOST=postgres
STUDIO_DB_PORT=5432
STUDIO_DB_USER=crm_user
STUDIO_DB_PASSWORD=your-password
STUDIO_DB_NAME=crm_db
```

Then restart it with `docker compose up -d drizzle-studio`.

To open it, start an SSH tunnel from your own computer and keep it open:

```bash
ssh -N -L 4983:127.0.0.1:4983 ec2-user@YOUR-SERVER
```

Then open **Engineering → Drizzle Studio** in the owner dashboard (or visit
https://local.drizzle.studio) in Chrome or Firefox. Safari blocks the connection
to `localhost`. Full guide: `docs/owner/nested_docs/dzs.html`.

## Logs (Mongo request logs)

```bash
docker exec -it crm_mongo mongosh "mongodb://localhost:27017/crm_logs"
```

Then:

```js
db.request_logs.find().sort({ ts: -1 }).limit(20).pretty()
```

## Stop

```bash
docker compose down
```

To also remove DB data volumes:

```bash
docker compose down -v
```
