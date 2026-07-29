---
description: Development workflow — Obsidian vault task tracking, commit format, PR conventions, release documentation
---

## Development Workflow

> Full details: `.claude/agents/git-workflow.md`

1. **Check vault before starting** -- open `~/Obsidian/MainCV-Planner/projects/Strummy/Strummy.md` Now list; mark task WIP before starting
2. **Branch from `main`** -- `feature/short-description`, `fix/short-description`, `refactor/short-description`
3. **Commit format** -- `type(scope): description`
4. **Test before push** -- `npm run lint && npm run typecheck && npm test` (or `/verify`, which runs all three)
5. **Version bumps automatically on merge** -- patch (fix), minor (feature), major (label override)
6. **Create PR** -- descriptive title, reference Obsidian task in body
7. **Squash and Merge** to `main` → verify on Preview → merge to `production`

## Non-Blocking CI (Ship, Don't Wait)

A PR's checks take ~2 min warm — NEVER sit and watch them. Green needs nobody;
red interrupts you. The loop:

1. **Push, open the PR, arm auto-merge immediately** — then forget it:
   `gh pr merge --auto --squash <pr-number>` (remote sessions without `gh`: the
   `enable_pr_auto_merge` GitHub MCP tool). Branch protection enforces the
   quality gates; the PR merges itself on green. One-time repo prerequisite:
   Settings → General → "Allow auto-merge".
2. **Start the next task NOW**, before the checks finish:
   - Independent task → new branch off `main`, or a worktree under
     `.claude/worktrees/` to keep the current checkout untouched.
   - Dependent task → branch off the un-merged feature branch (stacking is
     fine). After the base PR squash-merges, rebase with
     `git rebase --onto origin/main <old-base-branch> <your-branch>` — squash
     merges rewrite history, so a plain `git rebase main` replays duplicates.
3. **Check statuses in batches, not per-push**: `gh pr status` /
   `gh pr checks <pr>`, or `/merge-fleet` to sweep every open PR, fix the red
   ones, and merge the green ones at once. Remote sessions:
   `subscribe_pr_activity` on the PR — failures arrive as events; no polling.
4. **On a red check**: fix on that branch, push, move on again. Auto-merge
   stays armed across pushes. The only time CI blocks you is an actual
   failure — which arrives as an interrupt, not a wait.

## Remote Sessions (Claude Code on the web)

The Obsidian vault (`~/Obsidian/...`) and the `uwh` LAN stacks are unreachable
from cloud containers. Skip vault/LAN steps there, note the skip in the PR
body, and leave a follow-up so the vault gets updated from the Mac. Never fail
or stall a task over an unreachable local-only path.

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

**Tags & Releases**: https://github.com/PiotrRomanczuk/strummy/tags
