---
name: git-workflow
description: 'Manages git branching, commit conventions, GitHub Issue linking, version bumping, PR lifecycle, and common development workflows (feature, bug fix, refactor, hotfix, release).'
tools:
  - Read
  - Glob
  - Grep
  - Bash
---

# Git Workflow Agent

## Core Principles

1. **NEVER commit directly to `main` or `production`** -- always use feature branches
2. **ALWAYS link to a GitHub Issue** -- every commit and PR must reference an issue number (e.g. `(#123)`)
3. **ALWAYS test before committing** -- `npm run lint && npm test`
4. **Version is bumped automatically post-merge** -- a GitHub Action bumps patch/minor/major based on branch prefix or PR labels

---

## Branch Naming Convention

Use the GitHub Issue number directly (no prefix like `STRUM-` or `gh-`).

```
feature/123-short-description    # New features
fix/123-short-description        # Bug fixes
refactor/123-short-description   # Code refactoring
test/123-short-description       # Test improvements
docs/123-short-description       # Documentation
chore/123-short-description      # Maintenance tasks
```

Examples:

```bash
git checkout -b feature/123-add-lesson-reminders
git checkout -b fix/124-song-progress-calculation
git checkout -b refactor/125-user-service-cleanup
```

### Branch Protection Rules

- **`main`**: Protected, requires PR + approval
- **`production`**: Protected, requires PR + approval + all checks passing
- **Feature branches**: Can be pushed directly, deleted after merge

---

## Commit Message Format

Format: `type(scope): description (#123)` -- the `(#123)` autolinks to the issue on GitHub.

```bash
git commit -m "feat(lessons): add email reminders (#123)"
git commit -m "fix(songs): correct progress calculation (#124)"
git commit -m "refactor(users): simplify service layer (#125)"
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `style`

---

## Version Bumping & Release Documentation (Automated)

Version bumping is handled automatically by a GitHub Action (`version-bump.yml`) that runs after each PR is merged to `main`. **Do not run `npm version` manually on feature branches.**

| Change Type                          | Bump  | Trigger                                                                |
| ------------------------------------ | ----- | ---------------------------------------------------------------------- |
| Bug fix, small improvement, refactor | patch | `fix/`, `refactor/`, `chore/`, `test/`, `docs/`, `perf/` branch prefix |
| New feature, new component           | minor | `feature/` or `feat/` branch prefix                                    |
| Breaking change, major rewrite       | major | Add `version:major` label to PR                                        |

Override with PR labels: `version:major`, `version:minor`, `version:patch`.

### Automated Release Documentation

**The version-bump workflow automatically creates:**

1. **Enhanced Commit Message** with PR title and description
2. **Annotated Git Tag** (e.g., `v0.84.0`) with PR title
3. **GitHub Release** with full PR body as release notes

**IMPORTANT for agents**: This is automatic via GitHub Actions. You do NOT need to manually create tags or releases. The workflow handles:

- Version bump in package.json
- Git tag creation with PR context
- GitHub Release with changelog links
- Tag push to origin

If working on a hotfix or manual release, follow the pattern:

```bash
# Create tag with descriptive message
git tag -a v0.X.Y -m "Release v0.X.Y: <Feature description>"
git push origin v0.X.Y

# Create GitHub release
gh release create v0.X.Y \
  --title "v0.X.Y: <Feature description>" \
  --notes "<Full description>"
```

### CHANGELOG.md Format

```markdown
## [0.66.0] - 2026-02-09

### Added

