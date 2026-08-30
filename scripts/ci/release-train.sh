#!/usr/bin/env bash
# Decide whether `main` may be released to `production`, and if so do it.
#
# Called by .github/workflows/release-train.yml — read that file's header for
# why the automation exists and why it is scheduled rather than event-driven.
#
# The decision, in one sentence: release when production's tree differs from
# main's AND the content sitting on main has a complete, green set of gating
# checks AND the staging build of that exact commit succeeded.
#
# Required env: GH_TOKEN, REPO (owner/name). Optional: DRY_RUN=true.
set -euo pipefail

: "${GH_TOKEN:?GH_TOKEN is required}"
: "${REPO:?REPO is required}"
DRY_RUN="${DRY_RUN:-false}"

# Checks that must be green before code reaches users. This is deliberately
# NOT the same list as main's branch protection:
#
#   - db-parity is not required to merge into main, but its entire purpose is
#     gating production ("A green E2E run does NOT transfer to production until
#     this is resolved"). A release train that ignored it would ship against a
#     production database whose schema nobody has proven matches.
#   - migrations-replay proves supabase/migrations can rebuild that schema.
#
# `skipped` counts as passing, exactly as branch protection treats a skipped
# required check as neutral — e2e.yml's `detect` job skips the heavy jobs on
# diffs that cannot affect them.
REQUIRED=(
  "Lint, types, tests, build"
  "E2E (Desktop Chrome)"
  "RLS policies"
  "DB types drift"
  "db-parity"
  "migrations-replay"
  "Secret scan (gitleaks)"
)

# Everything else is ignored on purpose. Named here so the reason survives:
#   Performance + a11y      always advisory (every step continue-on-error)
#   Unused code (knip)      --no-exit-code, findings untriaged
#   Test-data hygiene       "a report, not a gate" (e2e.yml)
#   bruno                   its smoke step is continue-on-error
#   iPhone*/iPad*/Desktop Chrome (bare)  nightly-e2e matrix — it attaches its
#       own results to whatever commit main happens to be at, has its own
#       triage job, and its device flakes must not wedge every release.

say() {
  echo "$*"
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then echo "$*" >> "$GITHUB_STEP_SUMMARY"; fi
}

# ── 1. Is there anything to release? ────────────────────────────────────────
# A TREE comparison, deliberately not `compare`'s ancestry status. Every release
# is a squash, so production's history is a chain of commits that exist nowhere
# in main and `compare/production...main` reports "diverged" permanently —
# measured 2026-08-29: ahead_by 187, behind_by 3, status "diverged", with
# nothing wrong at all. Ancestry cannot answer "is there anything to ship" in
# this repo. Identical trees can.
main_json=$(gh api "repos/$REPO/commits/main")
prod_json=$(gh api "repos/$REPO/commits/production")

main_sha=$(echo "$main_json" | jq -r '.sha')
prod_sha=$(echo "$prod_json" | jq -r '.sha')
main_tree=$(echo "$main_json" | jq -r '.commit.tree.sha')
prod_tree=$(echo "$prod_json" | jq -r '.commit.tree.sha')
main_date=$(echo "$main_json" | jq -r '.commit.committer.date')
prod_date=$(echo "$prod_json" | jq -r '.commit.committer.date')

if [ "$main_tree" = "$prod_tree" ]; then
  say "Nothing to release — production's tree already matches main."
  exit 0
fi

# Sanity guard for the one shape this train must not touch: someone hotfixed
# production directly and main has not caught up. Releasing then would be the
# train arbitrating a merge nobody reviewed.
if [[ "$main_date" < "$prod_date" ]]; then
  say "⚠ production HEAD ($prod_date) is NEWER than main HEAD ($main_date)."
  say "That means production carries work main does not — likely a direct hotfix."
  say "Merge it back into main first; the train stays out of this."
  exit 0
fi

# The release contents, as PRs rather than commits: main's commit history is not
# reachable from production (see above), so "commits since the last release" is
# not a thing ancestry can compute here. Merge timestamps can — but the cutoff
# is NOT production's own commit date. A release PR is merged days after the
# content it carries was cut from main (#736: cut 2026-08-17, merged 2026-08-27),
# so using the merge date silently drops every PR from that window. The right
# cutoff is the date of the last release PR's HEAD — the main commit that was
# actually shipped.
cutoff=$(gh api -X GET "repos/$REPO/pulls" \
           -f base=production -f state=closed -f sort=updated -f direction=desc -f per_page=20 \
           -q '[.[] | select(.merged_at != null)] | sort_by(.merged_at) | last | .head.sha // empty')
if [ -n "$cutoff" ]; then
  cutoff=$(gh api "repos/$REPO/commits/$cutoff" -q '.commit.committer.date' 2>/dev/null || echo "")
fi
[ -z "$cutoff" ] && cutoff="$prod_date"

prs=$(gh api -X GET search/issues \
        -f q="repo:$REPO is:pr is:merged base:main merged:>$cutoff" \
        -f per_page=100 \
        -q '.items | sort_by(.number) | .[] | "- #\(.number) \(.title)"' || true)
pr_count=$(printf '%s' "$prs" | grep -c '^- #' || true)

say "Releasable: production's tree differs from main (\`${main_sha:0:8}\`), $pr_count PR(s) merged since the last release."

