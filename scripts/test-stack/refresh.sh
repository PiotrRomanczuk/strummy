#!/usr/bin/env bash
# Refresh StrummyTest — the `test` branch's database — from a dump, on uwh.
#
#   scripts/test-stack/refresh.sh --source prod-backup   latest production backup on the NAS (weekly)
#   scripts/test-stack/refresh.sh --source dev           the dev database, to exercise this script
#
# Steps, with the API (Kong) closed the whole time:
#   dump → wipe public/strummy_ops and auth data → restore → auth triggers →
#   pending migrations of this checkout → anonymise (one transaction, verified) → API open.
# On any failure the restored data is wiped again and the API stays closed:
# production data never sits in the test database unanonymised and reachable.
# Run from a checkout of the `test` branch (README.md). Prints counts only, never data.
set -euo pipefail

SOURCE=""
[ "${1:-}" = "--source" ] && SOURCE="${2:-}"
case "$SOURCE" in prod-backup | dev) ;; *) echo "usage: refresh.sh --source <prod-backup|dev>" >&2; exit 2 ;; esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIR="${STRUMMY_TEST_DIR:-$HOME/strummy-test}"
DB=supabase_db_StrummyTest
KONG=supabase_kong_StrummyTest
NAS="admin@192.168.1.25"
NAS_DUMP="/share/MD0_DATA/Backups/strummy-prod/daily/strummy-prod-latest.dump"

log() { echo "[$(date +%H:%M:%S)] $*"; }
sql() { docker exec -i -e PGOPTIONS="-c client_min_messages=warning" "$DB" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -qAt "$@"; }

[ "$(docker inspect -f '{{.State.Running}}' "$DB" 2>/dev/null)" = "true" ] || { echo "$DB is not running" >&2; exit 1; }
# shellcheck source=/dev/null
. "$DIR/test-users.env"
[ -n "${STRUMMY_TEST_USERS_PASSWORD:-}" ] || { echo "STRUMMY_TEST_USERS_PASSWORD missing in $DIR/test-users.env" >&2; exit 1; }
if [ "$SOURCE" = "prod-backup" ] && ! systemctl cat docker-user-rules.service 2>/dev/null | grep -q 57322; then
  echo "REFUSING: port 57322 is not limited to the LAN (docker-user-rules.service) — production data would be reachable" >&2
  exit 1
fi

# One writer at a time: deploy-db.yml's `migrate-db.sh test apply` waits on the same lock, so
# it never migrates a half-restored copy. Taken before the trap — a refused lock must not wipe.
exec 9>"$DIR/.lock"
flock -w 900 9 || { echo "StrummyTest is locked by deploy-db or another refresh — try later" >&2; exit 1; }
export STRUMMY_TEST_LOCKED=1 # the migrate-db.sh call below runs under this lock

WORK="$(mktemp -d)"
DONE=0
wipe() {
  # public exactly as Supabase sets it up (checked on the dev stack): owned by postgres,
  # usage for the API roles, and default privileges for the tables migrations create.
  # The comment too: pg_restore -n public does not bring it back, and the schema checks
  # compare StrummyTest with production line by line.
  sql -c "drop schema if exists public cascade;
          create schema public authorization postgres;
          comment on schema public is 'standard public schema';
          grant usage on schema public to anon, authenticated;
          grant usage, create on schema public to service_role;
          alter default privileges for role postgres in schema public
            grant select, insert, update, delete on tables to anon, authenticated, service_role;
          drop schema if exists strummy_ops cascade;" >/dev/null || true
  sql -c "do \$\$ declare t text; begin
    for t in select tablename from pg_tables where schemaname = 'auth' and tablename <> 'schema_migrations' loop
      execute format('truncate auth.%I cascade', t);
    end loop; end \$\$;" >/dev/null || true
}
on_exit() {
  rm -rf "$WORK"
  if [ "$DONE" != 1 ]; then
    log "FAILED — wiping the restored data; the API stays closed"
    wipe
  fi
}
trap on_exit EXIT

log "dump ($SOURCE)"
if [ "$SOURCE" = "dev" ]; then
  docker exec supabase_db_StrummyDevelopment pg_dump -U supabase_admin -Fc -d postgres \
    -n public -n auth -n strummy_ops >"$WORK/source.dump"
else
  scp -O -q -o BatchMode=yes -o ConnectTimeout=30 "$NAS:$NAS_DUMP" "$WORK/source.dump"
fi
docker cp "$WORK/source.dump" "$DB:/tmp/source.dump"

log "API closed"
docker stop "$KONG" >/dev/null

log "wipe"
wipe
# Production's extensions in production's schemas, and the schemas pg_restore -n does not create.
sql -c "create extension if not exists citext with schema public;
        create extension if not exists pg_trgm with schema public;
        create extension if not exists pg_net with schema extensions;
        create schema if not exists strummy_ops authorization postgres;" >/dev/null

restore_failed() { # file → exit when pg_restore reported errors
  grep -q "^pg_restore: error" "$1" || return 0
  grep "^pg_restore: error" "$1" | sed -E 's/(DETAIL|LINE).*//' | sort | uniq -c | head -20 >&2
  echo "restore had errors (above)" >&2
  exit 1
}

# auth first: profiles.user_id and api_keys.user_id reference auth.users.
log "restore auth data"
docker exec "$DB" pg_restore -l -n auth /tmp/source.dump | grep " TABLE DATA " | grep -v schema_migrations >"$WORK/auth.list"
docker exec -i "$DB" sh -c "cat > /tmp/auth.list" <"$WORK/auth.list"
docker exec "$DB" pg_restore -U supabase_admin -d postgres --data-only --disable-triggers -L /tmp/auth.list /tmp/source.dump 2>"$WORK/auth.err" || true
restore_failed "$WORK/auth.err"

# The dump carries every table's grants and the schema's default privileges.
log "restore public, strummy_ops"
docker exec "$DB" pg_restore -U supabase_admin -d postgres -n public -n strummy_ops /tmp/source.dump 2>"$WORK/restore.err" || true
restore_failed "$WORK/restore.err"

log "auth triggers (they call public functions, so after public)"
docker exec "$DB" sh -c "pg_restore -l -n auth /tmp/source.dump | grep ' TRIGGER auth ' > /tmp/auth-triggers.list"
docker exec "$DB" pg_restore -U supabase_admin -d postgres -L /tmp/auth-triggers.list /tmp/source.dump 2>"$WORK/trg.err" || true
restore_failed "$WORK/trg.err"

log "pending migrations of this checkout"
E2E_TEST_DB_CONTAINER="$DB" bash "$ROOT/scripts/e2e-remote/migrate-db.sh" test apply

log "anonymise (one transaction; aborts unless nothing real is left)"
{
  printf "\\\\set test_password '%s'\n" "$STRUMMY_TEST_USERS_PASSWORD"
  (cd "$ROOT" && npx -y tsx scripts/test-stack/build-anonymize-sql.ts)
} | docker exec -i "$DB" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q -f -

docker exec "$DB" rm -f /tmp/source.dump /tmp/auth-triggers.list /tmp/auth.list
DONE=1
docker start "$KONG" >/dev/null
log "API open — $(sql -c "select format('%s accounts, %s profiles, %s lessons, %s assignments', (select count(*) from auth.users), (select count(*) from public.profiles), (select count(*) from public.lessons), (select count(*) from public.assignments))")"
