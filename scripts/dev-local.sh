#!/bin/sh
# `npm run dev:local`: always local, on any branch (main included). See scripts/local-env.sh.
set -e

cd "$(dirname "$0")/.."

. ./scripts/local-env.sh
start_local_databases

echo "[dev] local mode | API http://localhost:${LOCAL_API_PORT}/api | Postgres 127.0.0.1:${LOCAL_DB_PORT} | Mongo 127.0.0.1:${LOCAL_MONGO_PORT}"
exec npx concurrently -n backend,ui -c cyan,magenta "npm --prefix service run dev" "npm --prefix ui run dev"
