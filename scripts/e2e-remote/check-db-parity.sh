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
PROD_HOST="${E2E_PROD_DB_HOST:-192.168.1.75}"
PROD_PORT="${E2E_PROD_DB_PORT:-54322}"
OUT="${1:-/tmp/strummy-schema-parity.diff}"

# Both dumps come from the SAME pg_dump binary (the dev container's), and the
# sed canonicalizes CHECK-constraint array casts: constraint text is deparsed
# SERVER-side (pg_get_constraintdef), so different Postgres server versions
# render the same constraint differently — e.g.
#   ANY (ARRAY[('a'::character varying)::text, ...])     vs
#   ANY ((ARRAY['a'::character varying, ...])::text[])
# Both collapse to ANY (ARRAY['a', ...]). Comparison-only, applied to both.
normalize() {
  grep -vE '^--|^SET |^SELECT pg_catalog|^\\(un)?restrict|^$' |
    sed -E "s/\('([^']+)'::character varying\)::text/'\1'/g; s/'([^']+)'::character varying/'\1'/g; s/\(\(ARRAY\[/(ARRAY[/g; s/\]\)::text\[\]\)/])/g"
}

dump_dev() {
  docker exec "$DEV" pg_dump -U postgres -d postgres \
    --schema-only -n public --no-owner --no-privileges 2>/dev/null | normalize
}

dump_prod() {
  local pw
  pw=$(docker exec "$PROD" printenv POSTGRES_PASSWORD)
  docker exec -e PGPASSWORD="$pw" "$DEV" pg_dump \
    -h "$PROD_HOST" -p "$PROD_PORT" -U postgres -d postgres \
    --schema-only -n public --no-owner --no-privileges 2>/dev/null | normalize
}

docker exec "$DEV" true 2>/dev/null || { echo "dev DB container '$DEV' unavailable" >&2; exit 2; }
docker exec "$PROD" true 2>/dev/null || { echo "prod DB container '$PROD' unavailable" >&2; exit 2; }

diff <(dump_dev) <(dump_prod) > "$OUT"
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
