#!/usr/bin/env bash
# Read-only drift check: does types/database.types.ts still describe the live
# public schema? Compares the table+column set in the committed types file
# against the development database. NEVER writes to either.
#
#   check-types-drift.sh [diff-output-path]
#
# Why this exists: until 2026-07-30 the repo carried THREE divergent copies of
# the generated schema types, each stale in a different direction. Roughly a
# third of app/ type-checked against a schema that predated the July identity
# rebuild, which hid 18 real type errors — including writes of a nullable
# profiles.email into notification_log.recipient_email, which is NOT NULL.
#
# Deliberately dependency-free: uses `docker exec` into the dev container (the
# same approach as check-db-parity.sh) plus node, so it needs neither the
# supabase CLI nor Docker-in-Docker on the runner. It compares structure, not
# TypeScript types — enough to catch a forgotten `npm run db:types`.
set -uo pipefail

DEV="${E2E_DEV_DB_CONTAINER:-supabase_db_StudentDevelopment}"
TYPES_FILE="${TYPES_FILE:-types/database.types.ts}"
OUT="${1:-/tmp/strummy-types-drift.diff}"

if [ ! -f "$TYPES_FILE" ]; then
  echo "error: $TYPES_FILE not found (run from the repo root)" >&2
  exit 1
fi

# --- what the database says -------------------------------------------------
docker exec "$DEV" psql -U postgres -d postgres -tAc "
  select c.table_name || '.' || c.column_name
  from information_schema.columns c
  join information_schema.tables t
    on t.table_schema = c.table_schema and t.table_name = c.table_name
  where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
  order by 1
" 2>/dev/null | tr -d '\r' | grep -v '^$' | sort > /tmp/.types-drift-db.txt

if [ ! -s /tmp/.types-drift-db.txt ]; then
  echo "error: could not read the schema from container $DEV" >&2
  exit 1
fi

# --- what the committed types file says --------------------------------------
node -e '
const fs = require("fs");
const lines = fs.readFileSync(process.argv[1], "utf8").split("\n");
const pub = lines.findIndex((l) => /^  public: \{/.test(l));
const start = lines.findIndex((l, i) => i > pub && /^    Tables: \{/.test(l));
const out = [];
let table = null;
let inRow = false;
for (let i = start + 1; i < lines.length; i++) {
  if (/^    \}/.test(lines[i])) break;
  const t = lines[i].match(/^      ([a-z_][a-z0-9_]*): \{/);
  if (t) { table = t[1]; inRow = false; continue; }
  if (/^        Row: \{/.test(lines[i])) { inRow = true; continue; }
  if (inRow && /^        \}/.test(lines[i])) { inRow = false; continue; }
  const c = inRow && lines[i].match(/^          ([a-z_][a-z0-9_]*)(\??):/);
  if (c && table) out.push(table + "." + c[1]);
}
process.stdout.write(out.sort().join("\n") + "\n");
' "$TYPES_FILE" | grep -v '^$' | sort > /tmp/.types-drift-file.txt

# --- compare ----------------------------------------------------------------
{
  echo "# columns in the DATABASE but missing from $TYPES_FILE (run: npm run db:types)"
  comm -23 /tmp/.types-drift-db.txt /tmp/.types-drift-file.txt | sed 's/^/+ /'
  echo
  echo "# columns in $TYPES_FILE that no longer exist in the database"
  comm -13 /tmp/.types-drift-db.txt /tmp/.types-drift-file.txt | sed 's/^/- /'
} > "$OUT"

missing=$(comm -23 /tmp/.types-drift-db.txt /tmp/.types-drift-file.txt | wc -l | tr -d ' ')
stale=$(comm -13 /tmp/.types-drift-db.txt /tmp/.types-drift-file.txt | wc -l | tr -d ' ')

if [ "$missing" != "0" ] || [ "$stale" != "0" ]; then
  echo "SCHEMA TYPES DRIFT: $missing column(s) missing from the types file, $stale stale." >&2
  echo "Regenerate with: npm run db:types" >&2
  cat "$OUT" >&2
  exit 1
fi

echo "types/database.types.ts matches the live schema ($(wc -l < /tmp/.types-drift-db.txt | tr -d ' ') columns)."
