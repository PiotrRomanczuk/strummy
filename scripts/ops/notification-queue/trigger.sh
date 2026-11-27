#!/usr/bin/env bash
# Drains Strummy's notification queue: GET /api/cron/process-notification-queue
# with the CRON_SECRET bearer, the same call the daily Vercel dispatcher makes.
# Run every 10 minutes by strummy-notification-queue@<instance>.timer on uwh.
#
#   trigger.sh prod   → $STRUMMY_BASE_URL from notification-queue-prod.env
#   trigger.sh dev    → e.g. http://localhost:3000 for a manual test
#
# Config, per instance, in $STRUMMY_QUEUE_CONFIG_DIR (default ~/.config/strummy):
#   notification-queue-<instance>.env     STRUMMY_BASE_URL=https://…   (no secret)
#   notification-queue-<instance>.secret  the CRON_SECRET value, one line, mode 600
# The secret never reaches argv, the log or the journal: curl reads the header
# from stdin.
#
# Exit status — this is the alarm. The unit's OnFailure= mails the journal.
#   0  queue drained and nothing is pending more than an hour past its due time
#   1  the call failed (HTTP, success:false) or backlog.isStale — at most once per
#      $ALARM_REPEAT_MINUTES (default 360) per instance; runs in between log the
#      problem and exit 0, so a long outage mails every 6 h, not every 10 min
#   64 usage / configuration error
set -euo pipefail

INSTANCE="${1:?usage: trigger.sh <instance>   (e.g. prod)}"
CONFIG_DIR="${STRUMMY_QUEUE_CONFIG_DIR:-$HOME/.config/strummy}"
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/strummy-notification-queue"
ALARM_REPEAT_MINUTES="${ALARM_REPEAT_MINUTES:-360}"
ENV_FILE="$CONFIG_DIR/notification-queue-$INSTANCE.env"
SECRET_FILE="$CONFIG_DIR/notification-queue-$INSTANCE.secret"
ALARM_STAMP="$STATE_DIR/$INSTANCE.alarm"

log() { echo "[notification-queue $INSTANCE] $*"; }
die() { log "$*" >&2; exit 64; }

[[ "$INSTANCE" =~ ^[a-z0-9-]+$ ]] || die "instance must be [a-z0-9-]+"
[ -f "$ENV_FILE" ] || die "missing $ENV_FILE (see README.md next to this script)"
[ -f "$SECRET_FILE" ] || die "missing $SECRET_FILE (see README.md next to this script)"

perm="$(stat -c %a "$SECRET_FILE" 2>/dev/null || stat -f %Lp "$SECRET_FILE")"
[ "${perm: -2}" = "00" ] || die "$SECRET_FILE is mode $perm — chmod 600 it"

# shellcheck disable=SC1090
. "$ENV_FILE"
: "${STRUMMY_BASE_URL:?STRUMMY_BASE_URL not set in $ENV_FILE}"
CRON_SECRET="$(head -n1 "$SECRET_FILE" | tr -d '\r\n')"
[ -n "$CRON_SECRET" ] || die "$SECRET_FILE is empty"

URL="${STRUMMY_BASE_URL%/}/api/cron/process-notification-queue"
BODY="$(mktemp)"
trap 'rm -f "$BODY"' EXIT

# curl --config - : the bearer comes in on stdin, never on the command line.
code="$(printf 'header = "Authorization: Bearer %s"\n' "$CRON_SECRET" |
  curl --config - -sS -m 90 -o "$BODY" -w '%{http_code}' "$URL" || true)"
code="${code:-000}" # curl writes 000 itself when it cannot connect
unset CRON_SECRET

# One line for the journal, and the verdict: ok | stale | failed.
verdict="$(python3 "$(dirname "$0")/read-response.py" "$code" "$BODY")" || verdict="failed bad response"
log "$verdict"

if [ "${verdict%% *}" = "ok" ]; then
  if [ -f "$ALARM_STAMP" ]; then log "recovered — clearing alarm"; rm -f "$ALARM_STAMP"; fi
  exit 0
fi

mkdir -p "$STATE_DIR"
now="$(date +%s)"
last="$(cat "$ALARM_STAMP" 2>/dev/null || echo 0)"
if [ $((now - last)) -lt $((ALARM_REPEAT_MINUTES * 60)) ]; then
  log "alarm already raised at $(date -d "@$last" '+%F %T' 2>/dev/null || echo "$last") — not repeating yet"
  exit 0
fi
echo "$now" >"$ALARM_STAMP"
log "ALARM: notification queue is not being delivered on time" >&2
exit 1
