#!/usr/bin/env bash
#
# Strummy cron trigger (OPTIONAL, local-server) — fires the "dark" cron jobs
# (the ones NOT covered by Vercel's direct crons) against the deployed prod app.
# Intended to run from a systemd user timer on the home box (uwh) as a zero-cost
# alternative to cloud crons. Inert until activated (see scripts/cron/README.md).
#
#   ./strummy-cron.sh daily   -> lesson + assignment reminders, overdue check,
#                                calendar sync, admin monitoring (once/day)
#   ./strummy-cron.sh queue   -> process notification queue (frequent)
#
# Secret + URL come from ~/.config/strummy-cron.env (chmod 600). The bearer
# token is NEVER written to the log — only endpoint + HTTP status.
#
set -euo pipefail

ENVF="$HOME/.config/strummy-cron.env"
LOG="$HOME/.local/state/strummy-cron.log"
mkdir -p "$(dirname "$LOG")"
ts() { date -u +%Y-%m-%dT%H:%M:%SZ; }

[ -f "$ENVF" ] || { echo "$(ts) [setup] no $ENVF — inactive; skipping" | tee -a "$LOG"; exit 0; }
# shellcheck disable=SC1090
. "$ENVF"

# Inactive until the operator sets a real secret: no prod call, no failed unit,
# no wasted invocations. Handles unset, empty, or the shipped placeholder.
if [ -z "${CRON_SECRET:-}" ] || [ "${CRON_SECRET:-}" = "REPLACE_WITH_PROD_CRON_SECRET" ]; then
  echo "$(ts) [setup] CRON_SECRET not configured in $ENVF — inactive; skipping" | tee -a "$LOG"
  exit 0
fi
: "${PRODUCTION_URL:?PRODUCTION_URL not set in $ENVF}"

mode="${1:-daily}"
case "$mode" in
  daily) endpoints=(lesson-reminders assignment-due-reminders assignment-overdue-check calendar-sync admin-monitoring) ;;
  queue) endpoints=(process-notification-queue) ;;
  *) echo "usage: $0 {daily|queue}" >&2; exit 2 ;;
esac

fail=0
for ep in "${endpoints[@]}"; do
  code=$(curl -sS -m 120 -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    "${PRODUCTION_URL%/}/api/cron/${ep}" || echo "000")
  if [ "$code" -ge 200 ] && [ "$code" -lt 400 ]; then
    echo "$(ts) [$mode] $ep -> $code OK" | tee -a "$LOG"
  else
    echo "$(ts) [$mode] $ep -> $code FAIL" | tee -a "$LOG" >&2
    fail=1
  fi
done
exit "$fail"
