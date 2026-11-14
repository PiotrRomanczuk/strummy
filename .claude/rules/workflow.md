---
description: Development workflow — Obsidian vault task tracking, commit format, PR conventions, release documentation
---

## Development Workflow

> Full details: `.claude/agents/git-workflow.md`

1. **Check vault before starting** -- open `~/Obsidian/MainCV-Planner/projects/Strummy/Strummy.md` Now list; mark task WIP before starting
2. **Branch from `main`** -- `feature/short-description`, `fix/short-description`, `refactor/short-description`
3. **Commit format** -- `type(scope): description`
4. **Test before push** -- `npm run lint && npm run typecheck && npm test` (or `/verify`, which runs all three)
5. **Create PR** -- descriptive title, reference Obsidian task in body
6. **Merge through "Dziś", never yourself** -- the author never merges or
   approves their own PR (owner rule since 2026-11-11, enforced on the Mac by
   the `guard-bash.py` hook). Piotr merges from the home-ops "Dziś" page after
   the independent `pr-review` agent has reviewed the PR's head; a production
   outage is the only exception, on his explicit instruction. The squash merge
   to `main` deploys to **Vercel production** — there is no second step: no
   `production` branch, no release train, no tag (switched off 2026-10-11,
   `docs/analysis/2026-10-11-development-process-audit.md`).
7. **Verify on `strummy.online`** right after the merge -- crons run on
   production deployments and _will_ email students once
   `STUDENT_EMAILS_ENABLED=true` is set.

Branches with an open PR get their own preview deployment -- use that URL to
smoke a change before it reaches `main`.

## Non-Blocking CI (Ship, Don't Wait)

A PR's checks take ~2 min warm — NEVER sit and watch them. Red interrupts
you; green waits for review. The loop:

1. **Push and open the PR — then forget it.** Do **not** arm auto-merge, by
   command or by MCP tool: the author never merges their own PR (owner rule,
   2026-11-11). The PR waits on the "Dziś" page (home-ops): the independent
   `pr-review` agent reviews its head, Piotr clicks "Scal", `pr-decide`
   squash-merges. Tell Piotr the PR is waiting there. (`auto-merge.yml`, which
   armed auto-merge on every PR to `main`, was removed on 2026-11-13.)
2. **Start the next task NOW**, before the checks finish:
   - Independent task → new branch off `main`, or a worktree under
     `.claude/worktrees/` to keep the current checkout untouched.
   - Dependent task → branch off the un-merged feature branch (stacking is
     fine). After the base PR squash-merges, rebase with
     `git rebase --onto origin/main <old-base-branch> <your-branch>` — squash
     merges rewrite history, so a plain `git rebase main` replays duplicates.
3. **Check statuses in batches, not per-push**: `gh pr status` /
   `gh pr checks <pr>`. Fix the red ones; merging is not yours to do. Remote sessions:
   `subscribe_pr_activity` on the PR — failures arrive as events; no polling.
4. **On a red check**: fix on that branch, push, move on again. The only time
   CI blocks you is an actual failure — which arrives as an interrupt, not a
   wait.

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
