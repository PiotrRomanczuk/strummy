#!/usr/bin/env bash
# Apply pending supabase/migrations to a Supabase stack on the EliteDesk (uwh).
# Run by .github/workflows/deploy-db.yml after every push to main — the step
# that used to be a human remembering `psql < file` (it was forgotten for
# #901: lesson_transcripts existed in dev and in main's code, never in prod).
#
#   migrate-db.sh <dev|prod> plan       list pending files, flag destructive ones (only ever
#                                       creates the bookkeeping table)
#   migrate-db.sh <dev|prod> apply      backup (prod) → apply pending in order → record each
#   migrate-db.sh <dev|prod> baseline <version>
#                                       record every file ≤ version as applied WITHOUT running
#                                       it (one-off, for a database migrated by hand)
#
# Bookkeeping lives in strummy_ops.applied_migrations — outside `public`, so the
# parity/replay/types checks never see it. supabase_migrations.schema_migrations
# is not used: it is missing on dev and stale on prod (last row 2026-08-12).
#
# Env: MIGRATE_ALLOW_DESTRUCTIVE=true to apply files the plan flags as destructive
# (set by the workflow only after a human approved the `production-db` environment).
#      MIGRATE_MAX_PENDING (default 10) — refuse a larger batch: that means the
# bookkeeping is wrong, not that ten migrations are really waiting.
set -euo pipefail

# `classify <file>...` needs no database: it prints why each file would need
# approval (or "additive") — the same rules `apply` enforces.
if [ "${1:-}" = "classify" ]; then
  CLASSIFY_ONLY=1
  TARGET=dev
  MODE=classify
else
  TARGET="${1:?usage: migrate-db.sh <dev|prod> <plan|apply|baseline> [version] | classify <file>...}"
  MODE="${2:?usage: migrate-db.sh <dev|prod> <plan|apply|baseline> [version]}"
fi
case "$TARGET" in
  dev) CONTAINER="${E2E_DEV_DB_CONTAINER:-supabase_db_StrummyDevelopment}" ;;
  prod) CONTAINER="${E2E_PROD_DB_CONTAINER:-supabase_db_StudentProduction}" ;;
  *) echo "target must be dev or prod" >&2; exit 2 ;;
esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATIONS_DIR="$ROOT/supabase/migrations"
MAX_PENDING="${MIGRATE_MAX_PENDING:-10}"
BACKUP_DIR="${MIGRATE_BACKUP_DIR:-$HOME/backups}"

# Statements that lose or rewrite data, or break running code — always need
# approval: drops, renames, type changes, truncate, delete, `update … set`
# (rewrites existing rows) and any `drop … cascade` (takes dependants with it).
# Adding never does. `drop function|view|trigger|policy|index|constraint|sequence`
# is allowed only when the same file recreates that name (see
# dropped_without_recreate): the idempotency idiom, not a removal.
DESTRUCTIVE_RE='(^|[^a-z_])(drop[[:space:]]+(table|column|type|schema|materialized[[:space:]]+view)|rename[[:space:]]+(to|column)|alter[[:space:]]+column[[:space:]]+[a-z_"]+[[:space:]]+(set[[:space:]]+data[[:space:]]+)?type|truncate[[:space:]]|delete[[:space:]]+from|update[[:space:]]+(only[[:space:]]+)?[a-z0-9_.]+[[:space:]]+set[[:space:]]|drop[[:space:]][^;]*[[:space:]]cascade)'

