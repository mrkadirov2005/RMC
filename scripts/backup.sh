#!/usr/bin/env sh
set -eu

ROOT_DIR="${BACKUP_ROOT_DIR:-$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)}"
ENV_FILE="${BACKUP_ENV_FILE:-$ROOT_DIR/service/.env}"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
RUN_DIR="$BACKUP_DIR/$TIMESTAMP"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-crm_user}"
DB_PASSWORD="${DB_PASSWORD:-crm_password}"
DB_NAME="${DB_NAME:-crm_db}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-crm_postgres}"
EXPORT_POSTGRES_TABLES="${BACKUP_EXPORT_POSTGRES_TABLES:-true}"

MONGO_URI="${MONGO_URI:-}"
MONGO_CONTAINER="${MONGO_CONTAINER:-crm_mongo}"
MONGO_DB="${MONGO_DB:-crm_logs}"

TELEGRAM_BOT_TOKEN="${BACKUP_TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${BACKUP_TELEGRAM_CHAT_ID:-}"
TELEGRAM_CAPTION="${BACKUP_TELEGRAM_CAPTION:-RMC automated backup}"

mkdir -p "$RUN_DIR"

log() {
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

require_command() {
  command -v "$1" >/dev/null 2>&1
}

backup_postgres() {
  local_file="$RUN_DIR/postgres_${DB_NAME}_${TIMESTAMP}.dump"
  log "Starting PostgreSQL full database backup: $local_file"

  if require_command pg_dump; then
    PGPASSWORD="$DB_PASSWORD" pg_dump \
      --host "$DB_HOST" \
      --port "$DB_PORT" \
      --username "$DB_USER" \
      --dbname "$DB_NAME" \
      --format custom \
      --no-owner \
      --no-acl \
      --file "$local_file"
  elif require_command docker; then
    docker exec -e PGPASSWORD="$DB_PASSWORD" "$POSTGRES_CONTAINER" pg_dump \
      --username "$DB_USER" \
      --dbname "$DB_NAME" \
      --format custom \
      --no-owner \
      --no-acl > "$local_file"
  else
    log "ERROR: pg_dump or docker is required for PostgreSQL backup."
    return 1
  fi

  log "PostgreSQL full database backup completed."
}

postgres_query() {
  query="$1"

  if require_command psql; then
    PGPASSWORD="$DB_PASSWORD" psql \
      --host "$DB_HOST" \
      --port "$DB_PORT" \
      --username "$DB_USER" \
      --dbname "$DB_NAME" \
      --tuples-only \
      --no-align \
      --command "$query"
  elif require_command docker; then
    docker exec -e PGPASSWORD="$DB_PASSWORD" "$POSTGRES_CONTAINER" psql \
      --username "$DB_USER" \
      --dbname "$DB_NAME" \
      --tuples-only \
      --no-align \
      --command "$query"
  else
    return 1
  fi
}

postgres_copy_to_file() {
  table_name="$1"
  output_file="$2"
  copy_command="\\copy (SELECT * FROM $table_name) TO STDOUT WITH CSV HEADER"

  if require_command psql; then
    PGPASSWORD="$DB_PASSWORD" psql \
      --host "$DB_HOST" \
      --port "$DB_PORT" \
      --username "$DB_USER" \
      --dbname "$DB_NAME" \
      --command "$copy_command" > "$output_file"
  elif require_command docker; then
    docker exec -e PGPASSWORD="$DB_PASSWORD" "$POSTGRES_CONTAINER" psql \
      --username "$DB_USER" \
      --dbname "$DB_NAME" \
      --command "$copy_command" > "$output_file"
  else
    return 1
  fi
}

export_postgres_tables() {
  if [ "$EXPORT_POSTGRES_TABLES" != "true" ]; then
    log "Readable PostgreSQL table exports skipped by BACKUP_EXPORT_POSTGRES_TABLES."
    return 0
  fi

  export_dir="$RUN_DIR/postgres_tables"
  mkdir -p "$export_dir"

  table_query="
    SELECT quote_ident(table_schema) || '.' || quote_ident(table_name) || '|' || table_schema || '_' || table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  "

  tables_file="$RUN_DIR/postgres_tables.txt"
  if ! postgres_query "$table_query" > "$tables_file"; then
    log "Readable PostgreSQL table exports skipped; psql or docker psql is required."
    return 0
  fi

  table_count=0
  while IFS='|' read -r qualified_table raw_name; do
    [ -n "$qualified_table" ] || continue
    safe_name="$(printf '%s' "$raw_name" | tr -c 'A-Za-z0-9_-' '_')"
    output_file="$export_dir/${safe_name}.csv"
    postgres_copy_to_file "$qualified_table" "$output_file"
    table_count=$((table_count + 1))
  done < "$tables_file"

  log "Readable PostgreSQL table exports completed: $table_count tables."
}

backup_mongo() {
  if [ "${BACKUP_MONGO:-true}" != "true" ]; then
    log "MongoDB backup skipped by BACKUP_MONGO."
    return 0
  fi

  local_file="$RUN_DIR/mongo_${MONGO_DB}_${TIMESTAMP}.archive.gz"

  if [ -n "$MONGO_URI" ] && require_command mongodump; then
    log "Starting MongoDB backup: $local_file"
    mongodump --uri "$MONGO_URI" --db "$MONGO_DB" --archive="$local_file" --gzip
    log "MongoDB backup completed."
  elif require_command docker && docker ps --format '{{.Names}}' | grep -qx "$MONGO_CONTAINER"; then
    log "Starting MongoDB backup from Docker container: $local_file"
    docker exec "$MONGO_CONTAINER" mongodump --db "$MONGO_DB" --archive --gzip > "$local_file"
    log "MongoDB backup completed."
  else
    log "MongoDB backup skipped; mongodump/Mongo container not available."
  fi
}

write_manifest() {
  cat > "$RUN_DIR/manifest.txt" <<EOF
timestamp=$TIMESTAMP
db_host=$DB_HOST
db_port=$DB_PORT
db_name=$DB_NAME
mongo_db=$MONGO_DB
git_commit=$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)
EOF
}

