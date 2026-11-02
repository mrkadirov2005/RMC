#!/usr/bin/env bash
# @MOB-173 Backup restore drill. Run on the server from ~/RMC: bash scripts/restore-drill.sh
#
# Restores the newest PostgreSQL backup into a throwaway container (no ports, its own anonymous
# volume) and compares row counts with production. Production is only read (SELECT count(*)).
# The throwaway container is removed at the end. Never touches compose volumes.
set -euo pipefail

DRILL=rmc_restore_drill
TABLES="${TABLES:-students parents teachers classes payments attendance grades mobile_sessions}"
cleanup() { docker rm -f -v "$DRILL" >/dev/null 2>&1 || true; rm -f /tmp/rmc_drill.dump; }
trap cleanup EXIT

latest="$(docker exec crm_backup sh -c 'ls -1t /backups/*/postgres_*.dump 2>/dev/null | head -1')"
if [ -z "$latest" ]; then echo "No PostgreSQL backup found in crm_backup:/backups"; exit 1; fi
echo "Backup: $latest"
docker cp "crm_backup:$latest" /tmp/rmc_drill.dump
ls -lh /tmp/rmc_drill.dump

docker run -d --name "$DRILL" -e POSTGRES_PASSWORD=drill postgres:16-alpine >/dev/null
for _ in $(seq 1 30); do docker exec "$DRILL" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 2; done
docker cp /tmp/rmc_drill.dump "$DRILL:/tmp/drill.dump"
docker exec "$DRILL" createdb -U postgres drill
start=$(date +%s)
docker exec "$DRILL" pg_restore -U postgres -d drill --no-owner --no-acl /tmp/drill.dump 2>&1 | tail -5 || true
echo "Restore took $(( $(date +%s) - start ))s"

printf '\n%-22s %12s %12s\n' table backup production
fail=0
for t in $TABLES; do
  b="$(docker exec "$DRILL" psql -U postgres -d drill -tAc "SELECT count(*) FROM $t" 2>/dev/null || echo missing)"
  p="$(docker exec crm_postgres psql -U crm_user -d crm_db -tAc "SELECT count(*) FROM $t" 2>/dev/null || echo missing)"
  printf '%-22s %12s %12s\n' "$t" "$b" "$p"
  [ "$b" = missing ] && [ "$p" != missing ] && fail=1
done
echo
if [ "$fail" = 1 ]; then echo "DRILL FAILED: tables missing from the backup"; exit 1; fi
echo "Drill passed. Backup counts can be a little lower than production: the backup is from last night."
