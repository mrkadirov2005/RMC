#!/usr/bin/env sh
set -eu

CONTROL_DIR="${BACKUP_CONTROL_DIR:-/backup-control}"
TRIGGER_FILE="$CONTROL_DIR/run-now"
BACKUP_TIMEZONE="${BACKUP_TIMEZONE:-UTC}"
BACKUP_HOUR="${BACKUP_HOUR:-00}"
BACKUP_MINUTE="${BACKUP_MINUTE:-00}"
mkdir -p "$CONTROL_DIR"

run_backup() {
  source="${1:-scheduled}"
  if mkdir "$CONTROL_DIR/lock" 2>/dev/null; then
    status=0
    BACKUP_TRIGGER_SOURCE="$source" /bin/sh /app/scripts/backup.sh || status=$?
    rmdir "$CONTROL_DIR/lock" 2>/dev/null || true
    return "$status"
  else
    echo "Backup already running; skipping overlapping request."
  fi
}

while :; do
  now="$(TZ="$BACKUP_TIMEZONE" date +%s)"
  target="$(TZ="$BACKUP_TIMEZONE" date -d "today ${BACKUP_HOUR}:${BACKUP_MINUTE}" +%s)"
  if [ "$target" -le "$now" ]; then
    target="$(TZ="$BACKUP_TIMEZONE" date -d "tomorrow ${BACKUP_HOUR}:${BACKUP_MINUTE}" +%s)"
  fi
  delay=$((target - now))
  echo "Next scheduled RMC backup in ${delay}s"

  elapsed=0
  while [ "$elapsed" -lt "$delay" ]; do
    if [ -f "$TRIGGER_FILE" ]; then
      rm -f "$TRIGGER_FILE"
      echo "Manual RMC backup requested."
      run_backup manual
    fi
    sleep 5
    elapsed=$((elapsed + 5))
  done

  run_backup scheduled
done
