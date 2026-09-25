#!/usr/bin/env sh
set -eu

CONTROL_DIR="${BACKUP_CONTROL_DIR:-/backup-control}"
TRIGGER_FILE="$CONTROL_DIR/run-now"
mkdir -p "$CONTROL_DIR"

run_backup() {
  if mkdir "$CONTROL_DIR/lock" 2>/dev/null; then
    status=0
    /bin/sh /app/scripts/backup.sh || status=$?
    rmdir "$CONTROL_DIR/lock" 2>/dev/null || true
    return "$status"
  else
    echo "Backup already running; skipping overlapping request."
  fi
}

while :; do
  now="$(date +%s)"
  target="$(date -d 'today 03:00' +%s)"
  if [ "$target" -le "$now" ]; then
    target="$(date -d 'tomorrow 03:00' +%s)"
  fi
  delay=$((target - now))
  echo "Next scheduled RMC backup in ${delay}s"

  elapsed=0
  while [ "$elapsed" -lt "$delay" ]; do
    if [ -f "$TRIGGER_FILE" ]; then
      rm -f "$TRIGGER_FILE"
      echo "Manual RMC backup requested."
      run_backup
    fi
    sleep 5
    elapsed=$((elapsed + 5))
  done

  run_backup
done
