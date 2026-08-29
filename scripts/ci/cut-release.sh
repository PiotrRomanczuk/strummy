#!/usr/bin/env bash
# Cut a git tag + GitHub Release for a commit that has landed on `production`.
#
# Extracted from ci.yml's `release` job on 2026-08-29 so that BOTH paths into
# production can cut a release from one copy of this logic:
#
#   1. ci.yml `release` — a human merges the release PR (or pushes directly to
#      production). The push triggers ci.yml, quality-gates runs, this script
#      runs after it.
#   2. release-train.yml — the automation merges the release PR with
#      GITHUB_TOKEN. Actions' recursion guard means that push triggers NO
#      workflow run at all (verified 2026-08-29: bot-merged #746/#749 produced
#      0 push runs, human-merged #748/#758 produced 2), so ci.yml never fires
#      and the release would silently go untagged. The train calls this script
#      directly instead.
#
# Keep it dependency-free: `gh` + `jq` only, no node, no repo state beyond the
# checkout it runs in.
#
# Required env: GH_TOKEN, REPO (owner/name), SHA (commit on production).
set -euo pipefail

: "${GH_TOKEN:?GH_TOKEN is required}"
: "${REPO:?REPO is required}"
: "${SHA:?SHA is required}"

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

pr_json=$(gh api "repos/$REPO/commits/$SHA/pulls" -q '.[0] // empty')

if [ -n "$pr_json" ]; then
  # PR title/body are untrusted text: keep them in files and jq, never
  # interpolate them into shell.
  echo "$pr_json" | jq -r '.title // ""' > "$work/pr-title"
  echo "$pr_json" | jq -r '.body // ""'  > "$work/pr-body"
  branch=$(echo "$pr_json" | jq -r '.head.ref // ""')
  number=$(echo "$pr_json" | jq -r '.number')
  labels=$(echo "$pr_json" | jq -r '[.labels[].name] | join(",")')
  autonotes=false
else
  # Fast-forward or direct push to production: still a real release, so
  # tag it rather than going silent. Notes come from the commit log.
  echo "Release" > "$work/pr-title"
  : > "$work/pr-body"
  branch=main
  number=0
  labels=""
  autonotes=true
fi

prev=$(gh api "repos/$REPO/releases/latest" -q '.tag_name')
ver=${prev#v}
IFS=. read -r major minor patch <<< "$ver"

case ",$labels," in
  *,version:major,*) bump=major ;;
  *,version:minor,*) bump=minor ;;
  *,version:patch,*) bump=patch ;;
  # `main` = the staging→production release PR: a batch, so minor.
  *) case "$branch" in main|feature/*|feat/*) bump=minor ;; *) bump=patch ;; esac ;;
esac
case "$bump" in
  major) next="v$((major+1)).0.0" ;;
  minor) next="v$major.$((minor+1)).0" ;;
  patch) next="v$major.$minor.$((patch+1))" ;;
esac

{
  cat "$work/pr-body"
  echo ""
  echo "---"
  echo "**Full Changelog**: https://github.com/$REPO/compare/$prev...$next"
} > "$work/notes.md"

# -R is required: the ci.yml job that first ran this had no checkout, and
# `gh release create` otherwise infers the repo from a local git context that
# may not exist. Naming the repo explicitly works in both callers.
if [ "$autonotes" = true ]; then
  gh release create "$next" \
    -R "$REPO" \
    --target "$SHA" \
    --title "$next" \
    --generate-notes
  summary="## Released [$next](https://github.com/$REPO/releases/tag/$next) from a direct push to production (auto-generated notes, → $bump)"
else
  gh release create "$next" \
    -R "$REPO" \
    --target "$SHA" \
    --title "$next: $(cat "$work/pr-title")" \
    --notes-file "$work/notes.md"
  summary="## Released [$next](https://github.com/$REPO/releases/tag/$next) from #$number (\`$branch\` → $bump)"
fi

echo "$summary"
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  echo "$summary" >> "$GITHUB_STEP_SUMMARY"
fi
