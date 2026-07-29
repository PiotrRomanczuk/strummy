<!-- This PR body becomes the GitHub Release notes verbatim when merged to main.
     Write it user-facing: what changed and why it matters, not internal detail.
     Version is cut automatically: feature/ branch → minor, anything else → patch;
     override with a version:major|minor|patch label. -->

## Summary

<!-- What does this change and why? Plain language — it ships as release notes. -->

## Changes

## <!-- Main changes, most important first -->

-

## Type of Change

<!-- Check all that apply -->

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Documentation update
- [ ] Test improvements
- [ ] Chore (dependencies, config, CI)

## Testing

- [ ] `npm run lint && npm run typecheck && npm test` pass (or `/verify`)
- [ ] Integration tests pass if touched areas warrant (`npm run test:integration`)
- [ ] E2E: `e2e` label applied if this touches auth/migrations/journeys (risky
      paths auto-trigger the suite)
- [ ] Manually verified on the dev stack (if user-facing)

## Screenshots

<!-- UI changes: before/after. Delete if not applicable — they ship in release notes. -->

## Database Changes

- [ ] None
- [ ] Migration added in `supabase/migrations/` (idempotent DDL, RLS conventions
      per CLAUDE.md) and applied to the dev stack

## Deployment Notes

- [ ] Nothing special
- [ ] Requires manual steps / env var changes (describe):

## Task Tracking

<!-- Obsidian vault reference (projects/Strummy/Strummy.md). Remote sessions:
     note here if the vault could not be updated so it gets synced from the Mac. -->

---

**Merge**: Squash and Merge to `main` (auto-merge encouraged: `gh pr merge --auto --squash`)
→ verify on Preview → merge `main` to `production` for release.
