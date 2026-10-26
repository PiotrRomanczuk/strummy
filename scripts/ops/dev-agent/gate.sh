# shellcheck shell=bash
# Gate for the dev agent — sourced by run.sh. Decides what (if anything) the
# agent may do today, from the scheduled Nightly E2E runs and open agent PRs.
#
#   triage   the latest scheduled Nightly run failed → fix that first
#   feature  the last $GREEN_STREAK scheduled runs are green, at least one of
#            them ran the full device matrix, and the newest is fresh
#   wait     anything else (streak too short, stale, or still running)

REPO_SLUG="${REPO_SLUG:-PiotrRomanczuk/strummy}"
AGENT_LABEL="${AGENT_LABEL:-dev-agent}"
GREEN_STREAK="${GREEN_STREAK:-3}"
MAX_AGE_HOURS="${MAX_AGE_HOURS:-30}"

# Prints the number of the open agent PR, if any (WIP limit = 1).
open_agent_pr() {
  gh pr list -R "$REPO_SLUG" --label "$AGENT_LABEL" --state open --limit 1 \
    --json number -q '.[0].number // empty'
}

# Number of Playwright device legs a run executed (4 = full nightly matrix).
run_legs() {
  gh run view "$1" -R "$REPO_SLUG" --json jobs \
    -q '[.jobs[] | select(.name | test("Chrome|iPad|iPhone"))] | length'
}

# Completed scheduled Nightly runs, newest first: "<id> <conclusion> <createdAt>".
nightly_runs() {
  gh run list -R "$REPO_SLUG" -w nightly-e2e.yml --event schedule --limit 20 \
    --json databaseId,conclusion,status,createdAt \
    -q '.[] | select(.status == "completed") | "\(.databaseId) \(.conclusion) \(.createdAt)"'
}

# Echoes "triage <run-id>", "feature" or "wait <reason>".
nightly_mode() {
  local runs newest_id newest_conclusion newest_at age_h streak=0 has_full=0
  runs="$(nightly_runs | head -n "$GREEN_STREAK")"
  [ -n "$runs" ] || { echo "wait no completed Nightly runs"; return; }

  read -r newest_id newest_conclusion newest_at <<<"$(head -n1 <<<"$runs")"
  if [ "$newest_conclusion" != "success" ]; then
    echo "triage $newest_id"
    return
  fi

  age_h=$(( ($(date +%s) - $(date -d "$newest_at" +%s)) / 3600 ))
  [ "$age_h" -le "$MAX_AGE_HOURS" ] || { echo "wait newest green run is ${age_h}h old"; return; }

  while read -r id conclusion _; do
    [ "$conclusion" = "success" ] || break
    streak=$((streak + 1))
    [ "$has_full" = 1 ] || { [ "$(run_legs "$id")" -ge 4 ] && has_full=1; }
  done <<<"$runs"

  if [ "$streak" -lt "$GREEN_STREAK" ]; then
    echo "wait green streak $streak/$GREEN_STREAK"
  elif [ "$has_full" != 1 ]; then
    echo "wait no full-matrix run in the streak"
  else
    echo "feature"
  fi
}

# Paths whose merge has side effects beyond the app: migrations are applied to
# production by deploy-db.yml on push to main, workflows and ops scripts run
# with production credentials. A PR touching them never auto-merges.
RISKY_PATHS_RE='^(supabase/migrations/|\.github/|scripts/ops/|scripts/e2e-remote/|vercel\.json$)'
