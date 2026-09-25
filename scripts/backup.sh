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
BACKUP_TRIGGER_SOURCE="${BACKUP_TRIGGER_SOURCE:-scheduled}"

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

GOOGLE_SHEETS_SERVICE_ACCOUNT_FILE="${GOOGLE_SHEETS_SERVICE_ACCOUNT_FILE:-}"
GOOGLE_SHEETS_SPREADSHEET_ID="${GOOGLE_SHEETS_SPREADSHEET_ID:-}"

mkdir -p "$RUN_DIR"
exec 2>> "$RUN_DIR/backup.log"

log() {
  line="$(printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*")"
  printf '%s\n' "$line"
  printf '%s\n' "$line" >> "$RUN_DIR/backup.log"
}

record_backup_started() {
  postgres_query "INSERT INTO backup_runs (run_id, status, trigger_source) VALUES ('$TIMESTAMP', 'started', '$BACKUP_TRIGGER_SOURCE') ON CONFLICT (run_id) DO NOTHING" >/dev/null 2>&1 || true
}

record_backup_finished() {
  status="$1"
  error_message="${2:-}"
  escaped_error="$(printf '%s' "$error_message" | sed "s/'/''/g")"
  postgres_query "UPDATE backup_runs SET status = '$status', completed_at = CURRENT_TIMESTAMP, error_message = NULLIF('$escaped_error', '') WHERE run_id = '$TIMESTAMP'" >/dev/null 2>&1 || true
}

require_command() {
  command -v "$1" >/dev/null 2>&1
}

send_telegram_message() {
  text="$1"
  [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ] && return 0
  require_command curl || return 0
  curl -sS -o /dev/null -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${text}" || true
}

# Whatever step fails, whoever's holding the phone should hear about it — a
# backup that silently stopped running is worse than no backup, since it looks
# fine until the night it's needed.
report_failure_on_exit() {
  exit_code=$?
  if [ "$exit_code" -ne 0 ]; then
    failure_detail="$(tail -n 1 "$RUN_DIR/backup.log" 2>/dev/null || true)"
    if [ -z "$failure_detail" ]; then
      failure_detail="Backup exited with code $exit_code."
    fi
    record_backup_finished "failed" "$failure_detail"
    send_telegram_message "❌ RMC nightly backup FAILED (exit code ${exit_code}). Check /var/log/rmc-backup.log on the server."
  else
    record_backup_finished "success"
  fi
}
trap report_failure_on_exit EXIT

backup_postgres() {
  local_file="$RUN_DIR/postgres_${DB_NAME}_${TIMESTAMP}.dump"
  log "Starting PostgreSQL full database backup: $local_file"
  if require_command pg_dump; then
    log "Using PostgreSQL client: $(pg_dump --version)"
  fi

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

send_telegram_document() {
  file="$1"
  caption="$2"
  response_file="$RUN_DIR/telegram_response_$(basename "$file").json"
  http_code="$(curl -sS -o "$response_file" -w '%{http_code}' \
    -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument" \
    -F "chat_id=${TELEGRAM_CHAT_ID}" \
    -F "caption=${caption}" \
    -F "document=@${file}")"

  if [ "$http_code" -lt 200 ] || [ "$http_code" -ge 300 ]; then
    log "ERROR: Telegram upload of $(basename "$file") failed with HTTP $http_code. Response saved to $response_file"
    return 1
  fi
}

# Telegram's standard Bot API caps uploads at 50MB. Anything bigger gets split
# into <=45MB parts (a safety margin, not a hard cutoff) and sent as multiple
# messages instead of failing outright — `part_aa` of `N`, `part_ab` of `N`, etc.
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
  telegram_limit_bytes="$((45 * 1000 * 1000))"

  if [ "$size_bytes" -le "$telegram_limit_bytes" ]; then
    log "Uploading backup archive to Telegram (${size_mb} MB)."
    send_telegram_document "$ARCHIVE_FILE" "${TELEGRAM_CAPTION} ${TIMESTAMP}" || return 1
    log "Telegram upload completed."
    return 0
  fi

  log "Archive is ${size_mb} MB, over Telegram's per-file limit — splitting into parts."
  split_prefix="$RUN_DIR/$(basename "$ARCHIVE_FILE").part_"
  split -b 45m "$ARCHIVE_FILE" "$split_prefix"

  part_count="$(find "$RUN_DIR" -maxdepth 1 -name "$(basename "$ARCHIVE_FILE").part_*" | wc -l | tr -d ' ')"
  part_num=0
  for part in "$split_prefix"*; do
    part_num=$((part_num + 1))
    log "Uploading part ${part_num}/${part_count}: $(basename "$part")"
    send_telegram_document "$part" "${TELEGRAM_CAPTION} ${TIMESTAMP} (part ${part_num}/${part_count})" || return 1
  done

  log "Telegram upload completed (${part_count} parts)."
}

