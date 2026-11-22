#!/usr/bin/env bash
# Download the migration files that OTHER open pull requests add, one directory
# per PR, for open-pr-migrations.lib.sh (#1100). Needs `gh` with a token that
# can read pull requests and contents.
#
#   fetch-open-pr-migrations.sh OWNER/REPO OUT_DIR [CURRENT_PR_NUMBER]
#
# Skips the current PR (its own migrations are handled separately) and every
# PR from a fork: the files are executed as postgres inside the dev container,
# so only branches of this repository — people with push access — qualify.
set -uo pipefail

REPO="${1:?owner/repo}"
OUT="${2:?output directory}"
CURRENT="${3:-}"

mkdir -p "$OUT"
gh pr list --repo "$REPO" --state open --limit 100 \
  --json number,headRefOid,isCrossRepository \
  --jq '.[] | select(.isCrossRepository | not) | "\(.number) \(.headRefOid)"' |
  while read -r number sha; do
    [ "$number" = "$CURRENT" ] && continue
    files=$(gh api "repos/$REPO/pulls/$number/files" --paginate \
      -q '.[] | select(.status == "added") | .filename' |
      grep -E '^supabase/migrations/[^/]+\.sql$' || true)
    [ -n "$files" ] || continue
    mkdir -p "$OUT/$number"
    while IFS= read -r file; do
      gh api "repos/$REPO/contents/$file?ref=$sha" -H 'Accept: application/vnd.github.raw' \
        > "$OUT/$number/$(basename "$file")" ||
        { echo "could not fetch $file from #$number" >&2; rm -rf "${OUT:?}/$number"; break; }
    done <<< "$files"
    [ -d "$OUT/$number" ] && echo "open PR #$number: $(echo "$files" | wc -l | tr -d ' ') migration(s)"
  done
exit 0
