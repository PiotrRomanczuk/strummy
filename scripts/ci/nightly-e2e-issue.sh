#!/usr/bin/env bash
# Files the nightly triage report as a GitHub issue.
#
# ONE issue, reused. A new issue per night would bury the repo in noise within
# a fortnight — the same failure appearing for six nights running should read
# as one open problem, not six. So:
#   - failures + no open issue  -> create it
#   - failures + open issue     -> replace the body, add a dated comment
#   - green    + open issue     -> comment and CLOSE it
#   - green    + no open issue  -> do nothing at all (no "still green" spam)
#
# The `nightly-e2e` label is the handle the fixer routine searches on. Renaming
# it here means renaming it in the routine prompt too.
set -euo pipefail

REPORT_FILE="${1:?usage: nightly-e2e-issue.sh <report.md>}"
LABEL="nightly-e2e"
TITLE="Nightly E2E failures"

[ -f "$REPORT_FILE" ] || { echo "no report at $REPORT_FILE" >&2; exit 1; }

# `--verdict green` is emitted by nightly-e2e-report.mjs only when nothing
# failed on every attempt. grep -q on the exact phrase, not a fuzzy match.
if grep -q '^\*\*Verdict: green\.\*\*' "$REPORT_FILE"; then
  GREEN=1
else
  GREEN=0
fi

# Label may not exist on a fresh repo; creating it is idempotent enough.
gh label create "$LABEL" \
  --description "Automated nightly Playwright run" \
  --color 0E8A16 2>/dev/null || true

EXISTING=$(gh issue list --label "$LABEL" --state open --limit 1 --json number --jq '.[0].number // empty')

RUN_URL=""
if [ -n "${GITHUB_RUN_ID:-}" ]; then
  RUN_URL="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"
fi

if [ "$GREEN" = "1" ]; then
  if [ -n "$EXISTING" ]; then
    gh issue comment "$EXISTING" --body "Nightly run is green — every previously reported failure is gone. Closing.

${RUN_URL:+Run: $RUN_URL}"
    gh issue close "$EXISTING"
    echo "closed #$EXISTING (green)"
  else
    echo "green, no open issue — nothing to do"
  fi
  exit 0
fi

BODY_FILE=$(mktemp)
cat "$REPORT_FILE" > "$BODY_FILE"
{
  echo ''
  [ -n "$RUN_URL" ] && echo "Run: $RUN_URL"
  echo ''
  echo '<!-- Kept up to date by scripts/ci/nightly-e2e-issue.sh. Edits to this body are overwritten nightly; use a comment instead. -->'
} >> "$BODY_FILE"

if [ -n "$EXISTING" ]; then
  gh issue edit "$EXISTING" --body-file "$BODY_FILE"
  gh issue comment "$EXISTING" --body "Updated with the $(date -u +%Y-%m-%d) run. ${RUN_URL:+Run: $RUN_URL}"
  echo "updated #$EXISTING"
else
  gh issue create --title "$TITLE" --label "$LABEL" --body-file "$BODY_FILE"
  echo "created a new issue"
fi

rm -f "$BODY_FILE"
