#!/usr/bin/env bash
# Runs ON the EliteDesk (uwh) from the synced repo root — launched detached by
# run.sh. Pipeline: deps -> build -> prod server -> rate-limit clear -> tests.
# State is written to .e2e-remote/state so status.sh can monitor from the Mac.
# Any extra args are passed through to `playwright test` (e.g. a spec path).
set -uo pipefail

PORT="${E2E_PORT:-3200}"
export E2E_PORT="$PORT"
DB_CONTAINER="${E2E_DB_CONTAINER:-supabase_db_StudentDevelopment}"
RUN_DIR=".e2e-remote"
STATE_FILE="$RUN_DIR/state"
SERVER_LOG="$RUN_DIR/server.log"
TEST_LOG="$RUN_DIR/test.log"

mkdir -p "$RUN_DIR"

state() {
  echo "$1" > "$STATE_FILE"
  echo "[$(date +%H:%M:%S)] == $1 =="
}

kill_server() {
  pkill -f "next start -p $PORT" 2>/dev/null || true
}

fail() {
  state "FAILED $1"
  kill_server
  exit 1
}

# --- deps ------------------------------------------------------------------
state "DEPS"
LOCK_HASH_FILE="$RUN_DIR/package-lock.md5"
LOCK_HASH=$(md5sum package-lock.json | cut -d' ' -f1)
if [ ! -d node_modules ] || [ "$(cat "$LOCK_HASH_FILE" 2>/dev/null)" != "$LOCK_HASH" ]; then
  npm ci --no-audit --no-fund || fail "npm ci"
  echo "$LOCK_HASH" > "$LOCK_HASH_FILE"
fi
npx playwright install chromium || fail "playwright install chromium"

# --- build -----------------------------------------------------------------
state "BUILD"
npm run build || fail "next build"

# --- server ----------------------------------------------------------------
state "SERVER"
kill_server
setsid nohup npx next start -p "$PORT" > "$SERVER_LOG" 2>&1 < /dev/null &
disown
if ! curl --retry 30 --retry-delay 1 --retry-connrefused --retry-all-errors \
    -sf -o /dev/null "http://localhost:$PORT/"; then
  fail "server never answered on :$PORT (see $SERVER_LOG)"
fi

# --- rate limits -----------------------------------------------------------
# The suite's own logins/signups saturate auth_rate_limits; start every run clean.
docker exec "$DB_CONTAINER" psql -U postgres -d postgres \
  -c 'DELETE FROM public.auth_rate_limits;' \
  -c 'UPDATE public.profiles SET failed_login_attempts = 0, locked_until = NULL
      WHERE failed_login_attempts > 0 OR locked_until IS NOT NULL;' \
  || fail "rate-limit clear — is the $DB_CONTAINER container running?"

# --- tests -----------------------------------------------------------------
state "TESTING"
npx playwright test --config=playwright.remote.config.ts \
  --project="Desktop Chrome" "$@" > "$TEST_LOG" 2>&1
EXIT=$?

kill_server
state "DONE $EXIT"
exit "$EXIT"
