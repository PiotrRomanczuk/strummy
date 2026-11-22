#!/usr/bin/env bash
# Runs ON the EliteDesk (uwh) from the synced repo root — launched detached by
# run.sh. Pipeline: deps -> build -> prod server -> rate-limit clear -> tests.
# State is written to .e2e-remote/state so status.sh can monitor from the Mac.
# Any extra args are passed through to `playwright test` (e.g. a spec path).
set -uo pipefail

# shellcheck source=scripts/e2e-remote/app-server.lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/app-server.lib.sh"

PORT="${E2E_PORT:-3200}"
export E2E_PORT="$PORT"
DB_CONTAINER="${E2E_DB_CONTAINER:-supabase_db_StrummyDevelopment}"
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
  app_stop "$PORT"
}

fail() {
  state "FAILED $1"
  kill_server
  exit 1
}

# --- deps ------------------------------------------------------------------
state "DEPS"
app_install_deps "$RUN_DIR" || fail "npm ci"
npx playwright install chromium || fail "playwright install chromium"

# E2E runs real AI through the same chain as production (AI_PROVIDER=auto):
# OpenRouter → Ollama on the Windows box (reachable: this runs on uwh, in the
# LAN) → OpenAI, each tried until one answers — so a pass only goes red when
# all three are down. AI_PROVIDER=ollama forces the free local model;
# AI_PROVIDER=mock is the free, offline alternative.
export AI_PROVIDER="${AI_PROVIDER:-auto}"
export E2E_AI_PROVIDER="${E2E_AI_PROVIDER:-auto}"
export OPENAI_DEFAULT_MODEL="${OPENAI_DEFAULT_MODEL:-gpt-4o-mini}"
# Chat tool-calling hard-codes OpenRouter whenever OPENROUTER_API_KEY exists
# (app/actions/ai/core.ts); false routes chat straight through the chain.
export AI_USE_VERCEL_SDK="${AI_USE_VERCEL_SDK:-false}"
export OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://192.168.1.10:11434}"
# Must be a model actually pulled on the Windows box — gemma3:4b no longer is.
export OLLAMA_DEFAULT_MODEL="${OLLAMA_DEFAULT_MODEL:-qwen3.5:9b}"

# All app email from E2E goes to the dev stack's Inbucket (review UI on
# http://192.168.1.75:55324) — with real Gmail creds in .env.local, tests
# would otherwise send actual emails.
export SMTP_HOST="${SMTP_HOST:-192.168.1.75}"
export SMTP_PORT="${SMTP_PORT:-55325}"

# --- build -----------------------------------------------------------------
# Up to three attempts (the Turbopack font flake, see app-server.lib.sh).
state "BUILD"
app_build || fail "next build"

# --- server ----------------------------------------------------------------
state "SERVER"
kill_server
app_start "$PORT" "$SERVER_LOG"
case $? in
  0) ;;
  2) fail "port :$PORT hijacked by another server (see $SERVER_LOG)" ;;
  *) fail "server never answered on :$PORT (see $SERVER_LOG)" ;;
esac

# --- rate limits -----------------------------------------------------------
# The suite's own logins/signups saturate auth_rate_limits; start every run clean.
app_clear_rate_limits "$DB_CONTAINER" \
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
