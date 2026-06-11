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

If port `4000` is unavailable on your machine, override the host port:

```bash
BACKEND_PORT=4001 docker compose up -d --build
```

Services:
- Backend: `http://localhost:${BACKEND_PORT:-4000}`
- Postgres: `localhost:5432`
- Mongo: `localhost:27017`
- Telegram bot: `crm_telegram_bot` container

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
