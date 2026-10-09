#!/bin/sh
# Runs the whole app against local databases: `npm run dev:local`.
# The UI talks to the local backend, never to the production API.
set -e

cd "$(dirname "$0")/.."

LOCAL_DB_PORT="${LOCAL_DB_PORT:-5434}"
LOCAL_MONGO_PORT="${LOCAL_MONGO_PORT:-27018}"
LOCAL_API_PORT="${LOCAL_API_PORT:-4000}"
export LOCAL_DB_PORT LOCAL_MONGO_PORT

docker compose -f docker-compose.local.yml up -d --wait

# Shell variables win over service/.env (dotenv never overrides them), so the backend
# uses the local databases and port without editing service/.env.
export PORT="$LOCAL_API_PORT"
export DB_HOST=127.0.0.1
export DB_PORT="$LOCAL_DB_PORT"
export MONGO_URI="mongodb://127.0.0.1:${LOCAL_MONGO_PORT}"
export NODE_ENV=development
# Anything in service/.env that reaches real systems stays off locally:
# Telegram, backups to the Telegram group, the Google Sheets export, and the
# Engineering "redeploy" button (no password means it refuses to run).
export TELEGRAM_WEBHOOK_URL=
export BACKUP_TELEGRAM_BOT_TOKEN=
export BACKUP_TELEGRAM_CHAT_ID=
export GOOGLE_APPS_SCRIPT_URL=
export APPS_SCRIPT_URL=
export SERVER_REDEPLOY_PASSWORD=

# Vite env vars from the shell override ui/.env*, so the UI points at the local backend.
export VITE_API_BASE_URL="http://localhost:${LOCAL_API_PORT}/api"

echo "Local API: http://localhost:${LOCAL_API_PORT}/api  |  Postgres: 127.0.0.1:${LOCAL_DB_PORT}  |  Mongo: 127.0.0.1:${LOCAL_MONGO_PORT}"
exec npx concurrently -n backend,ui -c cyan,magenta "npm --prefix service run dev" "npm --prefix ui run dev"
