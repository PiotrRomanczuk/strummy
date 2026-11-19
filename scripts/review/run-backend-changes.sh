#!/usr/bin/env bash
# "Zmiany backendu" for the test → main review, on uwh: inventory production's
# and StrummyTest's public schema (catalog queries, read-only), classify the
# migrations this checkout has and main has not, and write backend-changes.md.
#
#   scripts/review/run-backend-changes.sh [out-dir]     (default: review-out)
#
# Run from a checkout of `test`. Everything collected stays in <out-dir>:
# both inventories, the classification, the rendered markdown.
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT" || exit 2
# shellcheck source=scripts/e2e-remote/schema-dump.lib.sh
source scripts/e2e-remote/schema-dump.lib.sh

OUT="${1:-review-out}"
PROD="${BACKEND_PROD_CONTAINER:-supabase_db_StudentProduction}"
TEST="${BACKEND_TEST_CONTAINER:-supabase_db_StrummyTest}"
mkdir -p "$OUT"

require_container "$PROD"
require_container "$TEST"

inventory() {
  docker exec -i "$1" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -At -F $'\t' \
    < scripts/review/schema-inventory.sql > "$2" || {
    echo "schema inventory failed on $1" >&2
    exit 1
  }
  [ -s "$2" ] || { echo "schema inventory of $1 came back empty" >&2; exit 1; }
}
inventory "$PROD" "$OUT/inventory-prod.tsv"
inventory "$TEST" "$OUT/inventory-test.tsv"

git fetch --no-tags -q origin main || { echo "cannot fetch origin/main" >&2; exit 1; }
mapfile -t NEW < <(comm -13 \
  <(git ls-tree --name-only origin/main supabase/migrations/ | sort) \
  <(git ls-tree --name-only HEAD supabase/migrations/ | sort) | grep -E '\.sql$')
: > "$OUT/migrations.txt"
if [ "${#NEW[@]}" -gt 0 ]; then
  bash scripts/e2e-remote/migrate-db.sh classify "${NEW[@]}" > "$OUT/migrations.txt" ||
    { echo "migrate-db.sh classify failed" >&2; exit 1; }
fi

node scripts/review/backend-changes.mjs "$OUT/inventory-prod.tsv" "$OUT/inventory-test.tsv" \
  "$OUT/migrations.txt" > "$OUT/backend-changes.md" || exit 1
echo "backend changes: ${#NEW[@]} migration(s) main lacks; $(grep -c '^- ' "$OUT/backend-changes.md") line(s) in $OUT/backend-changes.md"