upload_to_s3() {
  if [ -z "${BACKUP_S3_URI:-}" ]; then
    log "S3 upload skipped; BACKUP_S3_URI is not set."
    return 0
  fi

  if ! require_command aws; then
    log "ERROR: aws CLI is required for BACKUP_S3_URI upload."
    return 1
  fi

  log "Uploading backup to $BACKUP_S3_URI/$TIMESTAMP"
  aws s3 sync "$RUN_DIR" "$BACKUP_S3_URI/$TIMESTAMP" --only-show-errors
  log "S3 upload completed."
}

archive_backup_run() {
  ARCHIVE_FILE="$BACKUP_DIR/rmc_backup_${TIMESTAMP}.tar.gz"
  log "Creating archive: $ARCHIVE_FILE"
  tar -C "$BACKUP_DIR" -czf "$ARCHIVE_FILE" "$TIMESTAMP"
  log "Archive created."
}

upload_to_telegram() {
  if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
    log "Telegram upload skipped; BACKUP_TELEGRAM_BOT_TOKEN or BACKUP_TELEGRAM_CHAT_ID is not set."
    return 0
  fi

  if ! require_command curl; then
    log "ERROR: curl is required for Telegram backup upload."
    return 1
  fi

  if [ -z "${ARCHIVE_FILE:-}" ] || [ ! -f "$ARCHIVE_FILE" ]; then
    archive_backup_run
  fi

  size_bytes="$(wc -c < "$ARCHIVE_FILE" | tr -d ' ')"
  size_mb="$((size_bytes / 1024 / 1024))"
  log "Uploading backup archive to Telegram (${size_mb} MB)."

  response_file="$RUN_DIR/telegram_response.json"
  http_code="$(curl -sS -o "$response_file" -w '%{http_code}' \
    -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument" \
    -F "chat_id=${TELEGRAM_CHAT_ID}" \
    -F "caption=${TELEGRAM_CAPTION} ${TIMESTAMP}" \
    -F "document=@${ARCHIVE_FILE}")"

  if [ "$http_code" -lt 200 ] || [ "$http_code" -ge 300 ]; then
    log "ERROR: Telegram upload failed with HTTP $http_code. Response saved to $response_file"
    return 1
  fi

  log "Telegram upload completed."
}

cleanup_old_backups() {
  if [ "$RETENTION_DAYS" -le 0 ] 2>/dev/null; then
    log "Local cleanup skipped; BACKUP_RETENTION_DAYS=$RETENTION_DAYS."
    return 0
  fi

  find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime "+$RETENTION_DAYS" -print -exec rm -rf {} \;
}

backup_postgres
export_postgres_tables
backup_mongo
write_manifest
archive_backup_run
upload_to_s3
upload_to_telegram
cleanup_old_backups

log "Backup finished: $RUN_DIR"
