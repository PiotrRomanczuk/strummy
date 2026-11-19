#!/usr/bin/env bash
# The database half of the blueprint catalogs, on uwh: rebuild the schema from
# supabase/migrations in a scratch database inside the dev container, read its
# triggers and RLS policies (catalog-db.sql), drop the scratch database.
#
#   scripts/docs/refresh-catalog-db.sh <out.json>
#   node scripts/docs/build-catalogs.mjs --db <out.json>     # then, anywhere
#
# From the migrations, not from a live stack: dev may carry another PR's
# migration and production may lag, and the blueprint describes this branch.
# Writes only its own scratch database (CATALOG_DB), never `postgres`.
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT" || exit 2
# shellcheck source=scripts/e2e-remote/schema-dump.lib.sh
source scripts/e2e-remote/schema-dump.lib.sh

OUT="${1:?usage: refresh-catalog-db.sh <out.json>}"
DEV="${E2E_DEV_DB_CONTAINER:-supabase_db_StrummyDevelopment}"
DB="${CATALOG_DB:-strummy_catalog}"
LOG="$(mktemp)"

require_container "$DEV"
create_scratch_db "$DEV" "$DB" "$LOG" || { echo "could not create $DB (see $LOG)" >&2; exit 2; }
trap 'drop_scratch_db "$DEV" "$DB"; rm -f "$LOG"' EXIT
install_service_fixtures "$DEV" "$DB" "$LOG" || exit 2

# Filename order is the chain's order, as in check-migrations-replay.sh.
for file in $(find supabase/migrations -maxdepth 1 -name '*.sql' | sort); do
  psql_into "$DEV" "$DB" < "$file" >> "$LOG" 2>&1 ||
    { echo "$(basename "$file") did not apply to a fresh database:" >&2; tail -20 "$LOG" >&2; exit 1; }
done

docker exec -i "$DEV" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -At \
  < scripts/docs/catalog-db.sql > "$OUT" || { echo "catalog query failed" >&2; exit 1; }
LAST="$(find supabase/migrations -maxdepth 1 -name '*.sql' | sort | tail -1)"
node -e '
  const fs = require("node:fs");
  const [file, last] = process.argv.slice(1);
  const db = JSON.parse(fs.readFileSync(file, "utf8"));
  db.migrationsUpTo = last;
  fs.writeFileSync(file, JSON.stringify(db));
  console.log(`catalog: ${db.triggers.length} triggers, ${db.policies.length} policies, ${db.tables.length} tables (migrations up to ${last})`);
' "$OUT" "$(basename "$LAST")"
