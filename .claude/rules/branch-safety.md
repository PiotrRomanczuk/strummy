---
description: Branch safety protocol — the dev → test → main model, where work starts, and how a change moves to production
---

## The three long-lived branches (since 2026-11-15)

A change moves one way: feature branch → `dev` → `test` → `main`. Each step is a
pull request. A PR into `dev` merges once CI is green and `pr-review` gave ✅
for its current head commit; `dev` moves to `test` when it is green; **only the
owner merges `test` into `main`**, from the review page on the home-ops "Dziś"
console (owner decision 2026-11-22 — before that every merge was his click).

| Branch | Role         | What lands here         | Database                                                        | Vercel         | Leaves when                                                      |
| ------ | ------------ | ----------------------- | --------------------------------------------------------------- | -------------- | ---------------------------------------------------------------- |
| `dev`  | integration  | feature/fix/chore PRs   | `StrummyDevelopment` (`:55321`)                                 | preview        | a coherent set of changes is ready to verify → PR `dev` → `test` |
| `test` | verification | `dev`, by PR            | `StrummyTest` — anonymised copy of production, refreshed weekly | preview        | the gate below is green → PR `test` → `main`                     |
| `main` | production   | `test`, by PR; hotfixes | `StudentProduction` (`:54321`)                                  | **production** | —                                                                |

**Gate `test` → `main`**, all on the same commit:

1. migrations applied cleanly to `StrummyTest` (production-shaped data);
2. full Playwright suite, plus the persona checks on anonymised real accounts;
3. the dispatcher run once against `test` (crons only run on production deployments otherwise);
4. the owner reviewed the screen gallery and the backend-changes summary on the review page.

**Hotfix**: branch from `main`, PR into `main` on the owner's instruction, merge
`main` back into `dev` (and `test`) the same day.

Migrations are applied per branch: `deploy-db.yml` runs on every push to `dev`,
`test` and `main` and migrates that branch's own database (`migrations.md`).

**Not built yet** (planner vault, Strummy note): whatever of the gate above the
review page does not show yet (screen gallery, backend-changes summary). Until
then the gate is CI + Core flows + the owner's review.

## Branch Safety Protocol (MANDATORY - DO THIS FIRST)

**BEFORE starting ANY task**, check the current git branch and working tree state:

```bash
git branch --show-current && git status --short
```

**Rules:**

1. **Never work on `main`, `test` or `dev` directly.** Create a feature branch off `dev` FIRST.
2. **If a feature branch already exists for the task**, switch to it before doing anything.
3. **If there are uncommitted changes on the wrong branch**, stash or commit them before switching.
4. **Branch naming**: `feature/short-description` (or `fix/`, `chore/`, `refactor/`) — no ticket ID prefix.
5. **Create the branch BEFORE writing code**, not after.

```bash
# Quick reference
git branch --show-current && git status --short
git fetch origin && git checkout -b feature/short-description origin/dev

# If you accidentally started on dev, test or main with uncommitted changes
git stash && git checkout -b feature/short-description && git stash pop
```

## Parallel Agent Safety Protocol (MANDATORY when spawning 2+ agents)

### Option A: Worktree Isolation (Recommended)

Use `isolation: "worktree"` when calling the Agent tool (older harnesses name it the Task tool):

```
# CORRECT: each agent gets an isolated repo copy
Task(subagent_type="feature-developer", isolation="worktree", prompt="...")
Task(subagent_type="test-engineer", isolation="worktree", prompt="...")

# WRONG: agents share working directory (race conditions)
Task(subagent_type="feature-developer", prompt="...")
Task(subagent_type="test-engineer", prompt="...")
```

### Option B: Pre-Assignment Protocol (When worktrees aren't available)

1. **Ensure clean state**: `git status --short` must be empty. If not: commit first, don't stash.
2. **Create ALL branches upfront** (sequential, in orchestrator):
   ```bash
   git checkout -b feature/thing-a origin/dev && git checkout dev
   git checkout -b feature/thing-b origin/dev && git checkout dev
   ```
3. **Spawn agents with explicit branch names** in the prompt:
   > "Your pre-created branch is `feature/thing-a`. Run `git checkout feature/thing-a` as your FIRST action. Do NOT create branches or run git stash."

**Parallel agents MUST NOT**:

- Run `git stash` or `git stash pop` (shared stash = race condition)
- Run `git checkout -b` (branch creation = possible conflict)
- Assume the working directory state (another agent may have modified it)
