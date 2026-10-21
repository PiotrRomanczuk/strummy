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

DEV="${E2E_DEV_DB_CONTAINER:-supabase_db_StrummyDevelopment}"
SHADOW_DB="${MIGRATION_SHADOW_DB:-strummy_migration_shadow}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-$SCRIPT_DIR/../../supabase/migrations}"
OUT="${1:-/tmp/strummy-migration-replay.diff}"
LOG="${OUT%.diff}.log"

# Service fixture schemas (auth, storage, extensions): see schema-dump.lib.sh.

require_container "$DEV"

psql_db() { psql_into "$DEV" "$1"; }

[ -d "$MIGRATIONS_DIR" ] || { echo "migrations dir not found: $MIGRATIONS_DIR" >&2; exit 2; }
mapfile -t MIGRATIONS < <(find "$MIGRATIONS_DIR" -maxdepth 1 -name '*.sql' | sort)
[ "${#MIGRATIONS[@]}" -gt 0 ] || { echo "no migrations found in $MIGRATIONS_DIR" >&2; exit 2; }

echo "Replaying ${#MIGRATIONS[@]} migrations into $SHADOW_DB (scratch, inside $DEV)..."
: > "$LOG"

create_scratch_db "$DEV" "$SHADOW_DB" "$LOG" ||
  { echo "could not create scratch database $SHADOW_DB (see $LOG)" >&2; exit 2; }
trap 'drop_scratch_db "$DEV" "$SHADOW_DB"' EXIT

install_service_fixtures "$DEV" "$SHADOW_DB" "$LOG" || exit 2

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
