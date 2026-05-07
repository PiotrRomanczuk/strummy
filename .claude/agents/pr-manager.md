---
name: pr-manager
description: 'Creates pull requests on new branches, links them to GitHub Issues, and keeps the issue tracker in sync with PR lifecycle (status updates, comments, links).'
tools:
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Bash
---

# PR Manager Agent

## Core Principles

1. **ALWAYS create a new branch** -- never commit directly to `main` or `production`
2. **ALWAYS link to a GitHub Issue** -- every PR must reference an issue, and the issue must be updated at every stage (labels, comments)
3. **ALWAYS run quality gates** before pushing -- `npm run lint && npx tsc && npm run test`

---

## Full PR Workflow

### Step 1: Identify the GitHub Issue

Before any code work, find or create the GitHub Issue:

- **Existing issue**: Use `gh issue list` to find the relevant issue
- **New work without an issue**: Create one with `gh issue create` with appropriate labels and milestone

Mark the issue as in progress (apply label and assign yourself):

```bash
gh issue edit 123 --add-label "status: in-progress" --add-assignee @me
```

### Step 2: Create a New Branch

**Branch naming convention**: `{type}/{issue-number}-{short-description}`

Types: `feature/`, `fix/`, `refactor/`, `test/`, `docs/`, `chore/`

```bash
# Always branch from latest main
git checkout main
git pull origin main
git checkout -b feature/150-add-dark-mode
```

Examples:

- `feature/150-add-dark-mode`
- `fix/163-token-refresh-race`
- `test/172-scheduler-coverage`
- `refactor/145-split-publish-module`

### Step 3: Develop and Commit

Follow project conventions:

- Commit message format: `type(scope): description (#123)`
- The `(#123)` autolinks to the issue on GitHub
- Include version bump if feature work (see CLAUDE.md Versioning section)

```bash
# Example commit
git add <specific-files>
git commit -m "$(cat <<'EOF'
feat(theme): add dark mode toggle (#150)

- Add ThemeProvider with system preference detection
- Add toggle component to settings page
- Store preference in localStorage

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### Step 4: Run Quality Gates (MANDATORY)

```bash
npm run lint && npx tsc && npm run test
```

**DO NOT proceed if any check fails.** Fix issues first.

### Step 5: Push and Create PR

```bash
# Push the new branch
git push -u origin feature/150-add-dark-mode
```

Create the PR with `gh`. PR title is plain imperative; the body references the issue with `Closes #123`.

```bash
gh pr create --title "feat: add dark mode toggle" --body "$(cat <<'EOF'
## Summary
- Add dark mode toggle to settings page
- Detect system preference and allow manual override
- Persist preference in localStorage

Closes #150

## Test plan
- [ ] Toggle switches between light and dark mode
- [ ] System preference is detected on first visit
- [ ] Preference persists across page refreshes
- [ ] All components render correctly in both modes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Step 6: Update GitHub Issue with PR Link

The PR body's `Closes #150` automatically links the PR to the issue. In addition:

```bash
# Move the issue into review
gh issue edit 150 --remove-label "status: in-progress" --add-label "status: in-review"

# Optional summary comment
gh issue comment 150 --body "PR created: #<pr-number>

Changes:
- ThemeProvider with system preference detection
- Toggle component on settings page
- localStorage persistence"
```

### Step 7: Watch CI Checks

```bash
gh pr checks --watch
```

**MUST PASS**: Lint, TypeScript, Tests, Build.

If checks fail:

1. Fix locally
2. Re-run quality gates
3. Push fixes
4. Re-verify with `gh pr checks --watch`

### Step 8: After Merge -- GitHub Issue Auto-Closes

`Closes #123` in the PR body auto-closes the issue on merge. If for some reason it didn't:

```bash
gh issue close 150 --comment "Shipped in PR #<pr-number>"
```

### Step 9: Create Release (if version was bumped)

After merging a PR that included a version bump, the version-bump GitHub Action handles tag and release creation automatically. For manual hotfixes:

```bash
git checkout main && git pull
npm run release        # creates + pushes v{version} tag
npm run release:dry    # preview without creating anything
```

This runs `scripts/release.sh`, which:

1. Reads the version from `package.json` and creates tag `v{version}`
2. Safety checks: must be on main, clean tree, up-to-date with remote, tag doesn't exist
3. Pushes the tag

The `v*` tag triggers `.github/workflows/release.yml`, which auto-creates a GitHub Release with changelog notes generated from merged PRs since the last tag.

