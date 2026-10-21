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

# ── Scratch databases inside a container ───────────────────────────────────
# Both checks rebuild a schema in a throwaway database inside the DEV
# container: check-migrations-replay.sh from the whole chain, check-db-parity.sh
# from production's schema plus the migrations a PR adds. Only ever the named
# scratch database is written; `postgres` on either stack is never touched.

# Schemas our migrations depend on but do not own: `auth` and `storage` belong
# to GoTrue and Storage, `extensions` is where the Supabase image installs
# citext/pgcrypto/pg_trgm. Copied from the container's own database as fixtures.
SERVICE_FIXTURE_SCHEMAS="${MIGRATION_FIXTURE_SCHEMAS:-extensions auth storage}"

# Drop and recreate <db>. `with (force)` ends sessions an aborted run left behind.
# Args: <container> <db> <log>
create_scratch_db() {
  local container="$1" db="$2" log="$3"
  docker exec "$container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q \
    -c "drop database if exists \"$db\" with (force)" \
    -c "create database \"$db\"" >> "$log" 2>&1 || return 1
  # template1 carries COMMENT ON SCHEMA public = 'standard public schema'; a
  # Supabase-provisioned database has none. Match the real stacks.
  docker exec "$container" psql -U postgres -d "$db" -q \
    -c "comment on schema public is null" >> "$log" 2>&1
}

drop_scratch_db() {
  docker exec "$1" psql -U postgres -d postgres -q \
    -c "drop database if exists \"$2\" with (force)" >/dev/null 2>&1
}

# Run SQL from stdin against <db> in <container>, stopping at the first error.
psql_into() {
  docker exec -i "$1" psql -U postgres -d "$2" -v ON_ERROR_STOP=1 -q
}

# Install the service fixture schemas from the container's `postgres` database.
# Post-data is filtered: a fixture statement mentioning `public.` is ours, not
# the service's (e.g. our on_auth_user_created trigger on auth.users calls
# public.handle_new_user(), which our own schema creates later). Post-data still
# carries the PKs our FKs to auth.users need, so it cannot be skipped.
# Args: <container> <db> <log>
install_service_fixtures() {
  local container="$1" db="$2" log="$3" schema section
  for section in pre-data post-data; do
    for schema in $SERVICE_FIXTURE_SCHEMAS; do
      docker exec "$container" pg_dump -U postgres -d postgres --schema-only \
        --section="$section" -n "$schema" --no-owner --no-privileges 2>>"$log" |
        { if [ "$section" = post-data ]; then awk 'BEGIN{RS="";ORS="\n\n"} !/public\./'; else cat; fi; } |
        psql_into "$container" "$db" >> "$log" 2>&1 ||
        { echo "failed to install fixture schema '$schema' ($section, see $log)" >&2; return 1; }
    done
  done
}
