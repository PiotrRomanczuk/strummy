---
description: Development workflow — Obsidian vault task tracking, commit format, PR conventions, release documentation
---

## Development Workflow

1. **Pick the task from GitHub Issues** (since 2026-11-14) -- `gh issue list -l plan/now` (then `plan/next`); the vault note `~/Obsidian/MainCV-Planner/1-Projekty/Strummy/Strummy.md` mirrors them and also holds the confidential/infra tasks that never go into this public repo
2. **Branch from `dev`** -- `feature/short-description`, `fix/short-description`, `refactor/short-description`
3. **Commit format** -- `type(scope): description`
4. **Test before push** -- `npm run lint && npm run typecheck && npm test` (or `/verify`, which runs all three)
5. **Create PR** -- descriptive title, `Closes #<issue>` in the body so the merge closes the task
6. **PR into `dev`** -- then `dev` → `test` (verification) → `main` (production).
   A PR into `dev` merges without the owner once CI is green and the
   independent `pr-review` agent gave "✅ Można scalać" for its head commit
   (owner decision 2026-11-22). **Only the owner merges into `main`**, after
   checking `test`; that merge deploys to **Vercel production** — no
   `production` branch, no release train, no tag.
7. **Verify on `strummy.online`** right after the merge into `main` -- crons run on
   production deployments and _will_ email students once
   `STUDENT_EMAILS_ENABLED=true` is set.

Only `main` and `test` are built on Vercel (since 2026-11-22: previews of
`dev` and of every PR used up the Hobby limit of 100 deployments a day).
Smoke a change with `npm run dev` against the dev stack before the PR, and on
the `test` preview before it reaches `main`.

## Non-Blocking CI (Ship, Don't Wait)

A PR's checks take ~2 min warm — NEVER sit and watch them. Red interrupts
you; green waits for review. The loop:

1. **Push and open the PR into `dev`** — then leave it. It merges once CI is
   green and `pr-review` gave ✅ for the head commit; a session may merge its
   own PR into `dev` only then (`gh pr merge <n> --merge`; the Mac hook
   `guard-bash.py` refuses anything else). Never merge into `main` and never
   approve a PR. Promotions `dev` → `test` → `main` use a merge commit, never
   a squash — a squash makes the branches diverge.
2. **Start the next task NOW**, before the checks finish:
   - Independent task → new branch off `dev`, or a worktree under
     `.claude/worktrees/` to keep the current checkout untouched.
   - Dependent task → branch off the un-merged feature branch (stacking is
     fine). After the base PR squash-merges, rebase with
     `git rebase --onto origin/dev <old-base-branch> <your-branch>` — squash
     merges rewrite history, so a plain `git rebase dev` replays duplicates.
3. **Check statuses in batches, not per-push**: `gh pr status` /
   `gh pr checks <pr>`. Remote sessions:
   `subscribe_pr_activity` on the PR — failures arrive as events; no polling.
4. **On a red check or a 🟠/🔴 review**: fix on that branch, push, move on
   again. A push makes `pr-review` read the new head commit (hourly). The only
   time CI blocks you is an actual failure — which arrives as an interrupt,
   not a wait.

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
