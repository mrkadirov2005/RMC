# Sourced by the dev scripts on every branch except main: points the backend at the local
# databases and the UI at the local backend, through the environment only, so service/.env and
# ui/.env* (which point at production) stay untouched. Shell variables win over .env files in
# both dotenv and Vite.

LOCAL_DB_PORT="${LOCAL_DB_PORT:-5434}"
LOCAL_MONGO_PORT="${LOCAL_MONGO_PORT:-27018}"
LOCAL_API_PORT="${LOCAL_API_PORT:-4000}"
export LOCAL_DB_PORT LOCAL_MONGO_PORT LOCAL_API_PORT

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

export VITE_API_BASE_URL="http://localhost:${LOCAL_API_PORT}/api"

start_local_databases() {
  docker compose -f docker-compose.local.yml up -d --wait
}
