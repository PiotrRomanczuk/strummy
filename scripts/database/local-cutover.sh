#!/bin/bash
# One-shot LOCAL cutover: replace the local stack's public schema with the
# from-scratch rebuild (docs/DATABASE_REBUILD.md) and reseed (profiles backfill
# + 438-song library from supabase/seed.sql). DESTRUCTIVE to the local dev DB's
# public schema — auth/storage/realtime are untouched, production is never touched.
#
# Runs as a SINGLE transaction: any error rolls back and leaves the stack intact.
#
# Usage:  CONFIRM=yes scripts/database/local-cutover.sh
# Env:    PGHOST_ PGPORT_ (required, no defaults — dev on uwh: 192.168.1.75 / 55322, Mac local
#         stack: 127.0.0.1 / 54322; production is refused) PGUSER_ (postgres) PGPASSWORD
set -euo pipefail

if [ "${CONFIRM:-}" != "yes" ]; then
  echo "Refusing to run without CONFIRM=yes (this DROPs and rebuilds the local public schema)." >&2
  exit 2
fi

HOST="${PGHOST_:-}"; PORT="${PGPORT_:-}"; USER_="${PGUSER_:-postgres}"
# shellcheck source=scripts/database/prod-guard.sh
source "$(dirname "${BASH_SOURCE[0]}")/prod-guard.sh"
require_non_production_target "$HOST" "$PORT"
export PGPASSWORD="${PGPASSWORD:-postgres}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIG="$REPO/supabase/migrations"; SEED="$REPO/supabase/seed.sql"
TMP="$(mktemp)"; trap 'rm -f "$TMP"' EXIT

# --- assemble the atomic cutover ---
cat > "$TMP" <<'PRE'
\set ON_ERROR_STOP on
set lock_timeout = '20s';
set statement_timeout = '300s';
begin;
drop schema public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant create on schema public to postgres, service_role;
PRE
for f in $(ls "$MIG"/*.sql | sort); do echo "-- >>> $(basename "$f")" >> "$TMP"; cat "$f" >> "$TMP"; done
cat "$SEED" >> "$TMP"
# rewrite the CLI migration-history bookkeeping to match the new chain
{
  echo "truncate supabase_migrations.schema_migrations;"
  echo "insert into supabase_migrations.schema_migrations (version, name) values"
  ls "$MIG"/*.sql | sort | sed -E 's/.*\/([0-9]+)_(.*)\.sql/  ('"'"'\1'"'"','"'"'\2'"'"'),/' | sed '$ s/,$/;/'
  echo "commit;"
} >> "$TMP"

echo ">> applying atomic cutover to $HOST:$PORT (public schema will be rebuilt)"
psql -h "$HOST" -p "$PORT" -U "$USER_" -d postgres -f "$TMP"
echo ">> reloading PostgREST schema cache"
psql -h "$HOST" -p "$PORT" -U "$USER_" -d postgres -c "notify pgrst, 'reload schema';"
echo ">> done. Verify: scripts/database/validate-migrations.sh and a REST probe."
