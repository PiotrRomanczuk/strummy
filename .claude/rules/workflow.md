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
6. **Squash and Merge to `main`** -- this deploys to **staging** (Vercel-Auth
   protected). Not a release; no tag is cut, and no user sees it.
7. **Check the staging build went green.** A quiet `main` is not a shipped
   `main` -- see the silence failure mode below.
8. **Release** -- open a **`main` → `production` PR**. Merging it is the release:
   it tags, cuts the GitHub Release, and deploys `strummy.online`. Defaults to a
   **minor** bump; override with `version:major`/`version:minor`/`version:patch`
   labels.
9. **Verify on `strummy.online`** immediately after that merge -- crons run on
   production deployments and _will_ email students.

**The two-stage gate is ACTIVE as of 2026-08-16.** Vercel's _Production Branch_
setting was changed from `main` to `production` at ~21:25 UTC that day; the next
merge to `main` (#732) deployed with `target=preview`, confirming it. The repo
half (`vercel.json`, `ci.yml`, `e2e.yml`) was already in place and needed no
change. See CLAUDE.md § Deployment for the evidence.

**The failure mode this introduces is silence.** Nothing ships until someone
opens the release PR, and a failing staging build no longer interrupts anyone.
On 2026-08-17 production was still serving the 2026-08-15 build with nine PRs
stacked up on `main` -- builds had been failing on a transient Google Fonts fetch
(`Can't resolve '@vercel/turbopack-next/internal/font/google/font'`; a plain
`vercel redeploy` cleared it) and no release PR existed. Treat step 7 as real
work, not a formality.

Staging shares the **production database**, so it is a code smoke gate, not a
safe playground: writes touch real student data and migrations cannot be
rehearsed there.

Branches with an open PR also get their own preview deployment (the
`ignoreCommand` builds when `VERCEL_GIT_PULL_REQUEST_ID` is set) -- use that URL
to smoke a change before it even reaches staging.

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

## Release Documentation (IMPORTANT)

**The `main` → `production` PR description becomes the GitHub Release notes** --
when merged to `production`, the workflow automatically:

- Creates annotated git tag (e.g., `v0.84.0`) with the PR title
- Generates GitHub Release with the full PR body
- Adds changelog links comparing versions

**One release usually covers several feature PRs**, so write the release PR body
as a summary of the whole batch, not of one change. Feature PRs merged to `main`
cut no tag — but their bodies are still where the detail lives, so keep writing
them well and draw the release notes from them.

**Therefore**: Write PR descriptions as **user-facing release notes**, not internal technical details. Include:

- What features were added (in plain language)
- What bugs were fixed
- Breaking changes (if any)
- Migration guides for schema/API changes
- Screenshots for UI features

**Tags & Releases**: https://github.com/PiotrRomanczuk/strummy/tags
