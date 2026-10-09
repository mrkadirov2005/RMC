#!/bin/sh
# `npm run dev`, `dev:full`, `dev:backend`, `dev:ui` go through here.
#   - On main: the original commands, unchanged (the UI uses ui/.env, i.e. the production API).
#   - On any other branch (develop, feature branches): everything local — local databases,
#     the backend on :4000 against them, and the UI against the local backend.
# Production deploys don't use these scripts, so this never changes what runs on the server.
set -e

cd "$(dirname "$0")/.."

target="${1:-full}"
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"

run_target() {
  case "$target" in
    ui) exec npm --prefix ui run dev ;;
    backend) exec npm --prefix service run dev ;;
    full) exec npx concurrently -n backend,ui -c cyan,magenta "npm --prefix service run dev" "npm --prefix ui run dev" ;;
    *) echo "Unknown target: $target (use ui, backend or full)" >&2; exit 1 ;;
  esac
}

if [ "$branch" = "main" ]; then
  echo "[dev] branch main: running as before (production API from ui/.env)"
  run_target
fi

. ./scripts/local-env.sh
if [ "$target" != "ui" ]; then
  start_local_databases
fi
echo "[dev] branch $branch: local mode | API http://localhost:${LOCAL_API_PORT}/api | Postgres 127.0.0.1:${LOCAL_DB_PORT} | Mongo 127.0.0.1:${LOCAL_MONGO_PORT}"
if [ "$target" = "ui" ]; then
  echo "[dev] UI only: start the local backend too (npm run dev:backend), or use npm run dev:full"
fi
run_target
