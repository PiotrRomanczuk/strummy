#!/usr/bin/env bash
# Read-only parity check: is the production DB schema identical to development?
# The E2E suite mutates data, so it only ever runs against StrummyDevelopment —
# this check is what makes a green run transferable: it proves production has
# the same public schema (tables, functions, policies, triggers, views).
# Runs on the EliteDesk, where both stacks are local Docker containers.
# NEVER writes to either database.
#
# Sibling check: check-migrations-replay.sh proves supabase/migrations can
# REBUILD that schema. This one proves prod and dev agree on it; neither
# implies the other.
#
# Pull requests that ADD a migration: the repo rules let a branch apply its
# migration to the shared dev stack (to run E2E), and it reaches prod only via
# deploy-db.yml after merge. Dev is then legitimately ahead of prod by exactly
# that PR's migrations, and a plain prod == dev compare failed every such PR
# (#943, #944 — 2026-10-21). For those PRs, set PARITY_PR_MIGRATIONS to the
# added files: production's schema is rebuilt in a scratch database inside the
# DEV container, the PR's migrations are applied on top, and THAT is compared
# with dev. Prod is still only read. Any other gap — e.g. a migration merged to
# main but never applied to prod (#901) — still fails, because only the PR's
# own files are added.
#
#   check-db-parity.sh [diff-output-path]
#   PARITY_PR_MIGRATIONS=$'supabase/migrations/a.sql\n…' check-db-parity.sh …
set -uo pipefail

# shellcheck source=scripts/e2e-remote/schema-dump.lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/schema-dump.lib.sh"

DEV="${E2E_DEV_DB_CONTAINER:-supabase_db_StrummyDevelopment}"
PROD="${E2E_PROD_DB_CONTAINER:-supabase_db_StudentProduction}"
OUT="${1:-/tmp/strummy-schema-parity.diff}"
LOG="${OUT%.diff}.log"
SHADOW_DB="${PARITY_SHADOW_DB:-strummy_parity_shadow}"
PR_MIGRATIONS="${PARITY_PR_MIGRATIONS:-}"

# Each side is dumped INSIDE its own container. Dumping prod from the dev
# container over 192.168.1.75:54322 stopped working after uwh's 2026-10-19
# restart (Docker no longer routes one compose network to another's published
# port): pg_dump failed into /dev/null, the prod side came back empty and every
# run reported ~4500 lines of "drift". Same normalize() for both; the pg_dump
# versions are checked instead of sharing one binary.
dump_dev() {
  dump_public_schema "$DEV" postgres
}

dump_prod() {
  dump_public_schema "$PROD" postgres
}

# Production's public schema plus this PR's migrations, built in a scratch
# database inside the DEV container. Prints the normalized dump on stdout.
# Exit 1 = a PR migration does not apply on top of prod; 2 = setup failed.
dump_prod_plus_pr_migrations() {
  : > "$LOG"
  create_scratch_db "$DEV" "$SHADOW_DB" "$LOG" ||
    { echo "could not create scratch database $SHADOW_DB (see $LOG)" >&2; return 2; }
  trap 'drop_scratch_db "$DEV" "$SHADOW_DB"' EXIT
  install_service_fixtures "$DEV" "$SHADOW_DB" "$LOG" || return 2

  # pg_dump -n public dumps objects that USE an extension living in public
  # (e.g. public.citext) but not the extension itself. Install the same set.
  local ext
  for ext in $(docker exec "$PROD" psql -U postgres -d postgres -At -c \
      "select extname from pg_extension where extnamespace = 'public'::regnamespace"); do
    docker exec "$DEV" psql -U postgres -d "$SHADOW_DB" -v ON_ERROR_STOP=1 -q \
      -c "create extension if not exists \"$ext\" with schema public" >> "$LOG" 2>&1 ||
      { echo "could not install extension $ext into $SHADOW_DB (see $LOG)" >&2; return 2; }
  done

  # Read-only on prod. CREATE SCHEMA public is dropped: the scratch db has it.
  docker exec "$PROD" pg_dump -U postgres -d postgres --schema-only -n public \
    --no-owner --no-privileges 2>>"$LOG" | sed '/^CREATE SCHEMA public;$/d' |
    psql_into "$DEV" "$SHADOW_DB" >> "$LOG" 2>&1 ||
    { echo "could not load the production schema into $SHADOW_DB (see $LOG)" >&2; return 2; }

  local file
  while IFS= read -r file; do
    [ -n "$file" ] || continue
    [ -f "$file" ] || { echo "PR migration not found: $file" >&2; return 2; }
    echo "  + $(basename "$file")" >&2
    echo "--- $(basename "$file")" >> "$LOG"
    psql_into "$DEV" "$SHADOW_DB" < "$file" >> "$LOG" 2>&1 || {
      echo "FAILED: $(basename "$file") does not apply on top of the production schema." >&2
      tail -20 "$LOG" >&2
      return 1
    }
  done <<< "$PR_MIGRATIONS"

  dump_public_schema "$DEV" "$SHADOW_DB"
}

require_container "$DEV"
require_container "$PROD"

DEV_PGDUMP="$(docker exec "$DEV" pg_dump --version)"
PROD_PGDUMP="$(docker exec "$PROD" pg_dump --version)"
if [ "$DEV_PGDUMP" != "$PROD_PGDUMP" ]; then
  echo "pg_dump differs (dev: $DEV_PGDUMP, prod: $PROD_PGDUMP) — the textual diff would be noise." >&2
  exit 2
fi

DEV_DUMP="$(dump_dev)"
if [ -n "${PR_MIGRATIONS//[[:space:]]/}" ]; then
  echo "This PR adds migrations; comparing dev with production + them:"
  PROD_DUMP="$(dump_prod_plus_pr_migrations)"
  RC=$?
  [ "$RC" = "0" ] || exit "$RC"
  BASELINE="production + this PR's migrations"
else
  PROD_DUMP="$(dump_prod)"
  BASELINE="production"
fi
# An empty side means the dump failed, not that the schemas differ.
[ -n "$DEV_DUMP" ] || { echo "Dev schema dump came back empty." >&2; exit 2; }
[ -n "$PROD_DUMP" ] || { echo "Production schema dump came back empty." >&2; exit 2; }

diff <(echo "$DEV_DUMP") <(echo "$PROD_DUMP") > "$OUT"
LINES=$(wc -l < "$OUT" | tr -d ' ')

if [ "$LINES" = "0" ]; then
  echo "OK: $BASELINE public schema is identical to development."
  exit 0
fi

echo "DRIFT: $BASELINE schema differs from development ($LINES diff lines)." >&2
echo "Schema objects appearing in the diff:" >&2
grep -oE '(FUNCTION|TABLE|POLICY|TRIGGER|VIEW|INDEX) [A-Za-z_."]+' "$OUT" |
  sort -u | head -40 >&2
echo "Full diff: $OUT" >&2
echo "A green E2E run does NOT transfer to production until this is resolved" >&2
echo "(apply the missing supabase/migrations to StudentProduction, then re-run)." >&2
exit 1