psql_q() { docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -qAt "$@"; }
psql_c() { docker exec "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -qAt "$@"; }

ensure_bookkeeping() {
  psql_q <<'SQL'
set client_min_messages = warning;
create schema if not exists strummy_ops;
create table if not exists strummy_ops.applied_migrations (
  version    text primary key,
  name       text not null,
  checksum   text not null,
  applied_at timestamptz not null default now(),
  applied_by text not null
);
SQL
}

version_of() { basename "$1" | cut -d_ -f1; }
checksum_of() { sha256sum "$1" | cut -d' ' -f1; }
# Lowercase, no comments, no quotes — and no function/procedure BODIES: an
# `update`/`delete` inside `create function … as $$ … $$` is stored code, not
# run by the migration. `do $$ … $$` blocks DO run, so they stay in.
normalized() {
  sed 's/--.*$//' "$1" | tr '[:upper:]' '[:lower:]' | tr -d '"' |
    perl -0pe 's/(create\s+(?:or\s+replace\s+)?(?:function|procedure)\b[^;]*?\bas\s+)\$(\w*)\$.*?\$\2\$/$1 \x27\x27/gs'
}

# Objects a migration may drop only to recreate them (the idempotency idiom).
# A drop with no matching create/add of the same name in the same file removes
# something that may still be needed — that needs a human, like a dropped table.
SOFT_DROP_RE='drop[[:space:]]+(function|view|trigger|policy|index|constraint|sequence)[[:space:]]+(if[[:space:]]+exists[[:space:]]+)?[a-z0-9_.]+'

dropped_without_recreate() {
  local sql="$1" kind name
  while read -r kind name; do
    [ -z "$name" ] && continue
    name="${name##*.}" # public.foo → foo
    case "$kind" in
      constraint) grep -qE "add[[:space:]]+constraint[[:space:]]+([a-z0-9_]+\.)?$name([^a-z0-9_]|$)" <<<"$sql" && continue ;;
      index) grep -qE "create[[:space:]]+(unique[[:space:]]+)?index[[:space:]]+(concurrently[[:space:]]+)?(if[[:space:]]+not[[:space:]]+exists[[:space:]]+)?([a-z0-9_]+\.)?$name([^a-z0-9_]|$)" <<<"$sql" && continue ;;
      *) grep -qE "create[[:space:]]+(or[[:space:]]+replace[[:space:]]+)?$kind[[:space:]]+(if[[:space:]]+not[[:space:]]+exists[[:space:]]+)?([a-z0-9_]+\.)?$name([^a-z0-9_]|$)" <<<"$sql" && continue ;;
    esac
    echo "drop $kind $name"
  done < <(grep -oE "$SOFT_DROP_RE" <<<"$sql" | sed -E 's/^drop[[:space:]]+//; s/[[:space:]]+if[[:space:]]+exists//' | awk '{print $1, $2}')
}

is_destructive() {
  local sql
  sql="$(normalized "$1")"
  grep -qE "$DESTRUCTIVE_RE" <<<"$sql" && return 0
  [ -n "$(dropped_without_recreate "$sql")" ]
}

# Prints "version checksum" for every recorded migration.
recorded() { psql_c -c "select version || ' ' || checksum from strummy_ops.applied_migrations"; }

# Fills PENDING (files not yet recorded, in order) and fails on an edited file.
collect_pending() {
  local recorded_list file version sum known
  recorded_list="$(recorded)"
  PENDING=()
  # fd 3, not stdin: anything in the body that runs `docker exec -i` would
  # otherwise swallow the rest of the file list.
  while IFS= read -r file <&3; do
    version="$(version_of "$file")"
    sum="$(checksum_of "$file")"
    known="$(grep -E "^$version " <<<"$recorded_list" | cut -d' ' -f2 || true)"
    if [ -z "$known" ]; then
      PENDING+=("$file")
    elif [ "$known" != "$sum" ]; then
      echo "EDITED: $(basename "$file") changed after it was applied to $TARGET." >&2
      echo "Migrations are immutable once merged — put the change in a new file." >&2
      exit 1
    fi
  done 3< <(find "$MIGRATIONS_DIR" -maxdepth 1 -name '2*.sql' | sort)
}

record() {
  local file="$1"
  psql_c -c "insert into strummy_ops.applied_migrations (version, name, checksum, applied_by)
             values ('$(version_of "$file")', '$(basename "$file")', '$(checksum_of "$file")', '${GITHUB_SHA:-manual}')
             on conflict (version) do update set checksum = excluded.checksum, applied_at = now()"
}

plan() {
  local file destructive=false
  for file in "${PENDING[@]}"; do
    if is_destructive "$file"; then
      echo "PENDING (DESTRUCTIVE) $(basename "$file")"
      destructive=true
    else
      echo "PENDING $(basename "$file")"
    fi
  done
  [ "${#PENDING[@]}" -eq 0 ] && echo "Nothing pending on $TARGET."
  [ -n "${GITHUB_OUTPUT:-}" ] && {
    echo "pending=${#PENDING[@]}"
    echo "destructive=$destructive"
  } >> "$GITHUB_OUTPUT"
  return 0
}

