#!/usr/bin/env bash
# Strummy dev agent — one unattended pass on uwh (strummy-dev-agent.timer).
#
# Red Nightly → triage the failure. Green streak → implement the next roadmap
# gap. Either way the agent only edits files and runs tests; this script owns
# git, the PR and auto-merge, so the agent never holds push or database access.
# See README.md next to this file.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(git -C "$HERE" rev-parse --show-toplevel)"
STATE="${DEV_AGENT_STATE:-$HOME/strummy-dev-agent}"
WORK="$REPO/.dev-agent"
BUDGET_USD="${DEV_AGENT_BUDGET_USD:-25}"
AGENT_TIMEOUT="${DEV_AGENT_TIMEOUT:-3h}"

# shellcheck source=gate.sh
source "$HERE/gate.sh"
# shellcheck source=ship.sh
source "$HERE/ship.sh"

log() { echo "[dev-agent $(date -u +%FT%TZ)] $*" | tee -a "$STATE/history.log"; }

mkdir -p "$STATE"
cd "$REPO"

pr="$(open_agent_pr)"
if [ -n "$pr" ]; then
  log "agent PR #$pr still open — one at a time, nothing to do"
  exit 0
fi

read -r mode detail <<<"$(nightly_mode)"
if [ "$mode" = "wait" ]; then
  log "gate closed: $detail"
  exit 0
fi
log "gate open: $mode ${detail:-}"

# Fresh tree on top of origin/main (the unit's ExecStartPre already reset it).
rm -rf "$WORK" && mkdir -p "$WORK"
lock_hash="$(sha256sum package-lock.json | cut -d' ' -f1)"
if [ ! -d node_modules ] || [ "$(cat "$STATE/lock.hash" 2>/dev/null)" != "$lock_hash" ]; then
  npm ci --no-audit --no-fund >"$WORK/npm-ci.log" 2>&1
  echo "$lock_hash" >"$STATE/lock.hash"
fi

# Context the agent reads instead of being given network tools.
git --git-dir "$HOME/git/planner.git" show HEAD:1-Projekty/Strummy/Strummy.md \
  >"$WORK/vault-strummy.md" 2>/dev/null || echo "(vault note unavailable)" >"$WORK/vault-strummy.md"
if [ "$mode" = "triage" ]; then
  issue="$(gh issue list -R "$REPO_SLUG" --label nightly-e2e --state open --limit 1 --json number -q '.[0].number // empty')"
  echo "$issue" >"$WORK/nightly-issue-number"
  [ -n "$issue" ] && gh issue view "$issue" -R "$REPO_SLUG" --json body -q .body >"$WORK/nightly-issue.md"
  gh run view "$detail" -R "$REPO_SLUG" --log-failed 2>/dev/null | tail -c 200000 >"$WORK/failed-log.txt" || true
fi

# Edits and tests only: no git push, no gh, no docker/psql — uwh hosts the
# production database, and this session runs with nobody watching.
ALLOWED="Read Edit Write Glob Grep \
Bash(npm run lint) Bash(npm run lint *) Bash(npm run typecheck) Bash(npm run check:structure *) \
Bash(npm test) Bash(npm test *) Bash(npx jest *) \
Bash(git diff *) Bash(git status *) Bash(git log *) Bash(git show *) Bash(ls *)"
DENIED="Bash(git push *) Bash(git commit *) Bash(gh *) Bash(docker *) Bash(psql *) Bash(ssh *) Bash(curl *) WebFetch WebSearch"

log "agent start ($mode, budget \$$BUDGET_USD, timeout $AGENT_TIMEOUT)"
set +e
timeout "$AGENT_TIMEOUT" claude -p "$(cat "$HERE/prompts/$mode.md")" \
  --permission-mode acceptEdits \
  --allowedTools "$ALLOWED" --disallowedTools "$DENIED" \
  --max-budget-usd "$BUDGET_USD" --output-format text >"$WORK/agent.log" 2>&1
agent_exit=$?
set -e
log "agent exit $agent_exit"

ship_result "$mode"