# ── 2. Which commit's checks prove this content? ────────────────────────────
# A human merge to main triggers post-merge CI, so main HEAD carries the full
# set and is the better evidence. A bot merge triggers nothing (recursion
# guard), so the proof is the originating PR's head — which, because branch
# protection is `strict: true`, contained current main and therefore tested
# exactly what landed. This is ci.yml's "main's green is inherited from
# PR-time checks" argument, made executable.
runs_on_main=$(gh api "repos/$REPO/commits/$main_sha/check-runs?per_page=100")
has_gate=$(echo "$runs_on_main" | jq '[.check_runs[] | select(.name == "Lint, types, tests, build")] | length')

if [ "$has_gate" -gt 0 ]; then
  proof_sha="$main_sha"
  proof_src="main HEAD — post-merge CI ran here"
else
  proof_sha=$(gh api "repos/$REPO/commits/$main_sha/pulls" -q '.[0].head.sha // empty')
  if [ -z "$proof_sha" ]; then
    say "❌ main HEAD has no CI run and no originating PR — nothing proves this content. Not releasing."
    exit 0
  fi
  proof_src="PR head \`${proof_sha:0:8}\` — main HEAD was bot-merged, so its green is inherited"
fi
say "Evidence: $proof_src"

# ── 3. Are the gating checks green there? ───────────────────────────────────
runs=$(gh api "repos/$REPO/commits/$proof_sha/check-runs?per_page=100")
pending=(); failed=(); missing=()

for name in "${REQUIRED[@]}"; do
  state=$(echo "$runs" | jq -r --arg n "$name" \
    '[.check_runs[] | select(.name == $n)] | sort_by(.started_at) | last
     | if . == null then "missing" else .status + "/" + (.conclusion // "none") end')
  case "$state" in
    missing)                          missing+=("$name") ;;
    completed/success|completed/skipped|completed/neutral) : ;;
    completed/*)                      failed+=("$name (${state#completed/})") ;;
    *)                                pending+=("$name (${state%%/*})") ;;
  esac
done

# The staging build of the exact commit that would ship. This is the CD half:
# every gating check above can pass on a tree Vercel still fails to build.
vercel=$(gh api "repos/$REPO/commits/$main_sha/status" \
  -q '[.statuses[] | select(.context == "Vercel")] | sort_by(.updated_at) | last | .state // "missing"')
case "$vercel" in
  success)  : ;;
  pending)  pending+=("Vercel (staging build)") ;;
  missing)  missing+=("Vercel (staging build)") ;;
  *)        failed+=("Vercel (staging build: $vercel)") ;;
esac

if [ ${#failed[@]} -gt 0 ] || [ ${#missing[@]} -gt 0 ]; then
  say ""
  say "❌ **Not releasing — main is not fully green.**"
  for f in ${failed[@]+"${failed[@]}"};  do say "- failing: $f"; done
  for m in ${missing[@]+"${missing[@]}"}; do say "- missing: $m"; done
  say ""
  say "Fix these on main; the next train picks it up automatically."
  exit 0
fi

if [ ${#pending[@]} -gt 0 ]; then
  say ""
  say "⏳ Waiting — checks still running:"
  for p in ${pending[@]+"${pending[@]}"}; do say "- $p"; done
  exit 0
fi

say "✅ All gating checks green, staging build succeeded."

# ── 4. Open (or reuse) the release PR ───────────────────────────────────────
pr=$(gh pr list -R "$REPO" --base production --head main --state open --json number -q '.[0].number // empty')

if [ "$DRY_RUN" = "true" ]; then
  say ""
  if [ -n "$pr" ]; then
    say "**Dry run** — would merge existing release PR #$pr and cut the tag."
  else
    say "**Dry run** — would open a \`main\` → \`production\` release PR for $pr_count PR(s) and merge it."
  fi
  exit 0
fi

if [ -z "$pr" ]; then
  notes=$(mktemp)
  {
    echo "Automated release — main was fully green and its tree differs from production."
    echo ""
    echo "Evidence: $proof_src"
    echo ""
    echo "## Included ($pr_count PRs)"
    echo ""
    if [ -n "$prs" ]; then echo "$prs"; else echo "_No merged PRs found since the last release; releasing a direct change._"; fi
  } > "$notes"

  pr=$(gh pr create -R "$REPO" \
        --base production --head main \
        --title "Release $(date -u +%Y-%m-%d)" \
        --body-file "$notes" \
        | grep -oE '[0-9]+$')
  rm -f "$notes"
  say "Opened release PR #$pr."
else
  say "Reusing open release PR #$pr."
fi

# ── 5. Merge and tag ────────────────────────────────────────────────────────
# Squash, matching every previous release (#723, #736). The tree that lands is
# the one we just proved green, so this deliberately does not wait for the
# release PR's own copy of the same checks: re-proving an identical tree would
# double every release's latency and queue behind the serialized self-hosted
# e2e runner.
gh pr merge "$pr" -R "$REPO" --squash
say "Merged #$pr into production."

new_sha=""
for _ in 1 2 3 4 5 6; do
  new_sha=$(gh pr view "$pr" -R "$REPO" --json mergeCommit -q '.mergeCommit.oid // empty')
  [ -n "$new_sha" ] && break
  sleep 5
done

if [ -z "$new_sha" ]; then
  say "⚠ Merged, but GitHub has not reported the merge commit yet — the tag was NOT cut."
  say "Run: \`gh workflow run release-train.yml\` again, or cut it by hand from production HEAD."
  exit 1
fi

# The push above was made with GITHUB_TOKEN, so it triggers no workflow run and
# ci.yml's `release` job will never fire for it. Cut the release here instead,
# from the same script that job uses.
SHA="$new_sha" bash "$(dirname "$0")/cut-release.sh"
