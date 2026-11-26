#!/usr/bin/env bash
# Starts nightly-e2e.yml from uwh (strummy-nightly-e2e-*.timer).
#
#   trigger.sh nightly   always dispatches: the full device matrix, once a night
#   trigger.sh daytime   dispatches only when `dev` or the dev schema changed
#                        since the last timer run — otherwise it would re-test
#                        a state that already has a report
#
# The suite runs against the dev stack, so it tests the `dev` branch: the code
# whose migrations that database holds. Testing `main` there failed every night
# once a migration reached dev before main (#1115 → student-intake, 2026-11).
#
# "Changed" is decided without any state on this host: the key
# <dev sha>-<dev schema hash> goes into the run's name, and the next check
# looks for it among the workflow's recent runs. See README.md next to this file.
set -euo pipefail

KIND="${1:?usage: trigger.sh <nightly|daytime>}"
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_SLUG="${REPO_SLUG:-PiotrRomanczuk/strummy}"
DEV="${DEV_DB_CONTAINER:-supabase_db_StrummyDevelopment}"
WORKFLOW=nightly-e2e.yml
BRANCH="${NIGHTLY_BRANCH:-dev}"

# shellcheck source=../../e2e-remote/schema-dump.lib.sh
source "$HERE/../../e2e-remote/schema-dump.lib.sh"

log() { echo "[nightly-e2e $KIND] $*"; }

case "$KIND" in nightly | daytime) ;; *) echo "unknown kind '$KIND'" >&2; exit 64 ;; esac

# Empty when the dev database cannot be dumped. An empty dump must never be
# hashed: every outage would produce the same "schema" and look already tested.
state_key() {
  local sha dump
  sha="$(gh api "repos/$REPO_SLUG/commits/$BRANCH" -q .sha)" || return 0
  dump="$(dump_public_schema "$DEV" postgres)" || true
  [ -n "$sha" ] && [ -n "$dump" ] || return 0
  echo "${sha:0:8}-$(sha256sum <<<"$dump" | cut -c1-8)"
}

# Any run of this key counts — queued, running, green or red. A red one is not
# retried here: the same code on the same schema fails the same way, and the
# nightly run comes round regardless.
already_tested() {
  gh run list -R "$REPO_SLUG" -w "$WORKFLOW" --branch "$BRANCH" --limit 30 \
    --json displayTitle -q '.[].displayTitle' | grep -qF " · $1"
}

key="$(state_key)"

if [ "$KIND" = "daytime" ]; then
  [ -n "$key" ] || { log "cannot read $BRANCH or the dev schema ($DEV) — not dispatching"; exit 1; }
  if already_tested "$key"; then
    log "$key already has a run — nothing changed, skipping"
    exit 0
  fi
fi

# The nightly goes out even without a key: if the dev stack is down, a red run
# with a report is the alarm, and silence is not.
if [ -n "${NIGHTLY_TRIGGER_DRY_RUN:-}" ]; then
  log "dry run — would dispatch $WORKFLOW (key: ${key:-none})"
  exit 0
fi
gh workflow run "$WORKFLOW" -R "$REPO_SLUG" --ref "$BRANCH" -f kind="$KIND" -f key="$key"
log "dispatched (key: ${key:-none})"
