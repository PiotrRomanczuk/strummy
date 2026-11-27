#!/usr/bin/env bash
# Installs / updates the production notification-queue timer on uwh.
# Run as the owner from the prod-audit checkout (README.md next to this file):
#
#   ./install.sh            copy the units, create the non-secret config
#   ./install.sh --enable   … and start the timer (needs the .secret file)
#
# Never writes or prints the secret. Idempotent: re-run after a unit-file change.
set -euo pipefail

ENABLE="${1:-}"
HERE="$(cd "$(dirname "$0")" && pwd)"
UNIT_DIR="$HOME/.config/systemd/user"
CONFIG_DIR="$HOME/.config/strummy"
ENV_FILE="$CONFIG_DIR/notification-queue-prod.env"
SECRET_FILE="$CONFIG_DIR/notification-queue-prod.secret"
TIMER="strummy-notification-queue.timer"

export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"

install -d -m 755 "$UNIT_DIR"
install -m 644 "$HERE/strummy-notification-queue.service" "$HERE/$TIMER" "$UNIT_DIR/"
systemctl --user daemon-reload
echo "units installed in $UNIT_DIR"

install -d -m 700 "$CONFIG_DIR"
if [ ! -f "$ENV_FILE" ]; then
  (umask 077 && printf 'STRUMMY_BASE_URL=https://strummy.online\n' >"$ENV_FILE")
  echo "created $ENV_FILE"
fi

has_unit() { systemctl --user list-unit-files "$1" --no-legend 2>/dev/null | grep -q .; }

# The retired scripts/cron/ timers would drain the same queue a second time.
for old in strummy-cron-queue.timer strummy-cron-daily.timer; do
  if has_unit "$old"; then
    echo "WARNING: $old is installed — disable it: systemctl --user disable --now $old" >&2
  fi
done
has_unit 'unit-failure-mail@.service' ||
  echo "WARNING: unit-failure-mail@.service (home-ops) is not installed — a failed run will not mail" >&2

if [ ! -f "$SECRET_FILE" ]; then
  echo "missing $SECRET_FILE — write the CRON_SECRET there (mode 600), see README.md"
  if [ "$ENABLE" = "--enable" ]; then
    echo "not enabling $TIMER without it" >&2
    exit 1
  fi
  exit 0
fi

if [ "$ENABLE" = "--enable" ]; then
  systemctl --user enable --now "$TIMER"
  systemctl --user list-timers "$TIMER" --no-pager
fi
