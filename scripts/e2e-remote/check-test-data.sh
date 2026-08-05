#!/usr/bin/env bash
# Read-only test-data hygiene report: flags QA/test-account activity that has
# drifted into StudentProduction (real students' data lives in the same
# tables, so nothing here is ever deleted automatically).
#
# Runs on the EliteDesk, where StudentDevelopment is a local Docker container
# and StudentProduction is reached over the LAN using that same container's
# psql client (same trick as check-db-parity.sh's dump_prod — no repo secrets,
# no second Postgres client to install).
#
# NEVER writes to either database. Never fails the build on its own — this is
# a report, not a gate. Findings go to stdout (captured into the job summary)
# and to the artifact path passed as $1.
#
#   check-test-data.sh [report-output-path]
set -uo pipefail

# shellcheck source=scripts/e2e-remote/schema-dump.lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/schema-dump.lib.sh"

DEV="${E2E_DEV_DB_CONTAINER:-supabase_db_StudentDevelopment}"
PROD="${E2E_PROD_DB_CONTAINER:-supabase_db_StudentProduction}"
PROD_HOST="${E2E_PROD_DB_HOST:-192.168.1.75}"
PROD_PORT="${E2E_PROD_DB_PORT:-54322}"
OUT="${1:-/tmp/strummy-test-data-report.txt}"

require_container "$DEV"
require_container "$PROD"

psql_prod() {
  local pw
  pw=$(docker exec "$PROD" printenv POSTGRES_PASSWORD)
  docker exec -e PGPASSWORD="$pw" "$DEV" psql -h "$PROD_HOST" -p "$PROD_PORT" \
    -U postgres -d postgres -At -F $'\t' -c "$1" 2>/dev/null
}

psql_dev() {
  docker exec "$DEV" psql -U postgres -d postgres -At -F $'\t' -c "$1" 2>/dev/null
}

CRITICAL=0
{
  echo "Test-data hygiene report — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "=================================================="

  # --- CRITICAL: is_development must never be true in production. ---
  DEV_FLAGGED_IN_PROD=$(psql_prod "select count(*) from profiles where is_development;")
  echo
  echo "[prod] profiles.is_development = true: ${DEV_FLAGGED_IN_PROD:-?}"
  if [ "${DEV_FLAGGED_IN_PROD:-0}" != "0" ]; then
    echo "  CRITICAL: dev-flagged profile(s) present in StudentProduction."
    CRITICAL=1
  fi

  # --- INFO: plus-addressed emails in prod (may be legitimate documented ---
  # --- test accounts, or undocumented QA drift — human judgment call). ---
  echo
  echo "[prod] profiles with a '+' in the email local-part (plus-aliasing):"
  psql_prod "select id, full_name, is_teacher, is_student, is_shadow, created_at
             from profiles where split_part(email,'@',1) like '%+%'
             order by created_at;" | sed 's/^/  /'

  # --- INFO: duplicate lesson bookings (same teacher/student/time), real or ---
  # --- test — a repeated-submission bug looks identical to test clutter. ---
  echo
  echo "[prod] duplicate lesson bookings (same teacher_id, student_id, scheduled_at):"
  psql_prod "select teacher_id, student_id, scheduled_at, count(*)
             from lessons group by teacher_id, student_id, scheduled_at
             having count(*) > 1 order by scheduled_at;" | sed 's/^/  /'

  # --- INFO: duplicate song-of-the-week rows (same song + same window). ---
  echo
  echo "[prod] duplicate song_of_the_week rows (same song, active window):"
  psql_prod "select song_id, active_from, active_until, count(*)
             from song_of_the_week group by song_id, active_from, active_until
             having count(*) > 1 order by active_from;" | sed 's/^/  /'

  # --- Context only: dev is expected to be full of synthetic data. ---
  echo
  echo "[dev] profiles: $(psql_dev "select count(*) from profiles;") total, \
$(psql_dev "select count(*) from profiles where is_development;") flagged is_development"

  echo
  if [ "$CRITICAL" = "1" ]; then
    echo "Result: CRITICAL findings above — investigate before the next release."
  else
    echo "Result: no critical findings. Review INFO sections for drift worth cleaning up."
  fi
} | tee "$OUT"

exit 0