# Optional: mirror the live Postgres data into a hosted instance (Neon, Supabase,
# etc.) so there's a live, queryable copy — not just a static file. Runs only
# when BACKUP_REMOTE_POSTGRES_URL is set; silently skipped otherwise. --clean
# --if-exists makes every run a full replace of the remote's schema, so nightly
# re-runs stay idempotent instead of colliding with the previous night's data.
mirror_remote_postgres() {
  if [ -z "${BACKUP_REMOTE_POSTGRES_URL:-}" ]; then
    log "Remote Postgres mirror skipped; BACKUP_REMOTE_POSTGRES_URL is not set."
    return 0
  fi

  if ! require_command psql; then
    log "ERROR: psql is required locally to mirror into the remote Postgres instance."
    return 1
  fi

  log "Mirroring PostgreSQL into the remote hosted instance."
  dump_cmd="PGPASSWORD=\"$DB_PASSWORD\" pg_dump --host \"$DB_HOST\" --port \"$DB_PORT\" --username \"$DB_USER\" --dbname \"$DB_NAME\" --clean --if-exists --no-owner --no-acl"
  if require_command pg_dump; then
    if ! eval "$dump_cmd" | psql "$BACKUP_REMOTE_POSTGRES_URL" > "$RUN_DIR/remote_mirror.log" 2>&1; then
      log "ERROR: remote Postgres mirror failed — see $RUN_DIR/remote_mirror.log"
      send_telegram_message "⚠️ RMC backup: nightly files sent fine, but the hosted-Postgres mirror failed. Check $RUN_DIR/remote_mirror.log on the server."
      return 1
    fi
  elif require_command docker; then
    if ! docker exec -e PGPASSWORD="$DB_PASSWORD" "$POSTGRES_CONTAINER" pg_dump --username "$DB_USER" --dbname "$DB_NAME" --clean --if-exists --no-owner --no-acl \
      | psql "$BACKUP_REMOTE_POSTGRES_URL" > "$RUN_DIR/remote_mirror.log" 2>&1; then
      log "ERROR: remote Postgres mirror failed — see $RUN_DIR/remote_mirror.log"
      send_telegram_message "⚠️ RMC backup: nightly files sent fine, but the hosted-Postgres mirror failed. Check $RUN_DIR/remote_mirror.log on the server."
      return 1
    fi
  else
    log "ERROR: pg_dump or docker is required for the remote Postgres mirror."
    return 1
  fi

  log "Remote Postgres mirror completed."
}

# Optional: mirror the readable CSV table exports into a Google Sheet, one tab
# per table plus a Summary tab. Runs only when GOOGLE_SHEETS_SERVICE_ACCOUNT_FILE
# and GOOGLE_SHEETS_SPREADSHEET_ID are set; silently skipped otherwise. Auth is
# a hand-rolled RS256 JWT (openssl) exchanged for an OAuth token — no Google
# client library needed on the host.
export_to_google_sheets() {
  apps_script_url="${GOOGLE_APPS_SCRIPT_URL:-${APPS_SCRIPT_URL:-}}"
  if [ -z "$apps_script_url" ]; then
    log "Google Sheets export skipped; GOOGLE_APPS_SCRIPT_URL is not set."
    return 0
  fi

  if [ "$EXPORT_POSTGRES_TABLES" != "true" ]; then
    log "Google Sheets export skipped; requires BACKUP_EXPORT_POSTGRES_TABLES=true CSV exports."
    return 0
  fi

  if ! require_command python3; then
    log "ERROR: python3 is required for the Google Apps Script Sheets export."
    return 1
  fi

  sheets_tables="${GOOGLE_SHEETS_TABLES:-all}"
  sheets_export_dir="$RUN_DIR/postgres_tables"
  if GOOGLE_APPS_SCRIPT_URL="$apps_script_url" python3 "$ROOT_DIR/scripts/apps_script_sheets_export.py" "$sheets_export_dir" "$sheets_tables" >> "$RUN_DIR/sheets_export.log" 2>&1; then
    log "Google Sheets export completed."
  else
    log "ERROR: Google Sheets export failed — see $RUN_DIR/sheets_export.log"
    send_telegram_message "⚠️ RMC backup: nightly files sent fine, but the Google Sheets export failed. Check $RUN_DIR/sheets_export.log on the server."
    return 1
  fi
}

cleanup_old_backups() {
  if [ "$RETENTION_DAYS" -le 0 ] 2>/dev/null; then
    log "Local cleanup skipped; BACKUP_RETENTION_DAYS=$RETENTION_DAYS."
    return 0
  fi

  find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime "+$RETENTION_DAYS" -print -exec rm -rf {} \;
}

record_backup_started
backup_postgres
export_postgres_tables
backup_mongo
write_manifest
archive_backup_run
upload_to_s3
upload_to_telegram
mirror_remote_postgres || true
export_to_google_sheets || true
cleanup_old_backups

log "Backup finished: $RUN_DIR"
send_telegram_message "✅ RMC nightly backup completed ($TIMESTAMP)."
