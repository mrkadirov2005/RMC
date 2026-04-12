#!/bin/sh
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -f /docker-entrypoint-initdb.d/schema/001_base.sql \
  -f /docker-entrypoint-initdb.d/schema/002_phase1.sql \
  -f /docker-entrypoint-initdb.d/schema/003_tests.sql
