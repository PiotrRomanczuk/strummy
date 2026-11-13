# shellcheck shell=bash
# Sourced by the raw-psql rebuild tools (local-cutover.sh, validate-migrations.sh). Requires an
# explicit target and refuses the production cluster: on uwh port 54322 is StudentProduction
# (dev is 55322); on the Mac 127.0.0.1:54322 is the local StrummyLocal stack, which is fine.
require_non_production_target() {
  local host="$1" port="$2"
  if [ -z "$host" ] || [ -z "$port" ]; then
    echo "Set PGHOST_ and PGPORT_ explicitly (dev on uwh: 192.168.1.75 / 55322; Mac local stack: 127.0.0.1 / 54322)." >&2
    exit 2
  fi
  [ "$port" = 54322 ] || return 0
  local is_loopback=0
  case "$host" in 127.0.0.1 | localhost | ::1) is_loopback=1 ;; esac
  if [ "$is_loopback" = 0 ] || docker ps --format '{{.Names}}' 2>/dev/null | grep -qx supabase_db_StudentProduction; then
    echo "Refusing $host:$port — that is the production Postgres (StudentProduction)." >&2
    exit 3
  fi
}

# For tools that use the Supabase CLI or the localhost:54321/54322 defaults (setup-db.sh, seed-db.sh):
# those are the Mac's local stack, but on uwh the same ports belong to StudentProduction.
refuse_on_production_host() {
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx supabase_db_StudentProduction; then
    echo "Refusing to run here: this host runs StudentProduction (uwh), where localhost:54321/54322 is production." >&2
    echo "Run it on the Mac's local stack." >&2
    exit 3
  fi
}
