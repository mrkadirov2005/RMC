# Docker (Full Stack)

This repo can run **backend + PostgreSQL + MongoDB** fully in Docker.

## Run

From the repo root:

```bash
docker compose up -d --build
```

Services:
- Backend: `http://localhost:3000`
- Postgres: `localhost:5432`
- Mongo: `localhost:27017`

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
