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
#   check-db-parity.sh [diff-output-path]
set -uo pipefail

# shellcheck source=scripts/e2e-remote/schema-dump.lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/schema-dump.lib.sh"

DEV="${E2E_DEV_DB_CONTAINER:-supabase_db_StrummyDevelopment}"
PROD="${E2E_PROD_DB_CONTAINER:-supabase_db_StudentProduction}"
OUT="${1:-/tmp/strummy-schema-parity.diff}"

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

require_container "$DEV"
require_container "$PROD"

DEV_PGDUMP="$(docker exec "$DEV" pg_dump --version)"
PROD_PGDUMP="$(docker exec "$PROD" pg_dump --version)"
if [ "$DEV_PGDUMP" != "$PROD_PGDUMP" ]; then
  echo "pg_dump differs (dev: $DEV_PGDUMP, prod: $PROD_PGDUMP) — the textual diff would be noise." >&2
  exit 2
fi

DEV_DUMP="$(dump_dev)"
PROD_DUMP="$(dump_prod)"
# An empty side means the dump failed, not that the schemas differ.
[ -n "$DEV_DUMP" ] || { echo "Dev schema dump came back empty." >&2; exit 2; }
[ -n "$PROD_DUMP" ] || { echo "Production schema dump came back empty." >&2; exit 2; }

diff <(echo "$DEV_DUMP") <(echo "$PROD_DUMP") > "$OUT"
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
