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
  # Kill by port, not by name: Next.js rewrites its process title to
  # "next-server (vX)", so a cmdline pattern silently misses live servers.
  fuser -k "$PORT/tcp" 2>/dev/null || true
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
# node_modules/.package-lock.json is npm ci's own completion sentinel: deleted
# first, written last — so a cancelled install can never masquerade as current.
if [ ! -f node_modules/.package-lock.json ] ||
   [ "$(cat "$LOCK_HASH_FILE" 2>/dev/null)" != "$LOCK_HASH" ]; then
  rm -f "$LOCK_HASH_FILE"
  npm ci --no-audit --no-fund || fail "npm ci"
  echo "$LOCK_HASH" > "$LOCK_HASH_FILE"
fi
npx playwright install chromium || fail "playwright install chromium"

# E2E runs real AI through OpenAI pinned to the cheapest chat model — a full
# AI pass costs ~$0.002. Alternatives: AI_PROVIDER=mock (free, deterministic,
# no network), AI_PROVIDER=ollama (free, needs the Windows box awake).
# OpenRouter is drained (2026-07-28) — don't point E2E back at it.
export AI_PROVIDER="${AI_PROVIDER:-openai}"
export E2E_AI_PROVIDER="${E2E_AI_PROVIDER:-openai}"
export OPENAI_DEFAULT_MODEL="${OPENAI_DEFAULT_MODEL:-gpt-4.1-nano}"
# Chat tool-calling hard-codes OpenRouter whenever OPENROUTER_API_KEY exists
# (app/actions/ai/core.ts); false routes chat through the provider factory so
# the selected provider is actually used.
export AI_USE_VERCEL_SDK="${AI_USE_VERCEL_SDK:-false}"
# Used only by AI_PROVIDER=ollama passes:
export AI_PREFER_LOCAL="${AI_PREFER_LOCAL:-true}"
export OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://192.168.1.10:11434}"
export OLLAMA_DEFAULT_MODEL="${OLLAMA_DEFAULT_MODEL:-gemma3:4b}"

# All app email from E2E goes to the dev stack's Inbucket (review UI on
# http://192.168.1.75:55324) — with real Gmail creds in .env.local, tests
# would otherwise send actual emails.
export SMTP_HOST="${SMTP_HOST:-192.168.1.75}"
export SMTP_PORT="${SMTP_PORT:-55325}"

# --- build -----------------------------------------------------------------
state "BUILD"
npm run build || fail "next build"

# --- server ----------------------------------------------------------------
state "SERVER"
kill_server
setsid nohup npx next start -p "$PORT" > "$SERVER_LOG" 2>&1 < /dev/null &
SERVER_PID=$!
disown
if ! curl --retry 30 --retry-delay 1 --retry-connrefused --retry-all-errors \
    -sf -o /dev/null "http://localhost:$PORT/"; then
  fail "server never answered on :$PORT (see $SERVER_LOG)"
fi
# A 200 alone isn't proof it's OUR server — if the port was already taken, a
# stale build answers and the whole run silently tests old code.
kill -0 "$SERVER_PID" 2>/dev/null || fail "port :$PORT hijacked by another server (see $SERVER_LOG)"

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
  --project="${E2E_PROJECT:-Desktop Chrome}" "$@" 2>&1 | tee "$TEST_LOG"
EXIT=$?

kill_server
state "DONE $EXIT"
exit "$EXIT"
