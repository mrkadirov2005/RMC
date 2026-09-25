# Docker (Full Stack)

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
