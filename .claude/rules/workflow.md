---
description: Development workflow — Obsidian vault task tracking, commit format, PR conventions, release documentation
---

## Development Workflow

> Full details: `.claude/agents/git-workflow.md`

1. **Check vault before starting** -- open `~/Obsidian/MainCV-Planner/projects/Strummy/Strummy.md` Now list; mark task WIP before starting
2. **Branch from `dev`** -- `feature/short-description`, `fix/short-description`, `refactor/short-description`
3. **Commit format** -- `type(scope): description`
4. **Test before push** -- `npm run lint && npm run typecheck && npm test` (or `/verify`, which runs all three)
5. **Create PR** -- descriptive title, reference Obsidian task in body
6. **PR into `dev`** -- then `dev` → `test` (verification) → `main` (production),
   each step its own PR (since 2026-11-15). Merging into `main` deploys to
   **Vercel production**; no `production` branch, no release train, no tag.
   The author of a change never merges it.
7. **Verify on `strummy.online`** right after the merge into `main` -- crons run on
   production deployments and _will_ email students once
   `STUDENT_EMAILS_ENABLED=true` is set.

Branches with an open PR get their own preview deployment -- use that URL to
smoke a change before it reaches `main`.

## Non-Blocking CI (Ship, Don't Wait)

A PR's checks take ~2 min warm — NEVER sit and watch them. Green needs nobody;
red interrupts you. The loop:

1. **Push, open the PR, arm auto-merge immediately** — then forget it:
   `gh pr merge --auto --squash <pr-number>` (remote sessions without `gh`: the
   `enable_pr_auto_merge` GitHub MCP tool). Branch protection enforces the
   quality gates; the PR merges itself on green. One-time repo prerequisite:
   Settings → General → "Allow auto-merge".
2. **Start the next task NOW**, before the checks finish:
   - Independent task → new branch off `dev`, or a worktree under
     `.claude/worktrees/` to keep the current checkout untouched.
   - Dependent task → branch off the un-merged feature branch (stacking is
     fine). After the base PR squash-merges, rebase with
     `git rebase --onto origin/dev <old-base-branch> <your-branch>` — squash
     merges rewrite history, so a plain `git rebase dev` replays duplicates.
3. **Check statuses in batches, not per-push**: `gh pr status` /
   `gh pr checks <pr>`, or `/merge-fleet` to sweep every open PR, fix the red
   ones, and merge the green ones at once. Remote sessions:
   `subscribe_pr_activity` on the PR — failures arrive as events; no polling.
4. **On a red check**: fix on that branch, push, move on again. Auto-merge
   stays armed across pushes. The only time CI blocks you is an actual
   failure — which arrives as an interrupt, not a wait.

## Remote Sessions (Claude Code on the web)

The Obsidian vault (`~/Obsidian/...`) is unreachable from cloud containers —
skip vault steps, note the skip in the PR body, and leave a follow-up so the
vault gets updated from the Mac. Never fail or stall a task over an
unreachable local-only path.

The `uwh` dev stack is LAN-only by default, but MAY be reachable if the
environment is configured with the dev tunnel (`docs/remote-dev-db-access.md`):
check for `RLS_TEST_SUPABASE_URL` in the environment and probe it
(`curl -s -o /dev/null -w '%{http_code}' "$RLS_TEST_SUPABASE_URL/rest/v1/"` —
401 means reachable) before deciding. Reachable → `npm run test:rls` and
API-level dev-DB work run normally. Not reachable → DB-touching work goes
through the self-hosted runner (push the branch; `e2e.yml` runs rls/parity
next to the stack). psql-level work (applying migrations) always stays on
`uwh` either way.

## PR Descriptions

There are no release notes any more -- the PR body is what a reader has. Write
3–5 lines: what works now, what did not work before, any manual step (env var,
migration). Screenshots for UI changes.
