#!/usr/bin/env sh
set -eu

ROOT_DIR="${BACKUP_ROOT_DIR:-$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)}"
SCHEDULE="${BACKUP_CRON_SCHEDULE:-0 * * * *}"
LOG_FILE="${BACKUP_LOG_FILE:-/var/log/rmc-backup.log}"
MARKER="# RMC automated hourly backup"
COMMAND="cd $ROOT_DIR && /bin/sh scripts/backup.sh >> $LOG_FILE 2>&1"
ENTRY="$SCHEDULE $COMMAND $MARKER"

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

crontab -l 2>/dev/null | grep -v "$MARKER" > "$tmp_file" || true
printf '%s\n' "$ENTRY" >> "$tmp_file"
crontab "$tmp_file"

printf 'Installed backup cron:\n%s\n' "$ENTRY"
