#!/bin/bash
# Non-destructive validation for the from-scratch rebuild migrations
# (docs/DATABASE_REBUILD.md). Spins up a throwaway scratch DB on a dev Postgres
# cluster (never production — see prod-guard.sh), installs a minimal Supabase shim (supabase/tests/_shim.sql),
# applies every supabase/migrations/*.sql in order, runs a gate-test file, then
# drops the scratch DB. Never touches the real local stack database.
#
# Usage:  scripts/database/validate-migrations.sh [test-file]
#   test-file defaults to supabase/tests/wave0.sql
#
# Env: PGHOST_ and PGPORT_ (required — dev on uwh: 192.168.1.75 / 55322, Mac local stack:
#      127.0.0.1 / 54322), PGUSER_ (postgres), PGPASSWORD (postgres).
set -euo pipefail

HOST="${PGHOST_:-}"
PORT="${PGPORT_:-}"
# shellcheck source=scripts/database/prod-guard.sh
source "$(dirname "${BASH_SOURCE[0]}")/prod-guard.sh"
require_non_production_target "$HOST" "$PORT"
USER_="${PGUSER_:-postgres}"
export PGPASSWORD="${PGPASSWORD:-postgres}"

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIG="$REPO/supabase/migrations"
SHIM="$REPO/supabase/tests/_shim.sql"
TESTS="${1:-$REPO/supabase/tests/wave0.sql}"
DB="strummy_rebuild_test"

PSQL="psql -h $HOST -p $PORT -U $USER_ -v ON_ERROR_STOP=1"

echo ">> (re)creating scratch DB $DB on $HOST:$PORT"
$PSQL -d postgres -q -c "drop database if exists $DB;"
$PSQL -d postgres -q -c "create database $DB;"

cleanup() { $PSQL -d postgres -q -c "drop database if exists $DB;" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo ">> installing Supabase shim"
$PSQL -d "$DB" -q -f "$SHIM"

echo ">> applying migrations in lexicographic order"
for f in $(ls "$MIG"/*.sql 2>/dev/null | sort); do
  echo "   - $(basename "$f")"
  $PSQL -d "$DB" -q -f "$f"
done

echo ">> running gate tests: $(basename "$TESTS")"
$PSQL -d "$DB" -f "$TESTS"

echo ">> OK (scratch DB dropped on exit)"
