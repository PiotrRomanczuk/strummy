# GitHub Actions CI/CD

Six workflow files: `ci.yml` and `e2e.yml` run on every PR and every push to
the long-lived branches; `deploy-db.yml` migrates each branch's own database
after a push to `dev`, `test` or `main` (plus an hourly fallback on `main`);
`e2e-test.yml` runs the suite against StrummyTest nightly (self-hosted `uwh`
runner, zero billed minutes); `nightly-e2e.yml` runs the full suite against dev,
started by systemd timers on `uwh` (`scripts/ops/nightly-e2e/`); `review-gallery.yml`
follows `test` (after its database migrates, and when the test → main PR opens).
Three long-lived branches since 2026-11-15: `dev` → `test` → `main`, and `main`
→ Vercel production; the `production` branch, `release-train.yml` and the
tag/release job were removed on 2026-11-13.

No workflow merges a PR (`auto-merge.yml` was removed and repo auto-merge
switched off on 2026-11-13). A PR into `dev` is merged once CI is green and the
`pr-review` agent gave its verdict for the head commit; only the owner merges
into `main` (`.claude/rules/workflow.md`). Merges are made with a personal `gh`
login, so each one is an ordinary push and the `push` triggers fire.
**The `.yml` files' inline comments are the source of truth** — they carry the
measured timings, cost rationale, and past incident notes. This README is only
a map.

Labels that widen a PR's CI: `e2e` (full Playwright matrix), `extended-ci`
(knip, Lighthouse, Bruno). Without them a PR runs quality gates, gitleaks, the
DB checks and the **Core flows** suite. To run them add the label and then push
(an empty commit is fine) or close + reopen the PR — adding a label alone starts
nothing (`labeled` is not a trigger since 2026-11-13: every label used to cancel
the suite in flight), and `gh pr create --label` adds labels after the `opened`
event, so it starts nothing either.

This repo is **public**, so hosted-runner minutes are free (`gh repo view` →
visibility: PUBLIC). Everything that doesn't need the dev database runs on
`ubuntu-latest`; only jobs that need `StrummyDevelopment`/`StudentProduction`
run on the self-hosted `uwh` box. Every self-hosted job requires
`needs.guard.outputs.trusted == 'true'` — the `guard` job (`Trusted source`)
sets that to `false` for fork PRs and Dependabot PRs (by PR author and branch,
not only by `github.actor`), since a skipped required check reports as
neutral/passing otherwise.

## `ci.yml` — quality gates, static checks, perf/a11y

Triggers: push to `main`, every PR whatever its base (stacked PRs included);
`edited` re-runs it when a base is retargeted. All jobs `ubuntu-latest`.

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
  `database.types.ts` vs the schema the branch's own migrations build in a
  scratch database (not the shared dev stack, which may hold other open PRs'
  migrations — #1100).
- **rls** (`RLS policies`, **required**): RLS policy suites against the real
  dev database — ungated, runs on every PR (~20s, free). The only automated
  tests other than `bruno` that hit a real database.

The three schema checks cover one triangle and none of them substitutes for
another: `db-parity` = prod vs dev, `types-drift` = generated types vs the branch's
migrations (replayed into a scratch database since #1100),
`migrations-replay` = the migration chain vs dev.

`db-parity` and `migrations-replay` tolerate other open PRs' migrations that are
already on the branch database (a branch may apply its migration to dev before merging):
`fetch-open-pr-migrations.sh` downloads the migrations other open PRs add —
branches of this repo only, never forks, because the SQL runs as `postgres` in
the dev container — and `open-pr-migrations.lib.sh` keeps each PR's set only if
applying it on a copy of the scratch database brings it closer to that
database. The fetch step runs on `pull_request` events only, so checks on pushes
stay strict. A migration nobody applied changes nothing; an object no open PR
explains still fails (#1100). `types-drift` sidesteps the question: it generates
the types from the branch's migrations alone, in the dev container, whichever
branch the PR targets.

## `deploy-db.yml` — each branch's migrations to its own database

One database per long-lived branch (2026-11-15): a push to `dev` migrates
`StrummyDevelopment`, a push to `test` migrates `StrummyTest` (the anonymised
copy of production) and then replays `test`'s migrations to prove the two
agree, a push to `main` migrates production (after a `pg_dump`) and replays
`main`'s migrations against it. `scripts/e2e-remote/migrate-db.sh` plans
pending files against `strummy_ops.applied_migrations` on each stack.
Destructive files apply on their own on dev (dumped first) and test; before
production they route to `migrate-approved`, which waits on the
`production-db` environment's required reviewer. **"DB ready for production"**
is the job Vercel's Deployment Checks wait for before aliasing a production
build — rename it in both places or neither. Rules: `.claude/rules/migrations.md`.

Triggers: push to `dev`/`test`/`main`, hourly on `main` (fallback for a merge
made with a `GITHUB_TOKEN`, whose push starts no workflow), manual dispatch (`gh workflow run deploy-db.yml --ref
dev` catches dev or test up). Runs of one branch queue; different branches run
side by side.

One-off setup when a stack's bookkeeping is empty or behind (the script refuses
more than 10 pending files): `bash scripts/e2e-remote/migrate-db.sh <dev|test|prod>
baseline <last version already applied by hand>` on `uwh`.

## `e2e-test.yml` — the suite on `test`, against StrummyTest

Nightly at 02:47 UTC and on dispatch (`gh workflow run e2e-test.yml` before a
test → main PR): checks out `test`, provisions `.env.local` with
`scripts/test-stack/e2e-env.sh` (every Supabase name → StrummyTest, no
production value), runs every spec on Desktop Chrome without fail-fast, and
posts the commit status **E2E on StrummyTest** on the `test` commit — the head
of a test → main PR. Report on the run's summary page and in the
`e2e-test-desktop-chrome` artifact. Setup and accounts: `scripts/test-stack/README.md`.

## `review-gallery.yml` — screens of `test` beside `main`

After `Deploy DB` succeeds on `test`, when the test → main PR is opened, and on
dispatch (`gh workflow run review-gallery.yml`, `-f force=true` to re-render).
Builds `main` and `test` on uwh, serves both against StrummyTest, signs in as
people from the copy and captures each main screen on both at the same moment
(`tests/review/`, opt-in config `playwright.review.config.ts`). The gallery —
changed and broken screens first, with the differing pixels marked — is served
on the LAN only (`http://192.168.1.75:9877/<sha>/`) and filed as the `screens`
section on the PR's review page in home-ops. Details: `scripts/review/README.md`.

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
