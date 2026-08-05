#!/usr/bin/env bash
# Shared schema-dump helpers for the two read-only schema checks that run on
# the EliteDesk runner:
#
#   check-db-parity.sh        prod   public schema  ==  dev public schema
#   check-migrations-replay.sh  supabase/migrations replayed  ==  dev public schema
#
# Both compare pg_dump output textually, so both need the SAME canonicalization
# or they drift apart within a month. Source this file; do not copy normalize().
#
#   source "$(dirname "${BASH_SOURCE[0]}")/schema-dump.lib.sh"

# Strip everything that is noise for a schema comparison: comments, session
# GUCs, the search_path preamble, and psql's \restrict fencing.
#
# The sed canonicalizes CHECK-constraint array casts: constraint text is
# deparsed SERVER-side (pg_get_constraintdef), so different Postgres server
# versions render the same constraint differently — e.g.
#   ANY (ARRAY[('a'::character varying)::text, ...])     vs
#   ANY ((ARRAY['a'::character varying, ...])::text[])
# Both collapse to ANY (ARRAY['a', ...]). Comparison-only, applied to both sides.
normalize() {
  grep -vE '^--|^SET |^SELECT pg_catalog|^\\(un)?restrict|^$' |
    sed -E "s/\('([^']+)'::character varying\)::text/'\1'/g; s/'([^']+)'::character varying/'\1'/g; s/\(\(ARRAY\[/(ARRAY[/g; s/\]\)::text\[\]\)/])/g"
}

# pg_dump the public schema of a database reachable from inside $container.
# Args: <container> <dbname> [extra pg_dump args...]
dump_public_schema() {
  local container="$1" db="$2"
  shift 2
  docker exec "$container" pg_dump -U postgres -d "$db" \
    --schema-only -n public --no-owner --no-privileges "$@" 2>/dev/null | normalize
}

# Fail fast with a distinguishable exit code when a stack is not up: the caller
# must not report "no drift" for a check that never ran.
require_container() {
  local container="$1"
  docker exec "$container" true 2>/dev/null ||
    { echo "DB container '$container' unavailable" >&2; exit 2; }
}
