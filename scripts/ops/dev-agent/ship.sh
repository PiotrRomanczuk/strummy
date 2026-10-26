# shellcheck shell=bash
# Turns the agent's edits into a PR — sourced by run.sh after the agent exits.
# The agent reports through .dev-agent/result.json:
#   {"status":"done","title":"…","summary":"…","ref":"LES-3"}   edits ready
#   {"status":"skip","reason":"…"}                             nothing shipped

AUTO_MERGE_MAX_LINES="${AUTO_MERGE_MAX_LINES:-200}"

result_field() { jq -r ".$1 // empty" "$WORK/result.json" 2>/dev/null; }

# Archive the attempt so a failed or skipped run can be read afterwards.
archive_attempt() {
  local dest="$STATE/runs/$(date -u +%Y%m%dT%H%M%SZ)-$1"
  mkdir -p "$dest"
  cp -r "$WORK"/. "$dest"/ 2>/dev/null || true
  # -N so files the agent created show up in the patch too.
  { git add -A -N . && git diff origin/main >"$dest/changes.patch"; } || true
  log "attempt archived: $dest"
}

discard_changes() { git reset -q --hard && git clean -qfd -e node_modules -e .env.local; }

gates_pass() {
  npm run -s lint >"$WORK/gate-lint.log" 2>&1 \
    && npm run -s typecheck >"$WORK/gate-typecheck.log" 2>&1 \
    && npm test -- --silent >"$WORK/gate-test.log" 2>&1
}

skip_with_reason() {
  local mode="$1" reason
  reason="$(result_field reason)"
  log "agent skipped: ${reason:-no result.json}"
  local issue
  issue="$(cat "$WORK/nightly-issue-number" 2>/dev/null || true)"
  if [ "$mode" = "triage" ] && [ -n "$issue" ] && [ -n "$reason" ]; then
    gh issue comment "$issue" -R "$REPO_SLUG" \
      --body "**dev-agent triage (uwh), $(date -u +%F) — no code change.** $reason" >/dev/null
  fi
}

ship_result() {
  local mode="$1" status title summary ref branch lines risky pr_url
  status="$(result_field status)"
  if [ "$status" != "done" ] || [ -z "$(git status --porcelain)" ]; then
    skip_with_reason "$mode"
    archive_attempt "$mode-skip"
    discard_changes
    return 0
  fi

  if ! gates_pass; then
    log "quality gates failed — nothing pushed"
    archive_attempt "$mode-gates-failed"
    discard_changes
    return 1
  fi

  if [ "${DEV_AGENT_DRY_RUN:-0}" = 1 ]; then
    log "dry run — gates passed, nothing pushed: $(result_field title)"
    archive_attempt "$mode-dry-run"
    discard_changes
    return 0
  fi

  title="$(result_field title)"; summary="$(result_field summary)"; ref="$(result_field ref)"
  branch="auto/$mode-$(date -u +%Y%m%d-%H%M)"
  git checkout -q -b "$branch"
  git add -A
  git commit -q -m "$title" -m "$summary" -m "Automated by strummy-dev-agent on uwh ($mode${ref:+, $ref})."
  git push -q -u origin "$branch"

  lines="$(git diff --numstat origin/main...HEAD | awk '{s+=$1+$2} END {print s+0}')"
  risky="$(git diff --name-only origin/main...HEAD | grep -E "$RISKY_PATHS_RE" || true)"

  pr_url="$(gh pr create -R "$REPO_SLUG" --base main --head "$branch" --title "$title" \
    --label "$AGENT_LABEL" --label e2e \
    --body "$summary

---
Opened unattended by \`strummy-dev-agent\` on uwh — mode: **$mode**${ref:+, gap **$ref**}. $lines changed lines.")"
  log "PR opened: $pr_url ($lines lines)"

  if [ -n "$risky" ]; then
    gh pr comment "$pr_url" --body "Not auto-merged — touches paths with side effects on merge: \`$(tr '\n' ' ' <<<"$risky")\`" >/dev/null
    log "auto-merge withheld: risky paths"
  elif [ "$lines" -gt "$AUTO_MERGE_MAX_LINES" ]; then
    gh pr comment "$pr_url" --body "Not auto-merged — $lines changed lines (limit $AUTO_MERGE_MAX_LINES). Needs a human review." >/dev/null
    log "auto-merge withheld: $lines > $AUTO_MERGE_MAX_LINES lines"
  else
    gh pr merge "$pr_url" --auto --squash >/dev/null
    log "auto-merge armed"
  fi
  archive_attempt "$mode-shipped"
  git checkout -q --detach origin/main
}
