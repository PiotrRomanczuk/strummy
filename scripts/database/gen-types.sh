#!/usr/bin/env bash
# Regenerate database.types.ts — the single source of truth for DB types.
#
#   npm run db:types          regenerate in place
#   npm run db:types:check    fail if the committed file is stale (CI)
#
# Why this exists: four hand-maintained copies of these types used to drift
# from the schema and from each other, declaring columns the database did not
# have. `tsc` trusted them, so the query compiled and then failed at runtime
# with Postgres 42703 — which rejects the ENTIRE query. That caused at least
# seven production bugs. Generated output is the only thing that cannot lie.
#
# Generation runs against the DEV stack. It needs Docker (the Supabase CLI
# pulls a helper image), so on a machine without it, run this on `uwh` where
# the stacks live.
set -uo pipefail

OUT="database.types.ts"
CHECK=0
[ "${1:-}" = "--check" ] && CHECK=1

DB_URL="${SUPABASE_DB_URL:-}"
if [ -z "$DB_URL" ]; then
  PW=$(docker exec supabase_db_StudentDevelopment printenv POSTGRES_PASSWORD 2>/dev/null | tr -d '\r\n')
  if [ -z "$PW" ]; then
    echo "Cannot reach the dev database." >&2
    echo "Set SUPABASE_DB_URL, or run this on uwh where StudentDevelopment lives." >&2
    exit 2
  fi
  DB_URL="postgresql://postgres:${PW}@127.0.0.1:55322/postgres"
fi

SUPABASE_BIN="$(command -v supabase || echo "$HOME/.local/bin/supabase")"
[ -x "$SUPABASE_BIN" ] || { echo "supabase CLI not found" >&2; exit 2; }

HEADER=$(sed -n '1,/^$/p' "$OUT" 2>/dev/null | grep '^//' || true)

TMP=$(mktemp)
# --schema is explicit on purpose: without it the CLI picks up
# supabase/config.toml when run from the repo root and emits extra schemas
# (graphql_public), so output depended on the working directory and CI
# disagreed with a local run. Pin it so the check is reproducible anywhere.
"$SUPABASE_BIN" gen types typescript --db-url "$DB_URL" --schema public > "$TMP" 2>/dev/null
[ -s "$TMP" ] || { echo "Type generation produced no output." >&2; rm -f "$TMP"; exit 2; }

NEW=$(mktemp)
{ [ -n "$HEADER" ] && printf '%s\n\n' "$HEADER"; cat "$TMP"; } > "$NEW"

if [ "$CHECK" = "1" ]; then
  if diff -q "$OUT" "$NEW" >/dev/null 2>&1; then
    echo "database.types.ts is up to date with the schema."
    rm -f "$TMP" "$NEW"; exit 0
  fi
  echo "DRIFT: database.types.ts does not match the live schema." >&2
  echo "Run 'npm run db:types' and commit the result." >&2
  diff "$OUT" "$NEW" | head -40 >&2
  rm -f "$TMP" "$NEW"; exit 1
fi

mv "$NEW" "$OUT"; rm -f "$TMP"
echo "Regenerated $OUT"
