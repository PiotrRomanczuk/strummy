---
description: Development workflow — GitHub Issues, commit format, PR conventions, release documentation
---

## Development Workflow

> Full details: `.claude/agents/git-workflow.md`

1. **Start with a GitHub Issue** -- all work tracked as a GitHub Issue (create one if none exists)
2. **Branch from `main`** -- `feature/123-description`, `fix/...`, `refactor/...` (where `123` is the issue number)
3. **Commit format** -- `type(scope): description (#123)` -- `(#123)` autolinks on GitHub
4. **Test before push** -- `npm run lint && npm test`
5. **Version bumps automatically on merge** -- patch (fix), minor (feature), major (label override)
6. **Create PR** -- plain imperative title (e.g. `feat: description`), reference issue in body with `Closes #123`
7. **Squash and Merge** to `main` → verify on Preview → merge to `production`

## Release Documentation (IMPORTANT)

**PR descriptions become GitHub Release notes** -- when merged to main, the workflow automatically:

- Creates annotated git tag (e.g., `v0.84.0`) with PR title
- Generates GitHub Release with full PR body
- Adds changelog links comparing versions

**Therefore**: Write PR descriptions as **user-facing release notes**, not internal technical details. Include:

- What features were added (in plain language)
- What bugs were fixed
- Breaking changes (if any)
- Migration guides for schema/API changes
- Screenshots for UI features

**Tags & Releases**: https://github.com/PiotrRomanczuk/guitar-crm/tags
