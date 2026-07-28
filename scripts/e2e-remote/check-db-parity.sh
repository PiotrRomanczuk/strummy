#!/usr/bin/env bash
# Read-only parity check: is the production DB schema identical to development?
# The E2E suite mutates data, so it only ever runs against StudentDevelopment —
# this check is what makes a green run transferable: it proves production has
# the same public schema (tables, functions, policies, triggers, views).
# Runs on the EliteDesk, where both stacks are local Docker containers.
# NEVER writes to either database.
#
#   check-db-parity.sh [diff-output-path]
set -uo pipefail

DEV="${E2E_DEV_DB_CONTAINER:-supabase_db_StudentDevelopment}"
PROD="${E2E_PROD_DB_CONTAINER:-supabase_db_StudentProduction}"
OUT="${1:-/tmp/strummy-schema-parity.diff}"

dump() {
  docker exec "$1" pg_dump -U postgres -d postgres \
    --schema-only -n public --no-owner --no-privileges 2>/dev/null |
    grep -vE '^--|^SET |^SELECT pg_catalog|^$'
}

docker exec "$DEV" true 2>/dev/null || { echo "dev DB container '$DEV' unavailable" >&2; exit 2; }
docker exec "$PROD" true 2>/dev/null || { echo "prod DB container '$PROD' unavailable" >&2; exit 2; }

diff <(dump "$DEV") <(dump "$PROD") > "$OUT"
LINES=$(wc -l < "$OUT" | tr -d ' ')

if [ "$LINES" = "0" ]; then
  echo "OK: production public schema is identical to development."
  exit 0
fi

echo "DRIFT: production schema differs from development ($LINES diff lines)." >&2
echo "Schema objects appearing in the diff:" >&2
grep -oE '(FUNCTION|TABLE|POLICY|TRIGGER|VIEW|INDEX) [A-Za-z_."]+' "$OUT" |
  sort -u | head -40 >&2
echo "Full diff: $OUT" >&2
echo "A green E2E run does NOT transfer to production until this is resolved" >&2
echo "(apply the missing supabase/migrations to StudentProduction, then re-run)." >&2
exit 1