backup() {
  mkdir -p "$BACKUP_DIR"
  local out="$BACKUP_DIR/strummy-$TARGET-pre-migrate-$(date +%Y%m%d-%H%M%S)-${GITHUB_SHA:0:8}.dump"
  docker exec "$CONTAINER" pg_dump -U postgres -d postgres -Fc > "$out"
  echo "Backup: $out ($(du -h "$out" | cut -f1))"
  # Keep the 20 newest pre-migrate dumps per target; offsite backups are separate.
  ls -1t "$BACKUP_DIR"/strummy-"$TARGET"-pre-migrate-*.dump 2>/dev/null | tail -n +21 | xargs -r rm --
}

apply() {
  local file
  [ "${#PENDING[@]}" -eq 0 ] && { echo "Nothing pending on $TARGET."; return 0; }
  if [ "${#PENDING[@]}" -gt "$MAX_PENDING" ]; then
    echo "REFUSING: ${#PENDING[@]} pending files on $TARGET (max $MAX_PENDING)." >&2
    echo "The bookkeeping is probably behind the real schema — run 'baseline' first." >&2
    exit 1
  fi
  for file in "${PENDING[@]}"; do
    if is_destructive "$file" && [ "${MIGRATE_ALLOW_DESTRUCTIVE:-false}" != "true" ]; then
      echo "REFUSING: $(basename "$file") is destructive and was not approved." >&2
      exit 1
    fi
  done
  [ "$TARGET" = "prod" ] && backup
  local wrap
  for file in "${PENDING[@]}"; do
    echo "Applying $(basename "$file") to $TARGET…"
    # One transaction per file — unless the file manages its own: an inner
    # COMMIT would end psql's outer transaction early. A lock we cannot get in
    # 5 s aborts the file instead of queueing every query behind it on a live DB.
    wrap=(--single-transaction)
    grep -qiE '^[[:space:]]*(begin|commit)[[:space:]]*;' "$file" && wrap=()
    docker exec -i -e PGOPTIONS='-c lock_timeout=5s -c statement_timeout=120s' "$CONTAINER" \
      psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q "${wrap[@]}" < "$file"
    record "$file"
  done
  echo "Applied ${#PENDING[@]} migration(s) to $TARGET."
}

baseline() {
  local upto="${1:?baseline needs a version, e.g. 20261019120000}" file count=0
  # fd 3: record() runs `docker exec -i`, which would read the list from stdin.
  while IFS= read -r file <&3; do
    [[ "$(version_of "$file")" > "$upto" ]] && continue
    record "$file"
    count=$((count + 1))
  done 3< <(find "$MIGRATIONS_DIR" -maxdepth 1 -name '2*.sql' | sort)
  echo "Recorded $count migration(s) ≤ $upto on $TARGET as applied (nothing was run)."
}

classify() {
  local file sql reasons
  for file in "$@"; do
    sql="$(normalized "$file")"
    reasons="$(grep -oE "$DESTRUCTIVE_RE" <<<"$sql" | sed -E 's/^[^a-z]//' | sort -u; dropped_without_recreate "$sql")"
    if [ -n "$reasons" ]; then
      echo "NEEDS APPROVAL $(basename "$file"): $(tr '\n' ';' <<<"$reasons" | sed 's/;$//')"
    else
      echo "additive $(basename "$file")"
    fi
  done
}

if [ "${CLASSIFY_ONLY:-0}" = 1 ]; then
  shift
  classify "$@"
  exit 0
fi

docker inspect "$CONTAINER" > /dev/null 2>&1 || { echo "Container $CONTAINER not running." >&2; exit 1; }
ensure_bookkeeping

case "$MODE" in
  plan) collect_pending && plan ;;
  apply) collect_pending && apply ;;
  baseline) baseline "${3:-}" ;;
  *) echo "mode must be plan, apply or baseline" >&2; exit 2 ;;
esac
