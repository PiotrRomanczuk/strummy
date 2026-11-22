# Lessons Learned

<!-- After ANY correction from the user, add an entry here.
     Review at session start. Consolidate cross-project patterns into global rules quarterly. -->

## 2026-11-15 — "There is no parent account on dev" was stated without checking

**What happened:** In the PR for the family billing page (#1088) I wrote that the parent view could not be checked in a browser because dev had no parent account. `parent@dev.local` existed all along (linked to `student@dev.local`), the `parent` role was already in `tests/fixtures/auth.fixture.ts`, and `tests/e2e/parent/` had three passing specs. The owner caught it.

**Why it matters:** A false "cannot be tested" claim skips a check that was one command away and tells the reviewer a feature is covered by weaker means than it could be. Here the browser check, once run, found a real defect (the "Details" link sat outside the card's test id).

**How to apply next time:**

1. Before writing "X does not exist" or "cannot be tested", look: `grep` the fixtures and `playwright.config.ts` for the role, and query the dev database for the account.
2. Role accounts on dev: `admin@`, `teacher@`, `student@`, `parent@dev.local` — passwords are the defaults in `playwright.config.ts`. No script creates them yet (#1089).

## 2026-06-19 — `isolation: "worktree"` can silently fail → 3 agents collided in one dir

**What happened:** Spawned 3 background subagents (calendar, content, hooks) with `isolation: "worktree"`. The worktrees were NOT created — `git worktree list` showed only the main repo dir. All 3 ran in the SAME working directory, racing on branch checkouts and commits. Result: tangled commits, a `fatal: cannot lock ref 'HEAD'` mid-commit, two divergent same-message commits, and work stranded uncommitted across the wrong branch. Caught only because the content-agent's report mentioned a "shared worktree."

**Why it matters:** Parallel agents in a shared dir is the exact failure the worktree protocol exists to prevent. The agents also did NOT honor a polite "STOP" SendMessage (one committed anyway, interfering with my in-flight commit). And subagents' relaxed off-main pre-commit gate let them commit RED code (calendar branch had 9 real `lib/google.test.ts` failures the agent reported as "pre-existing").

**How to apply next time:**

1. After spawning worktree-isolated agents, IMMEDIATELY verify with `git worktree list` that N+1 worktrees exist BEFORE letting them work. If isolation didn't take, do NOT run them in parallel — fall back to sequential single-agent execution.
2. Don't trust an agent's "gates pass" — independently re-run the FULL suite + lint on each branch (off-main relaxed policy hides failures).
3. To halt a runaway agent, a plain SendMessage is not reliable; need a hard stop. Capture an insurance backup commit (`git checkout -b backup/... && git add -A && git commit --no-verify`) before any untangle — it made this recovery lossless.
4. Recovery pattern that worked: backup branch → `git checkout <backup> -- <paths>` to surgically place each feature's files on its own branch (no dirty-tree branch switches).

## 2026-11-13 — a staff-only feature shipped with no committed RLS or E2E test

**What happened:** SNG-7/8 added a staff-read table (`song_analysis_sources`) and a staff-only card. Permissions were checked only with a throwaway Playwright script (screenshots for the report) and a psql impersonation — nothing landed in the repo, so CI would never catch a regression. Piotr asked: "czy zrobiłeś testy e2e tych nowych featerów". Same day: `auto-merge.yml` armed auto-merge on PR #1005 the moment it opened, although the author never merges (global rule, PRs wait for "Dziś").

**How to apply next time:**

1. A new table with RLS → `lib/testing/rls/__tests__/<table>.rls.test.ts` in the same PR (pattern: `lesson-transcripts.rls.test.ts`; run locally with `source .local-stack/env.sh && npx jest --config jest.config.rls.ts <file>`).
2. Role-gated UI → one spec in `tests/e2e/cross-role/` (pattern: `student-feature-access.spec.ts`): seed in `beforeAll`, the role that sees it, the role that must not, clean up in `afterAll`.
3. A one-off verification script is for screenshots, never a substitute for 1 and 2.
4. After opening a PR to `main`, check `gh pr view <n> --json autoMergeRequest`; when it must wait for review, disable it through the GraphQL `disablePullRequestAutoMerge` mutation.