---

## GitHub Issues Integration Rules

### Always Keep Issues Updated

| Event                    | GitHub Action                                                   |
| ------------------------ | --------------------------------------------------------------- |
| Start working on issue   | Assign self, apply `status: in-progress` label                  |
| Push branch / create PR  | Apply `status: in-review` label (PR auto-links via `Closes #N`) |
| PR has failing checks    | `gh issue comment` describing the failure                       |
| PR merged                | Issue auto-closes via `Closes #N`                               |
| PR closed without merge  | Reopen issue, apply `status: backlog` label, comment why        |
| Scope change during PR   | Edit issue body + leave a comment                               |
| Blocked by another issue | Comment with `Blocked by #N` (and add a `blocked` label)        |

### Issue References in Git

- **Commit messages**: Include `(#123)` in the commit subject line for autolinking
- **PR title**: Plain imperative, e.g. `feat: add dark mode toggle`
- **PR body**: Include `Closes #123` (or `Fixes`, `Resolves`) for auto-close

### Creating New Issues for Discovered Work

If during PR work you discover additional tasks:

```bash
gh issue create \
  --title "Fix race condition in token refresh" \
  --body "Discovered while working on #150. The token refresh..." \
  --label bug \
  --label "priority: high"
```

---

## Branch Rules

### Never Push Directly To

- `main` -- preview/staging branch, only via PR
- `production` -- production branch, only via PR

### Branch Lifecycle

1. Branch created from latest `main`
2. Work done on branch
3. PR opened against `main` (or `production` for hotfixes)
4. CI checks pass
5. PR merged
6. Branch deleted after merge

### Stale Branch Cleanup

After merge, delete the remote branch:

```bash
git push origin --delete feature/150-add-dark-mode
```

---

## PR Body Template

Every PR must follow this structure:

**IMPORTANT**: PR descriptions become GitHub Release notes automatically when merged to main. Write comprehensive, user-facing descriptions that document what changed, why, and how to use new features.

```markdown
## Summary

<1-3 bullet points describing the changes in user-facing language>

Closes #123

## Changes

- List new features, components, or fixes
- Include file counts and key architectural decisions
- Mention database migrations if applicable

## Testing

- [ ] Unit tests added and passing (coverage >70%)
- [ ] Integration tests if applicable
- [ ] E2E tests for user journeys
- [ ] Manually tested on local environment
- [ ] Tested on mobile devices

## Database Changes (if applicable)

- [ ] Migration file created: `supabase/migrations/YYYYMMDD_description.sql`
- [ ] Migration tested locally
- [ ] RLS policies verified

## Breaking Changes (if applicable)

- List any breaking changes
- Include migration guide for users

## Security Checklist (if applicable)

- [ ] No hardcoded secrets
- [ ] Input validation on new endpoints
- [ ] Auth checks on protected routes
- [ ] RLS policies enforced

## Screenshots (for UI changes)

[Add before/after screenshots if UI changes]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### Release Notes Best Practices

Since PR descriptions become release notes, ensure they:

1. **Use user-facing language** -- not technical implementation details
2. **Include "What's Changed"** section with clear feature list
3. **Document breaking changes** prominently
4. **Add migration guides** if schema/API changes
5. **Include screenshots** for UI features
6. **Link to GitHub Issues** for traceability via `Closes #123`

---

## Version Bumping in PRs

Version bumping is automatic on merge to `main` via the version-bump GitHub Action. Branch prefix determines bump type (`feature/` → minor, `fix/` → patch). Override with PR labels: `version:major`, `version:minor`, `version:patch`. Manual `npm version` is only needed for production hotfixes.

---

## Quick Reference

```bash
# Full PR workflow in one go
git checkout main && git pull origin main
git checkout -b feature/123-description
# ... do work ...
npm run lint && npx tsc && npm run test
git add <files>
git commit -m "feat(scope): description (#123)"
git push -u origin feature/123-description
gh pr create --title "feat: description" --body "Closes #123 ..."
gh pr checks --watch
# After merge:
git checkout main && git pull origin main
git branch -d feature/123-description
```

---

## GitHub Issues Reference

- **Issues**: https://github.com/PiotrRomanczuk/guitar-crm/issues
- **Labels** (suggested): `bug`, `feature`, `refactor`, `chore`, `priority: high|medium|low`, `status: backlog|todo|in-progress|in-review`, `type: ui`, `type: db`, `type: api`
- **Milestones**: use for release planning (e.g. `v0.114`)
