#!/bin/bash
# Regenerate types/database.types.ts from a live database.
#
# This file is the SINGLE source of Supabase schema types. Never hand-edit it —
# before 2026-07-30 there were three divergent copies (root database.types.ts,
# types/database.types.ts, types/database.types.generated.ts), each stale in a
# different direction, and ~1/3 of app/ was type-checking against a schema that
# predated the July identity rebuild. That masked 18 real type errors.
#
# Usage:
#   npm run db:types            # regenerate (writes the file)
#   npm run db:types:check      # regenerate + fail if it differs from git
#
# Target: defaults to the StudentDevelopment stack on uwh. Override with
# SUPABASE_DB_URL to point elsewhere. Dev and prod are verified schema-identical,
# so dev is the correct source.
#
# Requires Docker (the supabase CLI shells out to it). If Docker is not running
# locally, the stack's own postgres-meta can generate the same output:
#   curl -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
#     "http://192.168.1.75:55321/pg/generators/typescript?included_schemas=public"
# where $KEY is SUPABASE_LOCAL_SERVICE_ROLE_KEY from .env.local.

set -euo pipefail

OUT="types/database.types.ts"
DB_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@192.168.1.75:55322/postgres}"

if ! command -v supabase >/dev/null 2>&1; then
  echo "error: supabase CLI not found. Install it, or use the pg-meta fallback above." >&2
  exit 1
fi

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

echo "Generating $OUT from ${DB_URL%%\?*}" >&2
supabase gen types typescript --db-url "$DB_URL" --schema public > "$TMP"

if [ ! -s "$TMP" ]; then
  echo "error: generator produced an empty file — refusing to overwrite $OUT" >&2
  exit 1
fi

# Format on the way out so generation and the repo's prettier config agree;
# otherwise db:types:check reports a diff on every run.
npx prettier --parser typescript --stdin-filepath "$OUT" < "$TMP" > "$OUT"

echo "Wrote $OUT ($(wc -l < "$OUT" | tr -d ' ') lines)" >&2
