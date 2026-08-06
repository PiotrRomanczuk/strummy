#!/usr/bin/env bash
# Monitor the remote E2E run (started by run.sh) from the Mac.
#
#   scripts/e2e-remote/status.sh      # one-shot snapshot
#   scripts/e2e-remote/status.sh -w   # refresh every 10s until DONE/FAILED
#   scripts/e2e-remote/status.sh -t   # stream run.log/test.log live until DONE/FAILED
#   scripts/e2e-remote/status.sh -f   # fetch results.json + HTML report back
set -euo pipefail

REMOTE="${E2E_REMOTE_HOST:-uwh}"
REMOTE_DIR="${E2E_REMOTE_DIR:-e2e/strummy}"
MODE="${1:-}"

snapshot() {
  ssh "$REMOTE" "cd ~/$REMOTE_DIR 2>/dev/null || { echo 'no remote checkout yet'; exit 0; }
    echo \"state: \$(cat .e2e-remote/state 2>/dev/null || echo '(no run yet)')\"
    if [ -f .e2e-remote/test.log ]; then
      printf 'tests: %s passed, %s failed so far\n' \
        \"\$(grep -c '✓' .e2e-remote/test.log)\" \
        \"\$(grep -c '✘' .e2e-remote/test.log)\"
      echo '--- test.log tail ---'
      tail -4 .e2e-remote/test.log
    else
      echo '--- run.log tail ---'
      tail -4 .e2e-remote/run.log 2>/dev/null || true
    fi"
}

fetch() {
  echo "== fetching results from $REMOTE =="
  mkdir -p test-results
  rsync -az "$REMOTE:$REMOTE_DIR/test-results/results.json" \
    test-results/remote-results.json 2>/dev/null &&
    echo "-> test-results/remote-results.json" ||
    echo "no results.json on remote (run not finished?)"
  rsync -az --delete "$REMOTE:$REMOTE_DIR/playwright-report/" \
    playwright-report-remote/ 2>/dev/null &&
    echo "-> playwright-report-remote/ (open index.html in a browser)" || true
  echo '--- final summary ---'
  ssh "$REMOTE" "grep -E '[0-9]+ (passed|failed|skipped|did not run)' \
    ~/$REMOTE_DIR/.e2e-remote/test.log | tail -5" || true
}

case "$MODE" in
  -w)
    while true; do
      clear
      date '+%H:%M:%S'
      snapshot
      if ssh "$REMOTE" "grep -qE 'DONE|FAILED' ~/$REMOTE_DIR/.e2e-remote/state 2>/dev/null"; then
        echo; echo "Run finished — fetch with: scripts/e2e-remote/status.sh -f"
        break
      fi
      sleep 10
    done
    ;;
  -t)
    echo "== streaming $REMOTE:~/$REMOTE_DIR/.e2e-remote/{run,test}.log (Ctrl-C to stop) =="
    ssh "$REMOTE" "tail -F -n +1 ~/$REMOTE_DIR/.e2e-remote/run.log ~/$REMOTE_DIR/.e2e-remote/test.log 2>/dev/null" &
    TAIL_PID=$!
    trap 'kill "$TAIL_PID" 2>/dev/null' EXIT
    while ! ssh "$REMOTE" "grep -qE 'DONE|FAILED' ~/$REMOTE_DIR/.e2e-remote/state 2>/dev/null"; do
      sleep 2
    done
    sleep 1 # let the last lines flush through before killing the tail
    kill "$TAIL_PID" 2>/dev/null
    echo; echo "Run finished — fetch with: scripts/e2e-remote/status.sh -f"
    ;;
  -f) fetch ;;
  *) snapshot ;;
esac
