# GitHub Actions CI/CD

Four workflow files: `ci.yml` and `e2e.yml` run on every PR and every push to
`main`; `deploy-db.yml` applies migrations after a merge (plus an hourly
fallback); `nightly-e2e.yml` runs the full device matrix against dev four times
a day. One branch: `main` → Vercel production (owner decision 2026-10-11,
`docs/analysis/2026-10-11-development-process-audit.md`); the `production`
branch, `release-train.yml` and the tag/release job were removed on 2026-11-13.

Nothing merges a PR on its own: the author never merges, Piotr merges from the
home-ops "Dziś" page after the `pr-review` agent (`pr_decide.py`, with his `gh`
login — so a merge is an ordinary push and the `push` triggers fire).
`auto-merge.yml` was removed and repo auto-merge switched off on 2026-11-13.
**The `.yml` files' inline comments are the source of truth** — they carry the
measured timings, cost rationale, and past incident notes. This README is only
a map.

Labels that widen a PR's CI: `e2e` (full Playwright matrix), `extended-ci`
(knip, Lighthouse, Bruno). Without them a PR runs quality gates, gitleaks, the
DB checks and the **Core flows** suite. Set them when opening the PR: adding a
label later starts nothing (`labeled` is not a trigger since 2026-11-13 — every
label used to cancel the suite in flight); close + reopen the PR, or push, to
pick it up.

This repo is **public**, so hosted-runner minutes are free (`gh repo view` →
visibility: PUBLIC). Everything that doesn't need the dev database runs on
`ubuntu-latest`; only jobs that need `StrummyDevelopment`/`StudentProduction`
run on the self-hosted `uwh` box. Every self-hosted job requires
`needs.guard.outputs.trusted == 'true'` — the `guard` job (`Trusted source`)
sets that to `false` for fork PRs and Dependabot PRs (by PR author and branch,
not only by `github.actor`), since a skipped required check reports as
neutral/passing otherwise.

## `ci.yml` — quality gates, static checks, perf/a11y

Triggers: push to `main`, PRs targeting `main`. All jobs `ubuntu-latest`. A
stacked PR (base = another feature branch) gets no `ci.yml` run until its base
is retargeted to `main` (the `edited` event covers that).

- **quality-gates** (`Lint, types, tests, build`, **required**): lint +
  typecheck (concurrent), structure check, the full unit suite with coverage
  thresholds (PRs and `main` alike), integration tests, Next.js build.
- **knip** (`Unused code (knip)`, `extended-ci` label only, `--no-exit-code`): unused
  files/exports/dependencies, scoped to `app/components/lib/hooks/schemas/types`.
  Not yet required — first pass surfaced real findings nobody has triaged.
- **gitleaks** (`Secret scan (gitleaks)`): full-history secret scan against
  `.gitleaks-baseline.json` (220 pre-existing findings, 219 false positives +
  one expired token — see `docs/runbooks/2026-08-05-gitleaks-history-audit.md`).
  Only flags something new.
- **lighthouse-ci** (`Performance + a11y`, `extended-ci` label only, **always advisory** —
  every step `continue-on-error`): Lighthouse (perf/a11y/best-practices/SEO)
  and `@axe-core/cli` against the unauthenticated homepage, built with
  placeholder Supabase + mock `CRON_SECRET`/`GMAIL_*` env (same pattern as
  quality-gates). Lighthouse's performance score is a _simulated_ mobile/4x-CPU
  estimate, not real load time — read the job's own comment before trusting
  the number.

## `e2e.yml` — Playwright + DB checks (self-hosted `uwh` runner, zero billed minutes)

Triggers: manual dispatch, push to `main`, PRs (jobs are gated — see below).

- **detect**: classifies the PR diff; risky paths (auth, migrations, e2e infra)
  auto-enable the full suite. The `e2e` label is the manual override.
- **e2e** (`E2E (Desktop Chrome)`, **required**): full Playwright suite
  against the `StrummyDevelopment` stack. Gated on dispatch / label /
  risky-path detection — never every PR.
- **flows** (`Core flows (Desktop Chrome)`, **every trusted PR**): `npm run
test:flows` — `tests/flows/` F01–F11, the definition of basic full
  functionality (`tests/flows/README.md`). ~2 min, full report, never fail-fast.
- **bruno** (`API contract (Bruno)`, `extended-ci` label only): GET-only smoke against the
  178-request Bruno collection — `--get-only` in `run-bruno.sh` never mutates
  the shared dev stack. `continue-on-error` until
  `~/.strummy-e2e/.env.local` on `uwh` gets ADMIN/TEACHER/STUDENT credentials
  (currently missing — ~auth-gated requests correctly 401 without them).
- **db-parity**: prod-vs-dev schema diff (read-only), ungated — makes the E2E
  green transferable to prod. Migrations not yet on `main` (counted against
  `main`, so stacked PRs work) are allowed to be on dev already.
- **test-data-report** (`Test-data hygiene report`, advisory, ungated):
  read-only sweep of `StudentProduction` for QA/test-account drift —
  dev-flagged profiles (should be zero), plus-alias emails, duplicate lesson
  bookings, duplicate `song_of_the_week` rows. Never deletes, never fails the
  build; findings land in the job summary for a human to act on.
- **migrations-replay**: replays `supabase/migrations` into a throwaway
  database and diffs the result against dev — catches schema changes applied
  by hand and never filed as a migration. Ungated.
- **types-drift** (`DB types drift`, **required**): generated
  `database.types.ts` vs the live dev schema.
- **rls** (`RLS policies`, **required**): RLS policy suites against the real
  dev database — ungated, runs on every PR (~20s, free). The only automated
  tests other than `bruno` that hit a real database.

The three schema checks cover one triangle and none of them substitutes for
another: `db-parity` = prod vs dev, `types-drift` = generated types vs dev,
`migrations-replay` = the migration chain vs dev.

## `deploy-db.yml` — migrations to dev and production after merge

Triggers: push to `main`, hourly fallback (for a merge made with a
`GITHUB_TOKEN`, whose push starts no workflow), manual dispatch. `scripts/e2e-remote/migrate-db.sh` plans pending files against
`strummy_ops.applied_migrations` on each stack, applies them to dev (canary) and
then production (after a `pg_dump`), and finishes with `check-db-parity.sh`.
Destructive files route to `migrate-approved`, which waits on the
`production-db` environment's required reviewer. **"DB ready for production"**
is the job Vercel's Deployment Checks wait for before aliasing a production
build — rename it in both places or neither. Rules: `.claude/rules/migrations.md`.

One-off setup when a stack's bookkeeping is empty or behind (the script refuses
more than 10 pending files): `bash scripts/e2e-remote/migrate-db.sh <dev|prod>
baseline <last version already applied by hand>` on `uwh`.

## Operational notes

- Secrets/config for the self-hosted jobs live on the runner host
  (`~/.strummy-e2e/.env.local`), never in the repo.
- The self-hosted runner executes repo code on a home machine holding dev
  **and** prod Supabase keys — the `guard` job is what keeps fork/Dependabot
  PRs off it now that the repo is public. Fork runs need approval for **all**
  outside contributors (repo setting, since 2026-11-13); never approve a fork
  run that touches `.github/` or `scripts/` — a fork's workflow file can drop
  the guard.
- Deploys are Vercel Git-integration, not Actions (`vercel.json` gates which
  builds run).
- Dependabot: `../dependabot.yml` (npm root + `mcp/strummy-server` +
  github-actions, weekly, grouped: `next` + `eslint-config-next` together,
  other minor/patch updates in one PR).
