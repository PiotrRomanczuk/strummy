# GitHub Actions CI/CD

Three live workflows. **The `.yml` files' inline comments are the source of
truth** — they carry the measured timings, cost rationale, and past incident
notes. This README is only a map.

This repo is **public**, so hosted-runner minutes are free (`gh repo view` →
visibility: PUBLIC). Everything that doesn't need the dev database runs on
`ubuntu-latest`; only jobs that need `StudentDevelopment`/`StudentProduction`
run on the self-hosted `uwh` box. Every self-hosted job requires
`needs.guard.outputs.trusted == 'true'` — the `guard` job (`Trusted source`)
sets that to `false` for fork PRs and Dependabot PRs, since a skipped required
check reports as neutral/passing otherwise.

## `ci.yml` — quality gates, static checks, perf/a11y, release

Triggers: push to `main`/`production`, PRs targeting either. All jobs
`ubuntu-latest`.

- **quality-gates** (`Lint, types, tests, build`, **required**): lint +
  typecheck (concurrent), structure check, unit tests (PRs:
  `--changedSince=origin/main` affected-only; `main`: full suite + coverage),
  integration tests, Next.js build.
- **knip** (`Unused code (knip)`, PR-only, `--no-exit-code`): unused
  files/exports/dependencies, scoped to `app/components/lib/hooks/schemas/types`.
  Not yet required — first pass surfaced real findings nobody has triaged.
- **gitleaks** (`Secret scan (gitleaks)`): full-history secret scan against
  `.gitleaks-baseline.json` (220 pre-existing findings, 219 false positives +
  one expired token — see `docs/runbooks/2026-08-05-gitleaks-history-audit.md`).
  Only flags something new.
- **lighthouse-ci** (`Performance + a11y`, PR-only, **always advisory** —
  every step `continue-on-error`): Lighthouse (perf/a11y/best-practices/SEO)
  and `@axe-core/cli` against the unauthenticated homepage, built with
  placeholder Supabase + mock `CRON_SECRET`/`GMAIL_*` env (same pattern as
  quality-gates). Lighthouse's performance score is a _simulated_ mobile/4x-CPU
  estimate, not real load time — read the job's own comment before trusting
  the number.
- **release** (push to `production` only): cuts a git tag + GitHub Release
  from the merged PR — branch prefix decides the bump (`feature/` → minor,
  else patch), `version:major|minor|patch` labels override. PR body becomes
  the release notes. No version-bump commits; `package.json`'s version stays
  frozen.

## `e2e.yml` — Playwright + DB checks (self-hosted `uwh` runner, zero billed minutes)

Triggers: manual dispatch, push to `main`, PRs (jobs are gated — see below).

- **detect**: classifies the PR diff; risky paths (auth, migrations, e2e infra)
  auto-enable the full suite. The `e2e` label is the manual override.
- **e2e** (`E2E (Desktop Chrome)`, **required**): full Playwright suite
  against the `StudentDevelopment` stack. Gated on dispatch / label /
  risky-path detection — never every PR.
- **bruno** (`API contract (Bruno)`, ungated): GET-only smoke against the
  178-request Bruno collection — `--get-only` in `run-bruno.sh` never mutates
  the shared dev stack. `continue-on-error` until
  `~/.strummy-e2e/.env.local` on `uwh` gets ADMIN/TEACHER/STUDENT credentials
  (currently missing — ~auth-gated requests correctly 401 without them).
- **db-parity**: prod-vs-dev schema diff (read-only), ungated — makes the E2E
  green transferable to prod.
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

## Operational notes

- Secrets/config for the self-hosted jobs live on the runner host
  (`~/.strummy-e2e/.env.local`), never in the repo.
- The self-hosted runner executes repo code on a home machine holding dev
  **and** prod Supabase keys — the `guard` job is what keeps fork/Dependabot
  PRs off it now that the repo is public. Review Actions settings (require
  approval for outside collaborators) whenever repo visibility changes.
- Deploys are Vercel Git-integration, not Actions (`vercel.json` gates which
  builds run).
- Dependabot: `../dependabot.yml` (npm root + `mcp/strummy-server` +
  github-actions, weekly).
