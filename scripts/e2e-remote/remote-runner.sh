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
# Node version is part of the cache key: platform-specific native deps (the
# Next.js SWC/Turbopack binary) are resolved at npm-ci time for whatever Node
# was active, and a lockfile-only hash silently reuses a stale install after
# a Node upgrade (e.g. the setup-node step added alongside this comment) —
# node_modules kept answering to the runner's old system Node until this was
# added, even though the workflow said otherwise.
LOCK_HASH=$(cat package-lock.json <(node -v) | md5sum | cut -d' ' -f1)
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
# Retried up to 3x: Turbopack's next/font/google resolution has a known
# upstream flake (vercel/next.js#61886, "sporadically" — reproduced here
# regardless of Node version or a from-scratch npm ci, so it isn't this
# repo's cache) that fails one attempt in a run and succeeds the next with no
# code or environment change. `.next` is wiped between attempts since a
# half-written Turbopack cache from the failed attempt is the more likely
# thing to make attempt 2 fail the same way, not less.
state "BUILD"
BUILD_OK=0
for attempt in 1 2 3; do
  if npm run build; then
    BUILD_OK=1
    break
  fi
  echo "next build attempt $attempt/3 failed" >&2
  rm -rf .next
done
[ "$BUILD_OK" = "1" ] || fail "next build"

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

# --- did the server survive the suite? -------------------------------------
# It is checked before start-up but never after, and a server that dies MID-RUN
# is silent: every remaining test fails with ERR_CONNECTION_REFUSED, all three
# attempts refuse the same dead socket, and Playwright therefore marks them
# `unexpected` — the same status a genuine reproducible failure gets. On
# 2026-08-29 that turned one crashed `next start` on the iPad Pro leg into a
# report of "93 reproducible failures", 89 of which never ran a line of app
# code. Say so here, so the next crash is one grep away rather than a night of
# triage. Note that this cannot detect a server that died and was restarted.
#
# The log is copied into test-results/ because that is what CI uploads, and
# because `.e2e-remote/` is hidden — upload-artifact skips hidden paths by
# default and would have collected nothing without saying so.
mkdir -p test-results
cp "$SERVER_LOG" test-results/server.log 2>/dev/null || true
if curl -sf -o /dev/null --max-time 5 "http://localhost:$PORT/"; then
  echo "[$(date +%H:%M:%S)] server on :$PORT still answering after the suite"
else
  echo "::error::app server on :$PORT was NOT answering when the suite finished." \
    "Failures reading ERR_CONNECTION_REFUSED are that outage, not app bugs." \
    "Cause is in the server.log artifact."
  state "SERVER DIED (tests exited $EXIT)"
fi

kill_server
state "DONE $EXIT"
exit "$EXIT"
