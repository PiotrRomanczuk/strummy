#!/usr/bin/env bash
# Sync the working tree to the EliteDesk and run the E2E suite THERE, detached,
# so this MacBook stays usable. The run survives the Mac sleeping/disconnecting.
#
#   scripts/e2e-remote/run.sh                       # full suite
#   scripts/e2e-remote/run.sh tests/e2e/student     # subset (args pass through)
#
# Monitor:  scripts/e2e-remote/status.sh  (-w watch, -f fetch results)
set -euo pipefail

REMOTE="${E2E_REMOTE_HOST:-uwh}"
REMOTE_DIR="${E2E_REMOTE_DIR:-e2e/strummy}" # relative to $HOME on the remote
LOCAL_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if ssh "$REMOTE" "grep -q TESTING ~/$REMOTE_DIR/.e2e-remote/state 2>/dev/null"; then
  echo "A remote run is already in TESTING state. Check scripts/e2e-remote/status.sh" >&2
  exit 1
fi

echo "== rsync -> $REMOTE:~/$REMOTE_DIR =="
ssh "$REMOTE" "mkdir -p ~/$REMOTE_DIR"
rsync -az --delete \
  --exclude .git \
  --exclude node_modules \
  --exclude .next \
  --exclude test-results \
  --exclude playwright-report \
  --exclude .e2e-remote \
  --exclude .claude/worktrees \
  --exclude coverage \
  "$LOCAL_ROOT/" "$REMOTE:$REMOTE_DIR/"

echo "== launching detached runner on $REMOTE =="
ssh "$REMOTE" "cd ~/$REMOTE_DIR && mkdir -p .e2e-remote && \
  setsid nohup bash scripts/e2e-remote/remote-runner.sh $* \
    > .e2e-remote/run.log 2>&1 < /dev/null & disown"

# Verify detachment: the runner must be parented to init (PPID 1), or it dies
# with this SSH session.
PID=$(ssh "$REMOTE" "pgrep -f 'scripts/e2e-remote/remote-runner.sh' | head -1" || true)
if [ -z "$PID" ]; then
  echo "Runner did not start — check ~/$REMOTE_DIR/.e2e-remote/run.log on $REMOTE" >&2
  exit 1
fi
PPID_REMOTE=$(ssh "$REMOTE" "ps -o ppid= -p $PID | tr -d ' '" || true)
if [ "$PPID_REMOTE" != "1" ]; then
  echo "WARNING: runner PPID is $PPID_REMOTE (expected 1) — it may die on disconnect" >&2
fi

echo "Runner started on $REMOTE (pid $PID, detached)."
echo "  scripts/e2e-remote/status.sh      # snapshot"
echo "  scripts/e2e-remote/status.sh -w   # live watch"
echo "  scripts/e2e-remote/status.sh -f   # fetch report when done"
