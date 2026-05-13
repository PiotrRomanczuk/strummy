#!/usr/bin/env bash
# Run the Strummy Bruno collection against a given env.
#
# Usage:
#   scripts/ci/run-bruno.sh [env] [--get-only] [folder]
#     env        — local | preview | production | production-readonly (default: local)
#     --get-only — restrict to GET requests (recursively runs get-*.bru files)
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

echo "→ Bruno env: $ENV_NAME"
echo "→ Target:    bruno/strummy/$TARGET_REL"
[[ "$GET_ONLY" -eq 1 ]] && echo "→ Mode:      GET-only (read-only smoke)"

cd "$COLLECTION"

EXIT=0
if [[ "$GET_ONLY" -eq 1 ]]; then
  # Run get-*.bru files only by passing each domain folder individually and
  # filtering via Bruno's --filename glob.
  "$BRU_BIN" run "$TARGET_REL" \
    --env "$ENV_NAME" \
    --filename "*/get-*.bru" \
    --reporter-json "$RESULTS" \
    || EXIT=$?
else
  "$BRU_BIN" run "$TARGET_REL" \
    --env "$ENV_NAME" \
    --reporter-json "$RESULTS" \
    || EXIT=$?
fi

echo "→ Results: $RESULTS (bru exit $EXIT)"
exit "$EXIT"
