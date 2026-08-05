#!/usr/bin/env bash
# Run the Strummy Bruno collection against a given env.
#
# Usage:
#   scripts/ci/run-bruno.sh [env] [--get-only] [folder]
#     env        — local | preview | production | production-readonly (default: local)
#     --get-only — restrict to GET requests: passes the explicit list of
#                  get-*.bru files under the target folder to `bru run`
#                  instead of the folder itself (Bruno has no built-in
#                  filename filter). Read-only smoke — never mutates the
#                  target stack.
#     folder     — optional sub-path under bruno/strummy/ (e.g. lessons)
#
# Env sources (loaded in order, later overrides earlier):
#   1. .env.local                — repo-level local development env (gitignored)
#   2. .env.bruno.<env>          — Bruno-specific overrides (gitignored)
#
# Required vars (only when auth-gated endpoints will run):
#   SUPABASE_URL, SUPABASE_ANON_KEY
#   ADMIN_EMAIL, ADMIN_PASSWORD
#   TEACHER_EMAIL, TEACHER_PASSWORD
#   STUDENT_EMAIL, STUDENT_PASSWORD
#   CRON_SECRET, API_KEY

set -euo pipefail

ENV_NAME="${1:-local}"
shift || true

GET_ONLY=0
FOLDER=""
for arg in "$@"; do
  case "$arg" in
    --get-only) GET_ONLY=1 ;;
    *) FOLDER="$arg" ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COLLECTION="$REPO_ROOT/bruno/strummy"
# Bruno CLI requires invocation from the collection root with relative target.
TARGET_REL="."
[[ -n "$FOLDER" ]] && TARGET_REL="$FOLDER"

RESULTS="$REPO_ROOT/bruno-results-$ENV_NAME.json"

load_env() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  set -a
  # shellcheck disable=SC1090
  source "$f"
  set +a
}

load_env "$REPO_ROOT/.env.local"
load_env "$REPO_ROOT/.env.bruno.$ENV_NAME"

# Map .env.local names to Bruno expectations when not explicitly set.
: "${SUPABASE_URL:=${NEXT_PUBLIC_SUPABASE_LOCAL_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}}"
: "${SUPABASE_ANON_KEY:=${NEXT_PUBLIC_SUPABASE_LOCAL_ANON_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}}"
export SUPABASE_URL SUPABASE_ANON_KEY

BRU_BIN="$REPO_ROOT/node_modules/.bin/bru"
if [[ ! -x "$BRU_BIN" ]]; then
  echo "Bruno CLI not found at $BRU_BIN. Run: npm install" >&2
  exit 2
fi

# Acquire a Supabase JWT for the active persona (default: admin) so the
# collection's bearer auth has something to inject. Skipped if any of
# SUPABASE_URL / SUPABASE_ANON_KEY / <PERSONA>_EMAIL / <PERSONA>_PASSWORD
# are missing.
PERSONA="${PERSONA:-admin}"
PERSONA_UC=$(printf '%s' "$PERSONA" | tr '[:lower:]' '[:upper:]')
EMAIL_VAR="${PERSONA_UC}_EMAIL"
PASS_VAR="${PERSONA_UC}_PASSWORD"
EMAIL="${!EMAIL_VAR:-}"
PASS="${!PASS_VAR:-}"
AUTH_TOKEN=""

if [[ -n "${SUPABASE_URL:-}" && -n "${SUPABASE_ANON_KEY:-}" && -n "$EMAIL" && -n "$PASS" ]]; then
  AUTH_RESP=$(curl -sS -m 10 -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" 2>/dev/null) || AUTH_RESP=""
  AUTH_TOKEN=$(printf '%s' "$AUTH_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null || true)
  if [[ -n "$AUTH_TOKEN" ]]; then
    echo "→ Auth: signed in as $PERSONA ($EMAIL)"
  else
    echo "→ Auth: sign-in FAILED for $PERSONA. Auth-gated endpoints will 401."
  fi
else
  echo "→ Auth: no persona credentials. Auth-gated endpoints will 401."
fi

echo "→ Bruno env: $ENV_NAME"
echo "→ Target:    bruno/strummy/$TARGET_REL"
[[ "$GET_ONLY" -eq 1 ]] && echo "→ Mode:      GET-only (read-only smoke)"

cd "$COLLECTION"

if [[ "$GET_ONLY" -eq 1 ]]; then
  # No filename filter exists in `bru run` — pass the explicit file list
  # instead of the folder. while-read (not mapfile, which needs bash 4+ —
  # macOS ships bash 3.2 as /bin/bash) avoids a for-loop-over-find word-split.
  GET_FILES=()
  while IFS= read -r f; do GET_FILES+=("$f"); done < <(find "$TARGET_REL" -type f -name 'get-*.bru' | sort)
  if [[ "${#GET_FILES[@]}" -eq 0 ]]; then
    echo "→ No get-*.bru files found under bruno/strummy/$TARGET_REL" >&2
    exit 2
  fi
  echo "→ Files:     ${#GET_FILES[@]} get-*.bru request(s)"
  BRU_ARGS=(run "${GET_FILES[@]}" --env "$ENV_NAME" --reporter-json "$RESULTS")
else
  BRU_ARGS=(run "$TARGET_REL" -r --env "$ENV_NAME" --reporter-json "$RESULTS")
fi
[[ -n "$AUTH_TOKEN" ]] && BRU_ARGS+=(--env-var "authToken=$AUTH_TOKEN")
# Forward any other relevant env vars so .bru files can interpolate them.
for v in SUPABASE_ANON_KEY CRON_SECRET API_KEY SUPABASE_SERVICE_ROLE_KEY ADMIN_EMAIL ADMIN_PASSWORD TEACHER_EMAIL TEACHER_PASSWORD STUDENT_EMAIL STUDENT_PASSWORD; do
  val="${!v:-}"
  [[ -n "$val" ]] && BRU_ARGS+=(--env-var "$v=$val")
done
# Override the environment's baseUrl — used on the e2e-remote runner, where
# bruno/strummy/environments/local.bru's hard-coded localhost:3000 belongs to
# a different app entirely (the CI job's own `next start` runs on another port).
[[ -n "${BRUNO_BASE_URL_OVERRIDE:-}" ]] && BRU_ARGS+=(--env-var "baseUrl=$BRUNO_BASE_URL_OVERRIDE")

EXIT=0
"$BRU_BIN" "${BRU_ARGS[@]}" || EXIT=$?
echo "→ Results: $RESULTS (bru exit $EXIT)"
exit "$EXIT"
