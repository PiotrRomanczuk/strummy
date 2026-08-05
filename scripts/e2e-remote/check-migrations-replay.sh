#!/usr/bin/env bash
# Read-only check (against the real stacks): does supabase/migrations actually
# REBUILD the schema that is running?
#
# db-parity proves prod == dev. types-drift proves database.types.ts == dev.
# Neither notices a change made ad-hoc through psql or Studio and never filed
# as a migration — that change is in dev, propagated to prod, reflected in the
# types, and simply absent from the repo. A fresh database would not have it.
# This closes that side of the triangle: migrations == dev.
#
# Method: replay every file in supabase/migrations into a throwaway database
# inside the DEV container, dump its public schema, diff against dev's.
# The first migration is a full baseline snapshot, so the chain IS
# self-contained for a fresh database — that is what makes this possible.
#
# Writes ONLY to its own scratch database ($SHADOW_DB), which it drops and
# recreates on every run. Never touches `postgres` on either stack.
#
#   check-migrations-replay.sh [diff-output-path]
set -uo pipefail

# shellcheck source=scripts/e2e-remote/schema-dump.lib.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/schema-dump.lib.sh"

DEV="${E2E_DEV_DB_CONTAINER:-supabase_db_StudentDevelopment}"
SHADOW_DB="${MIGRATION_SHADOW_DB:-strummy_migration_shadow}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-$SCRIPT_DIR/../../supabase/migrations}"
OUT="${1:-/tmp/strummy-migration-replay.diff}"
LOG="${OUT%.diff}.log"

# Schemas the migrations depend on but do not own: `auth` and `storage` belong
# to GoTrue and Storage (created by their own service migrations, not ours),
# `extensions` is where the Supabase image installs citext/pgcrypto/pg_trgm.
# Copying them in as a fixture is not a shortcut — reproducing them from our
# migrations would mean claiming ownership of another service's schema.
FIXTURE_SCHEMAS="${MIGRATION_FIXTURE_SCHEMAS:-extensions auth storage}"

require_container "$DEV"

psql_db() {
  docker exec -i "$DEV" psql -U postgres -d "$1" -v ON_ERROR_STOP=1 -q
}

[ -d "$MIGRATIONS_DIR" ] || { echo "migrations dir not found: $MIGRATIONS_DIR" >&2; exit 2; }
mapfile -t MIGRATIONS < <(find "$MIGRATIONS_DIR" -maxdepth 1 -name '*.sql' | sort)
[ "${#MIGRATIONS[@]}" -gt 0 ] || { echo "no migrations found in $MIGRATIONS_DIR" >&2; exit 2; }

echo "Replaying ${#MIGRATIONS[@]} migrations into $SHADOW_DB (scratch, inside $DEV)..."
: > "$LOG"

# `with (force)` terminates any connection left behind by an aborted run —
# without it a stale session makes every subsequent run fail on DROP.
docker exec "$DEV" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q \
  -c "drop database if exists \"$SHADOW_DB\" with (force)" \
  -c "create database \"$SHADOW_DB\"" >> "$LOG" 2>&1 ||
  { echo "could not create scratch database $SHADOW_DB (see $LOG)" >&2; exit 2; }

cleanup() {
  docker exec "$DEV" psql -U postgres -d postgres -q \
    -c "drop database if exists \"$SHADOW_DB\" with (force)" >/dev/null 2>&1
}
trap cleanup EXIT

# Fixture schemas, dumped from dev and restored into the scratch database.
#
# Split by pg_dump section, and post-data is filtered: a fixture statement that
# mentions `public.` is BY DEFINITION ours, not the service's — e.g. GoTrue's
# auth.users carries our `on_auth_user_created` trigger calling
# public.handle_new_user(), which does not exist yet at fixture time and which
# our own migrations create moments later. Installing it here would either fail
# (before) or duplicate (after). The rule is clean: the fixture supplies what
# another service owns; anything reaching into public belongs to the chain
# under test. Post-data still carries the PKs that our FKs to auth.users need,
# so it cannot simply be skipped.
install_fixture() {
  local schema="$1" section="$2"
  docker exec "$DEV" pg_dump -U postgres -d postgres \
    --schema-only --section="$section" -n "$schema" \
    --no-owner --no-privileges 2>>"$LOG"
}

# Drop whole statements (blank-line-separated records) that reference public.
strip_public_refs() {
  awk 'BEGIN{RS="";ORS="\n\n"} !/public\./'
}

for schema in $FIXTURE_SCHEMAS; do
  if ! install_fixture "$schema" pre-data | psql_db "$SHADOW_DB" >> "$LOG" 2>&1; then
    echo "failed to install fixture schema '$schema' (pre-data, see $LOG)" >&2
    exit 2
  fi
done
for schema in $FIXTURE_SCHEMAS; do
  if ! install_fixture "$schema" post-data | strip_public_refs |
       psql_db "$SHADOW_DB" >> "$LOG" 2>&1; then
    echo "failed to install fixture schema '$schema' (post-data, see $LOG)" >&2
    exit 2
  fi
done

# Replay in filename order — the timestamp prefix IS the ordering, same as the
# Supabase CLI applies them.
for file in "${MIGRATIONS[@]}"; do
  echo "--- $(basename "$file")" >> "$LOG"
  if ! psql_db "$SHADOW_DB" < "$file" >> "$LOG" 2>&1; then
    echo "FAILED: $(basename "$file") did not apply to a fresh database." >&2
    echo "Last 30 lines of $LOG:" >&2
    tail -30 "$LOG" >&2
    echo >&2
    echo "The migration chain must be replayable from scratch. Usual causes:" >&2
    echo "  - non-idempotent DDL (add 'if not exists' / 'or replace')" >&2
    echo "  - depends on an object created ad-hoc in dev and never filed" >&2
    echo "  - ordered before the migration that creates what it references" >&2
    exit 1
  fi
done

diff <(dump_public_schema "$DEV" "$SHADOW_DB") \
     <(dump_public_schema "$DEV" postgres) > "$OUT"
LINES=$(wc -l < "$OUT" | tr -d ' ')

if [ "$LINES" = "0" ]; then
  echo "OK: replaying supabase/migrations reproduces the development schema exactly."
  exit 0
fi

echo "DRIFT: the migration chain does not reproduce the development schema ($LINES diff lines)." >&2
echo "  '<' = only from migrations   '>' = only in the live dev database" >&2
echo "Schema objects appearing in the diff:" >&2
grep -oE '(FUNCTION|TABLE|POLICY|TRIGGER|VIEW|INDEX) [A-Za-z_."]+' "$OUT" |
  sort -u | head -40 >&2
echo "Full diff: $OUT" >&2
echo >&2
echo "A '>' line means dev has an object no migration creates — almost always a" >&2
echo "change applied by hand via psql/Studio. File it as a migration (CLAUDE.md:" >&2
echo "Database Changes); the file is the source of truth, not the live database." >&2
exit 1
