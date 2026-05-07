---
allowed-tools: Read, Edit, Write, Bash, Glob, Grep, Agent, Skill
argument-hint: [--patch|--minor|--major] [--quick] [--skip-issue] [--skip-review] [--dry-run]
description: Full ship workflow — validate, test, review, push, and create PR (version bumped automatically post-merge)
---

# Ship Workflow

Execute the complete shipping workflow for the current branch: **$ARGUMENTS**

## Argument Parsing

Parse `$ARGUMENTS` for these flags:

- `--patch` / `--minor` / `--major` — version label override
- `--quick` — fast path: equivalent to `--skip-review --skip-issue`
- `--skip-issue` — skip GitHub Issue update in Phase 5
- `--skip-review` — skip code review in Phase 3
- `--dry-run` — run validation phases, print what push/PR would do, don't execute

If `--quick` is set, enable both `--skip-review` and `--skip-issue`.

---

## Mode Selection

**Full mode** (default): Phases 1–6
**Quick mode** (`--quick`): Phases 1, 2, 4, 5, 6 (skips review + issue update)

**IMPORTANT**: Execute each phase sequentially. **Stop immediately** if any phase fails. Do NOT proceed past a failed gate.

---

## Phase 1: Pre-flight Checks

Run ALL checks. No interactive prompts. Fail fast.

1. `git branch --show-current` — if on `main`, `master`, or `production` → **ABORT**: "Create a feature branch first: `git checkout -b feature/123-description`"
2. `git status --porcelain` — if any uncommitted changes exist, **auto-commit them**:
   - Stage all changes: `git add -A` then `git reset HEAD -- logs/ playwright-report/` to exclude artifacts
   - Generate a commit message from the diff (`type(scope): description (#123)` format if an issue is detected)
   - Commit with `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`
   - Do NOT ask the user — always commit. This is the expected behavior.
3. `git log origin/main..HEAD --oneline` — if zero commits → **ABORT**: "No commits to ship"
4. Extract GitHub Issue number from branch name (regex: `^[a-z]+/(\d+)-`). Store if found; no warning if missing.

```
Pre-flight:
  Branch:  feature/123-add-reminders ✓
  Changes: auto-committed (or: already clean) ✓
  Commits: 3 ahead of main ✓
  Issue:   #123
```

---

## Phase 2: Unit Tests (MANDATORY — both modes)

```bash
npm test
```

- On failure: report failing tests and **STOP**
- On success: report count, continue

```
Tests: PASSED (XX suites, XX tests)
```

---

## Phase 3: Code Review (skipped if `--skip-review` or `--quick`)

If skipped, print "Code review: skipped" and continue to Phase 4.

Otherwise, run `/code-review --scope quick` inline:

```
Skill: code-review, args: "--scope quick"
```

Interpret the verdict:

- `CLEAN` or `HAS_SUGGESTIONS` → print summary, continue
- `HAS_BLOCKERS` → print findings, **STOP**

```
Review: CLEAN (or: HAS_SUGGESTIONS — N suggestions, 0 blockers)
```

---

## Phase 4: Push to Remote

If `--dry-run`: print "Would push to origin/{branch}" and skip to Phase 5.

1. Check upstream: `git rev-parse --abbrev-ref @{upstream} 2>/dev/null`
2. If no upstream: `git push -u origin {branch}`
3. If upstream exists: `git push`

Pre-push hook runs lint + tsc automatically. If it fails → **STOP** and report errors.

---

## Phase 5: Create PR + Version Label + Issue Update

If `--dry-run`: print what PR would be created with what labels, then skip to Phase 6.

### Version detection (inline)

Priority order:

1. `--major` flag → `major`
2. `--minor` flag → `minor`
3. `--patch` flag → `patch`
4. Branch prefix `feature/` or `feat/` → `minor`
5. Branch prefix `fix/`, `refactor/`, `chore/`, `test/`, `docs/` → `patch`
6. Default → `patch`

### Create PR

Generate title and body from commits:

```bash
# Gather data
COMMITS=$(git log origin/main..HEAD --pretty=format:"- %s")
DIFFSTAT=$(git diff origin/main..HEAD --stat)
```

Title: plain imperative derived from branch slug, e.g. `feat: add reminders` (no `[STRUM-XXX]` prefix). Issue is referenced in the body.

```bash
gh pr create --title "{title}" --body "$(cat <<'EOF'
## Summary
{bullet list from commits}

## Changes
{diff stat summary}

{Closes #123 — if issue found}

## Quality
- Tests: {count} passing
- Code review: {verdict or "skipped"}
- Lint + TSC: Verified (pre-push hook)

---
Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Add version label

```bash
gh pr edit {number} --add-label "version:{type}"
```

### GitHub Issue update (unless `--skip-issue` or `--quick`)

If a GitHub Issue number was found:

1. `gh issue view <n>` to confirm it exists and is open
2. `gh issue edit <n> --remove-label "status: in-progress" --add-label "status: in-review"`
3. `gh issue comment <n> --body "PR opened: <pr-url>"`

If skipped or no issue: note in summary. (`Closes #N` in the PR body will auto-close the issue on merge anyway.)

---

## Phase 6: Post-ship Summary

```
Ship complete!
  Branch:   feature/123-description
  PR:       https://github.com/...
  Version:  minor (auto-bumped on merge)
  Issue:    #123 → status: in-review (or: skipped)
  Quality:  tests ✓ | review {verdict/skipped} | lint+tsc ✓ (hook)
```

If `--quick` was used, append:

```
  Note: Quick mode — code review and issue update were skipped
```

---

## Dry Run Mode (`--dry-run`)

- Phases 1–3: run normally (pre-flight, tests, review)
- Phases 4–5: print what **would** happen, do NOT execute
- Phase 6: print summary noting dry run

---

## Error Recovery

If any phase fails:

- Print which phase failed and why
- Print what was already completed
- Do NOT rollback completed steps
- Suggest the fix and tell the user to re-run `/ship` after fixing
