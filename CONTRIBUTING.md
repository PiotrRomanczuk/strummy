# Contributing to Strummy

_Rewritten 2026-07-27. Strummy is built and run by one person; this describes the actual
workflow, not an aspirational one._

## Getting started

```bash
npm install
cp .env.example .env.local     # fill in Supabase + provider keys
npm run dev                    # http://localhost:3000
```

Local development runs against a Supabase stack on the LAN rather than a cloud project — see
[`reference/DEVELOPMENT.md`](docs/app-blueprint/reference/DEVELOPMENT.md) for connection details
and seeding.

Read before your first change:

| Doc                                                   | Why                                       |
| ----------------------------------------------------- | ----------------------------------------- |
| [`00-overview.md`](docs/app-blueprint/00-overview.md) | What the app is, the core loop, the roles |
| The domain doc for what you're touching (`01`–`10`)   | Data model, rules, UI surfaces, open gaps |
| [`CLAUDE.md`](CLAUDE.md)                              | Conventions, size limits, branch safety   |

## Workflow

### 1. Branch from `main`

The prefix is meaningful — release automation reads it to decide the version bump.

| Prefix      | Bump  | Use for                     |
| ----------- | ----- | --------------------------- |
| `feature/`  | minor | new capability              |
| `fix/`      | patch | bug fix                     |
| `refactor/` | patch | behaviour-preserving change |
| `chore/`    | patch | tooling, deps, docs-only    |

```bash
git checkout main && git pull
git checkout -b fix/lesson-list-overflow
```

**Never commit to `main` directly** — every merge to `main` deploys straight to production.

### 2. Make the change

- Components ≤200 lines, hooks ≤150, function bodies ≤50. Split rather than sprawl.
- No `any`. Use `unknown` and narrow.
- Validate external input with a Zod schema from `/schemas`.
- **Any database change needs a migration file** in `supabase/migrations/`, written idempotently.
  A change applied only by hand is invisible to every other environment and will cause drift.
- RLS is the security boundary (ADR-0001). App-layer checks are convenience, not protection.

### 3. Prove it

```bash
npm run lint        # must be 0 errors
npm run typecheck   # must be clean
npm test            # must be green
```

New logic needs a test. A change to a table's read/write path needs an RLS case — see
[`91-testing-strategy.md`](docs/app-blueprint/91-testing-strategy.md) for what "done" means at
each layer.

For anything a human should click through, write a manual-test report to
`docs/manual-tests/YYYY-MM-DD-<feature>.html` before committing: what changed, and the exact
steps to verify it.

### 4. Commit

Conventional commits — `type(scope): description`:

```
feat(lessons): add repeat-weekly option to the lesson form
fix(songs): render lyrics_with_chords on the detail page
```

Do not add `Co-Authored-By: Claude` lines.

### 5. Open a PR

**The PR description becomes the GitHub Release notes.** Write it for someone using the app, not
for someone reading the diff: what's new, what's fixed, anything breaking, screenshots for UI.

Squash and merge, then delete the branch immediately — the repo's rule is a maximum of five open
local branches.

## Where state lives

| Question                                | Where                                     |
| --------------------------------------- | ----------------------------------------- |
| What a feature does, how to build a gap | `docs/app-blueprint/` (the blueprint)     |
| What's in flight, what's next           | The Obsidian planner vault, not this repo |
| What shipped and when                   | GitHub Releases                           |

There is no ticket system. Work is picked from the blueprint's open gap briefs and the vault's
Now/Next list.

## Two caveats a newcomer would not guess

- **One branch, one deployment.** `main` deploys to Vercel production; there is no
  `production` branch, no release train and no tag step (switched off 2026-10-11,
  `docs/analysis/2026-10-11-development-process-audit.md`). Every PR to `main` runs
  `ci.yml` (lint, types, unit + integration tests, build) and, on the self-hosted runner,
  `npm run test:flows` — the core-flow suite in `tests/flows/`, which is the definition of
  "basic full functionality". The full Playwright matrix, knip, Lighthouse and Bruno run only
  behind the `e2e` / `extended-ci` labels or by manual dispatch. No workflow has a
  `schedule:`.
- **Hooks are real.** `npm install` runs `husky`, which points `core.hooksPath` at
  `.husky/`. `pre-commit` runs lint-staged (ESLint on staged TS/TSX, Prettier on the rest)
  and Jest on the tests related to the staged files. There is no pre-push hook — CI is the
  gate, and it runs the same commands.