- Lesson reminder email system (#123)
- User notification preferences (#123)

### Fixed

- Song progress calculation bug (#124)
```

---

## Working with GitHub Issues

GitHub Issues is the single source of truth for all tracked work. Use the `gh` CLI for issue management.

### Issue States (must follow)

Use labels and the issue's open/closed state plus an optional Project board:

**`status: backlog`** → **`status: todo`** → **`status: in-progress`** → **`status: in-review`** → **closed**

### Issue Updates at Each Stage

| Event                   | GitHub Action                                                                |
| ----------------------- | ---------------------------------------------------------------------------- |
| Start working           | Apply `status: in-progress` label, assign yourself, comment with branch name |
| PR created              | Apply `status: in-review` label, link PR (auto via `Closes #123`)            |
| PR merged               | Issue auto-closes via `Closes #123`                                          |
| PR closed without merge | Reopen issue, apply `status: backlog`, comment why                           |

### Auto-Linking

- GitHub auto-links commits and PR titles containing `(#123)` or `#123`
- PR descriptions with `Closes #123` (or `Fixes`, `Resolves`) auto-close the issue on merge
- Use `gh issue view 123`, `gh issue edit 123`, `gh issue comment 123` for updates

---

## PR Conventions

### PR Title Format

Plain imperative -- no ticket prefix. The body references the issue.

`feat: add lesson reminder system`
`fix: correct song progress calculation`

### PR Description Template

```markdown
## Summary

Closes #123

## Changes

- Added email reminder service
- Created notification scheduler
- Added reminder preferences to user settings

## Testing

- [ ] Unit tests added and passing
- [ ] E2E tests added and passing
- [ ] Manually tested on local environment
- [ ] Tested on mobile devices

## Screenshots

[If UI changes, add screenshots]

## Version

- Bumped from 0.65.0 → 0.66.0
```

### Code Review Process

- Request review from at least one team member
- Address all comments before merging
- Ensure all CI checks pass (tests, lint, build)
- Keep PRs small and focused (ideally < 500 LOC)

### Merge Strategy

- Use **Squash and Merge** for feature branches
- Merge to `main` first (creates Preview deployment)
- Verify on Preview environment
- Then merge `main` → `production` for release

### After Merge

- Verify the linked GitHub Issue auto-closed (via `Closes #123`); if not, close manually
- Delete feature branch
- Monitor deployment in Vercel
- Verify feature in production

---

## Quality Gates (MANDATORY before push)

```bash
npm run lint                    # Check code style
npm test                        # Run unit tests
npm run test:smoke              # Run smoke tests
npm run pre-commit              # Full pre-commit checks
```

---

## Common Workflows

### Starting a New Feature

```bash
# 1. Create or pick a GitHub Issue: e.g. #123
# 2. Create and checkout feature branch
git checkout main
git pull origin main
git checkout -b feature/123-add-lesson-reminders

# 3. Make your changes (follow TDD!)
npm test -- --watch

# 4. Run quality checks
npm run lint
npm test
npm run test:smoke

# 5. Version bump happens automatically after merge to main

# 6. Commit with proper format
git add .
git commit -m "feat(lessons): add email reminder system (#123)"

# 7. Push and create PR (body should include `Closes #123`)
git push origin feature/123-add-lesson-reminders

# 8. After merge, clean up
git checkout main && git pull origin main
git branch -d feature/123-add-lesson-reminders
```

### Fixing a Bug

```bash
git checkout -b fix/124-song-progress-calculation

# Write failing test first (TDD!)
npm test -- SongProgress --watch

# Fix the bug, verify all tests pass
npm test && npm run test:smoke

# Version bump happens automatically after merge to main

# Commit and push
git add .
git commit -m "fix(songs): correct progress calculation logic (#124)"
git push origin fix/124-song-progress-calculation
```

### Refactoring Code

```bash
git checkout -b refactor/125-simplify-user-service

# Ensure all existing tests pass BEFORE refactoring
npm test

# Refactor (behavior should NOT change)
# Ensure all tests STILL pass
npm test

# Version bump happens automatically after merge to main

git add .
git commit -m "refactor(users): simplify service layer (#125)"
git push origin refactor/125-simplify-user-service
```

### Hotfix to Production

```bash
# Create hotfix from production branch
git checkout production
git pull origin production
git checkout -b fix/126-critical-auth-bug

# Write test, fix bug, verify
npm test && npm run test:smoke

# NOTE: For hotfixes to production, manual version bump may be needed
# since the version-bump Action only watches main.
# npm version patch --no-git-tag-version

git add .
git commit -m "fix(auth)!: resolve critical security bug (#126)"
git push origin fix/126-critical-auth-bug
# Create PR: fix/126-... → production
# After merge, also merge production → main to sync
```

### Release to Production

```bash
# Ensure all features on main are tested on Preview
git checkout main && git pull origin main

# Review CHANGELOG.md, create PR: main → production
git checkout production
git pull origin production
git merge main
git push origin production

# Tag the release
git tag -a v0.66.0 -m "Release v0.66.0: Lesson reminders and notifications"
git push origin v0.66.0

# Verify all linked GitHub Issues are closed
```

---

## Deployment Checklist

- [ ] All tests passing (unit + E2E)
- [ ] Version bumped automatically post-merge
- [ ] CHANGELOG.md updated
- [ ] GitHub Issue linked in PR via `Closes #123`
- [ ] Code reviewed and approved
- [ ] Feature verified on Preview
- [ ] No errors in Vercel logs
- [ ] Database migrations tested (if applicable)
- [ ] Environment variables updated (if needed)

---

## Quick Reference

```bash
# Full workflow in one go
git checkout main && git pull origin main
git checkout -b feature/123-description
# ... make changes ...
npm test && npm run lint
git add .
git commit -m "feat(scope): description (#123)"
git push origin feature/123-description
# ... create PR on GitHub (body: "Closes #123") ...
# ... after merge ...
git checkout main && git pull
git branch -d feature/123-description
```
