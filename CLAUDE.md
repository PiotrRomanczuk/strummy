# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Strummy is a student management system for guitar teachers built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, and Supabase (PostgreSQL, Auth, RLS).

**Deployment model (since 2026-10-11)**: one branch. `main` deploys to Vercel
production. No `production` branch, no release train, no tags. `package.json`'s
`version` field is frozen and meaningless (the app is not published to npm).

## Commands

```bash
# Development
npm run dev              # Start dev server (uses nodemon)
npm run build            # Production build
npm run lint             # Run ESLint
npm run typecheck        # TypeScript check (CI gates on this — run it before push)

# Testing
npm test                 # Run Jest unit tests
npm test -- --watch      # Watch mode
npm run test:coverage    # With coverage report
npm run test:integration # Run Jest integration tests
npm run test:all         # Run unit + integration tests
npx playwright test      # Run E2E tests (Playwright)

# Database
npm run setup:db         # Set up Supabase database
npm run seed             # Add sample data

# Core flows (the definition of basic full functionality — tests/flows/README.md)
npm run test:flows               # all flows, Desktop Chrome, dev stack
npm run test:flows -- --grep F03 # one flow
```

## Branch Safety & Parallel Agents (MANDATORY)

> Canonical rules auto-load from `.claude/rules/branch-safety.md` — follow them;
> they are not repeated here. TL;DR: run `git branch --show-current && git status --short`
> before ANY task, never work on `main`, create the `feature/`|`fix/`|`chore/`|`refactor/`
> branch BEFORE writing code, and give parallel agents worktree isolation
> (`isolation: "worktree"` on the Agent tool) or pre-created branches — parallel
> agents must never `git stash` or `git checkout -b` in a shared checkout.

## Development Workflow

> Canonical workflow auto-loads from `.claude/rules/workflow.md` (branch → commit
> format → test → PR → squash-merge, the non-blocking CI loop, and release-notes
> rules). Full detail: `.claude/agents/git-workflow.md`. Not repeated here.

Two points worth their weight in every session:

- **Merging to `main` deploys to production.** Keep PRs small (≤ 500 lines, one
  flow per PR), write the body as 3–5 lines a user would understand, and arm
  auto-merge (`gh pr merge --auto --squash`) at push time. Branch protection
  holds the gates; green merges itself.
- **Remote sessions** (Claude Code on the web) cannot reach the Obsidian vault or
  the `uwh` LAN. Skip those steps, say so in the PR body, and leave a vault
  follow-up note — do not fail the task over an unreachable Mac path.

## Architecture

### Tech Stack

- **Frontend**: Next.js 16 App Router, React 19, Tailwind CSS 4, TanStack Query
- **Backend**: Supabase (PostgreSQL with RLS), Server Actions
- **Validation**: Zod schemas in `/schemas`
- **AI**: OpenRouter (cloud) and Ollama (local) via abstraction layer in `/lib/ai`
- **Testing**: Jest (unit + integration), Playwright (E2E). E2E covers critical flows and permissions only, max 10 per feature (see `.claude/rules/playwright-testing.md`).

### Directory Structure

Four root-level docs describe the whole system — read them before the per-domain blueprint: `docs/PRD.md` (scope, journeys, feature specs), `docs/ARCHITECTURE.md` (stack, data flow, security boundary), `docs/DESIGN_SYSTEM.md` (tokens, shells, components), `AGENTS.md` (tool-agnostic ground rules; this file wins where they differ).

- `/app` -- Next.js App Router pages, API routes, Server Actions
- `/components` -- React components organized by domain (lessons, songs, users, etc.)
- `/lib` -- Business logic: `/lib/ai` (AI providers), `/lib/services`, `/lib/supabase`
- `/schemas` -- Zod validation schemas
- `/types` -- TypeScript type definitions
- `/supabase` -- Database migrations
- `proxy.ts` -- Next.js 16 request proxy (the former `middleware.ts`): auth gate for `/dashboard`, CSP, locale cookie
- `.claude/agents/` -- Specialized AI agent configurations

### Role-Based Access Control

Three roles enforced via Supabase RLS: **Admin**, **Teacher**, **Student**. Currently teacher dashboard displays admin view (owner is only teacher).

### Database Changes (MANDATORY)

**Any change to the database MUST be captured as a migration file in `supabase/migrations/`. No exceptions.** This covers tables, columns, enum values, functions/RPCs, triggers, indexes, grants, and RLS policies.

- **Never** make a schema change only ad-hoc (via `psql`, Supabase Studio, or the dashboard) without committing a matching migration file. The file is the source of truth — an un-filed change is invisible to a fresh DB and every other environment, and **will** cause drift.
- Naming: `YYYYMMDDHHMMSS_short_description.sql` (timestamp prefix keeps them ordered).
- Write **idempotent** DDL so a migration is safe to re-apply: `create table if not exists`, `add column if not exists`, `create or replace function`, `drop policy/trigger if exists` before `create`.
- Match the existing RLS conventions — helpers `public.is_admin()`, `public.is_teacher()`, `public.current_profile_id()`, and the `public.set_updated_at()` trigger (see `supabase/migrations/20260718090500_assignments.sql`). The DB is the security boundary (ADR-0001): students write via `SECURITY DEFINER` RPCs, never direct table UPDATEs.
- Applying a migration by hand (e.g. `psql` into a dev container) for testing is fine, but the **file must still be committed**. Never hand-edit `types/database.types.ts` as a substitute for a migration; regenerate types (`supabase gen types`) if a typed consumer needs the new shape.
- **Migrations reach dev and production automatically** after merge to `main`: `.github/workflows/deploy-db.yml` → `scripts/e2e-remote/migrate-db.sh` (backup, apply pending files in order, record them in `strummy_ops.applied_migrations`, then `db-parity`). Never `psql` a migration into **StudentProduction** by hand. Destructive files (drop/rename/type change/truncate/delete) wait for approval on the `production-db` environment. Rules: `.claude/rules/migrations.md`.
- A branch migration you apply to the **shared dev stack** for testing is yours to revert if the PR does not merge — an abandoned one turns `migrations-replay` red for everyone (2026-10-14, `ai_workflow_runs`).

### Database Connection

Dual connections: "local/dev" Supabase for development, prod for production. Configured via `NEXT_PUBLIC_SUPABASE_LOCAL_*` (dev) and the live URL / tunnel (prod).

**Supabase stacks (uwh, Ubuntu HP EliteDesk — verified 2026-07-20)**: two Supabase-CLI-managed stacks run on `uwh`, NOT on this Mac. (The older `StudentManager` / `StrummyProd` names are stale.)

- **`StudentDevelopment`** (DEV — safe to migrate/seed): API/Kong `http://192.168.1.75:55321`, Postgres `192.168.1.75:55322`. `.env.local`'s `NEXT_PUBLIC_SUPABASE_LOCAL_URL` points here. New-format keys (`sb_publishable_…` / `sb_secret_…`).
- **`StudentProduction`** (PROD — do NOT apply unproven changes): API/Kong `http://192.168.1.75:54321`, Postgres `192.168.1.75:54322`, reached in prod via a Cloudflare tunnel (hostname in `CLAUDE.local.md` and Vercel env vars — NOT in this file: the repo is public). **⚠️ Port 54321 is PRODUCTION — never assume it's "local".**

Node `fetch` reaches the LAN IPs fine now (the old `EHOSTUNREACH`-on-LAN quirk is resolved). Apply a migration to dev for testing with `docker exec -i supabase_db_StudentDevelopment psql -U postgres -d postgres < <file>` on `uwh`. For RLS integration tests, point `RLS_TEST_SUPABASE_URL` at the dev stack (see `lib/testing/rls/env.ts`) — the harness hard-refuses to run against prod.

**⚠️ Never run `supabase stop`/`supabase start` on production without reading
`docs/runbooks/supabase-stack-restart.md` first.** The CLI rebuilds containers
from `config.toml`, which cannot express `GOTRUE_MAILER_URLPATHS_*`, so every
restart re-points auth email links at `127.0.0.1` — invites and password resets
are delivered with a dead link and **nothing errors**. Repair with
`~/ops/restore-gotrue-mail-urls.py prod` (source: `scripts/ops/`) and verify
before walking away.

The same script also owns `GOTRUE_MAILER_TEMPLATES_*`. Those are the louder
failure: the CLI aims them at a Kong endpoint that serves nothing, GoTrue counts
a failed template fetch as a failed **send**, and sign-up/reset/invite all die
with _"Error sending confirmation email"_. Templates therefore live in
`public/email/` (served by the app), not behind `content_path` in `config.toml`.
Verify a real send, not just the container env — see runbook section 3.

**Remote sessions** (Claude Code on the web) cannot reach the LAN. The dev
stack CAN be exposed to them via a dev-named Cloudflare tunnel + environment
config (network allowlist + `RLS_TEST_*` env vars) — full runbook:
`docs/remote-dev-db-access.md`. Probe `$RLS_TEST_SUPABASE_URL` before assuming
either way; without the tunnel, DB-touching work goes through the self-hosted
runner (push a branch, let `e2e.yml` run it).

## Agents Architecture

Specialized AI agents live in `.claude/agents/`. Each agent has a focused responsibility, defined tools, and quality standards.

### Agent Catalog

#### Core Development

| Agent                      | File                        | Purpose                                                                      |
| -------------------------- | --------------------------- | ---------------------------------------------------------------------------- |
| **Feature Developer**      | `feature-developer.md`      | New features: Next.js/React/Supabase patterns, RSC-optimized, Zod validation |
| **UI Engineer**            | `ui-engineer.md`            | UI: shadcn/ui, Radix UI, Tailwind CSS 4, Framer Motion, mobile-first         |
| **Refactoring Specialist** | `refactoring-specialist.md` | Split oversized files, eliminate `any` types, enforce SRP                    |
| **Test Engineer**          | `test-engineer.md`          | Unit (Jest), integration (Jest), E2E (Playwright)                            |
| **Git Workflow**           | `git-workflow.md`           | Branching, commits, Obsidian vault sync, versioning, PR lifecycle            |

#### Database & Supabase

| Agent                           | File                             | Purpose                                                      |
| ------------------------------- | -------------------------------- | ------------------------------------------------------------ |
| **Database Ops**                | `database-ops.md`                | Schema changes, migrations, RLS policies, query optimization |
| **Supabase Schema Architect**   | `supabase-schema-architect.md`   | Schema design (3NF+), migration management, RLS architecture |
| **Supabase Realtime Optimizer** | `supabase-realtime-optimizer.md` | WebSocket connections, subscriptions, message batching       |

#### DevOps & Quality

| Agent                      | File                        | Purpose                                                           |
| -------------------------- | --------------------------- | ----------------------------------------------------------------- |
| **Deployment Ops**         | `deployment-ops.md`         | Vercel deployments, CI/CD, cron health, incident response (P0-P3) |
| **PR Manager**             | `pr-manager.md`             | Creates PRs, updates Obsidian vault, quality gates, version bumps |
| **PR Reviewer**            | `pr-reviewer.md`            | 10-pass code review: quality, security, testing, performance      |
| **Security Reviewer**      | `security-reviewer.md`      | Security audits, auth flows, secret detection, RLS review         |
| **Observability Engineer** | `observability-engineer.md` | Monitoring, logging, Sentry, health checks, Vercel Analytics      |

#### Project Management & Domain

| Agent                        | File                          | Purpose                                                |
| ---------------------------- | ----------------------------- | ------------------------------------------------------ |
| **Obsidian Coordinator**     | `obsidian-coordinator.md`     | Vault sync: mark tasks WIP/done, triage Now/Next/Later |
| **Instagram API Specialist** | `instagram-api-specialist.md` | Instagram Graph API, publishing flow, token management |

### Agent Selection Guide

```
New feature?            → feature-developer + ui-engineer
Database change?        → database-ops or supabase-schema-architect
Writing tests?          → test-engineer
Code too large/messy?   → refactoring-specialist
Git/branching/version?  → git-workflow
Creating a PR?          → pr-manager
Reviewing a PR?         → pr-reviewer
Security concern?       → security-reviewer
Deploy/CI issue?        → deployment-ops
Monitoring/logging?     → observability-engineer
Realtime subscriptions? → supabase-realtime-optimizer
Task triage/vault sync? → obsidian-coordinator
Instagram API?          → instagram-api-specialist
```

### Agent Conventions

- All agents enforce the size limits in `.claude/rules/code-style.md` (components <200 LOC, hooks <150, function bodies <50) and **no `any` types**
- All agents update the Obsidian vault (mark WIP before starting, Done after merging)
- Database agents enforce **RLS on all tables**
- All agents require **tests before merging** (70% coverage minimum)

## Code Conventions

> Canonical conventions auto-load from `.claude/rules/code-style.md` — component
> organization (`Parent.Section.tsx`), naming, size limits (components <200 LOC,
> hooks <150, function bodies <50), shadcn/ui usage, form validation, and
> mobile-first styling with `dark:` variants. Not repeated here.

### File naming under `components/` — ALWAYS follow this

Settled 2026-07-31 and applied to the whole tree in one pass. **There is one
convention. Always use it — for new files, and when renaming or moving an
existing one. Never reintroduce a second style, not even locally, not even
"temporarily".**

| Kind           | Shape                                       | Example                  |
| -------------- | ------------------------------------------- | ------------------------ |
| Component      | `PascalCase.tsx`                            | `SongForm.tsx`           |
| Sub-component  | `Parent.Section.tsx`                        | `SongForm.Preview.tsx`   |
| Hook           | `useThing.ts`                               | `useSongPicker.ts`       |
| Support module | `kebab-subject.role.ts`                     | `song-picker.helpers.ts` |
| Barrel         | `index.ts`                                  |                          |
| Directory      | `kebab-case/`                               | `songs/song-picker/`     |
| Test           | colocated, subject's name + optional flavor | `SongForm.unit.test.tsx` |

`role` is a closed set: **helpers · types · constants · styles · data · i18n ·
shared**. A bare support module (`format.ts`, `primitives.tsx`, `helpers.ts`) is
never acceptable — that is exactly how four different `Card` components ended up
behind four `primitives.tsx` imports. A module exporting several components is
PascalCase named for the group (`LessonDetailPrimitives.tsx`).

`components/ui/` is exempt — it is the shadcn registry and keeps that project's
filenames.

**Enforced:** `C6` in `npm run check:structure`. Adding a role means editing the
table in `.claude/rules/code-style.md` and `C6_ROLES` in
`scripts/ci/check-structure.sh` in the same commit — otherwise it is not a role.

## Structure

> Canonical structural rules auto-load from `.claude/rules/structure.md` — module
> layout, layering, duplicate names, generated files, dead code, and version
> suffixes. Every rule there names the incident that produced it and the check
> that catches a recurrence.

Run `npm run check:structure` (2s, read-only) before opening a PR that moves or
adds modules. It fails hard on one thing only — a file that shadows a
directory's `index.ts`, which is invisible to `tsc` and is how a duplicate
`authenticateRequest` survived unnoticed. Everything else is a warning against
`scripts/ci/.structure-baseline`, so only **new** drift surfaces; accept
reviewed findings with `--update-baseline`.

## Testing

**TDD workflow**: Write failing test → Implement → Refactor

**Pyramid**: 70% unit (Jest), 20% integration (Jest), 10% E2E (Playwright)

- **Unit tests**: `npm test` — full unit suite (~290 suites / ~3.8k tests as of 2026-07; treat counts as approximate, they grow)
- **Integration tests**: `npm run test:integration` — uses `jest.config.integration.ts`
- **E2E tests**: `npx playwright test` — journey specs + per-domain suites under `tests/e2e/`
- **RLS tests**: `npm run test:rls` — the ONLY suites hitting a real database (dev stack; CI runs them on the self-hosted runner)
- **All Jest tests**: `npm run test:all`

Integration test helpers live in `lib/testing/integration-helpers.ts`.
Tests are colocated beside their subject (`X.test.tsx`, `X.unit.test.ts`); the few remaining `lib/*/__tests__/` directories are legacy, not the convention.

## Deployment

**One branch, one target** (owner decision 2026-10-11,
`docs/analysis/2026-10-11-development-process-audit.md`):

| Branch pushed              | Vercel target  | Serves                                  |
| -------------------------- | -------------- | --------------------------------------- |
| `main`                     | **production** | `strummy.online` + `strummy.vercel.app` |
| any branch with an open PR | preview        | a preview URL, no alias                 |

- Merging a PR to `main` **is** the release. Nothing else has to happen —
  **provided** Vercel's Production Branch is `main` and the Deployment Check
  **"DB ready for production"** (`deploy-db.yml`) is required in Vercel
  (Settings → Build and Deployment → Deployment Checks). A production build is
  then aliased to `strummy.online` only after its migrations are applied.
  _2026-10-19: Production Branch was still `production` (last release 14.09) —
  verify in the dashboard before trusting this section._
- Crons run on production deployments only (`vercel.json`, daily dispatcher).
- `NEXT_PUBLIC_*` is inlined at build time: setting a var without a rebuild
  changes nothing.
- Gates before a merge: `ci.yml` (lint, types, unit + integration tests, build)
  and `e2e.yml`'s **Core flows** job (`npm run test:flows`, every PR). The full
  Playwright matrix needs the `e2e` label; knip / Lighthouse / Bruno need
  `extended-ci`; `nightly-e2e.yml` and `release-train.yml` are dispatch-only.
- The `production` branch and the two-stage history (2026-08-16 → 2026-10-11)
  are explained in `docs/analysis/2026-10-11-development-process-audit.md`;
  releases cut in that era stay at https://github.com/PiotrRomanczuk/strummy/releases.

## Dev Credentials (Local Only)

The three role accounts (Admin / Teacher / Student) for the **`StudentDevelopment`**
stack live in **`CLAUDE.local.md`** (gitignored) — NOT here: the repo is public.
`playwright.config.ts` reads the same defaults, so E2E and manual testing stay
in sync.

Semantics that matter to agents:

- The role accounts are `is_development: false`, so they are **not** blocked by
  `guardTestAccountMutation` — create/edit/delete flows work normally. (Accounts
  with `is_development: true` are blocked unless `DEMO_WRITES_ENABLED=true`.)
- Google SSO does not work against a LAN dev stack — use email/password.
- Seed with: `npm run seed`

## Production Test Accounts (⚠️ real prod DB — do not delete)

Two dedicated test accounts exist on **`StudentProduction`** (not dev) for
manual/agent QA against the real production stack, created 2026-07-30:

- `p.romanczuk+testteacher@gmail.com` — Teacher role
- `p.romanczuk+teststudent@gmail.com` — Student role

Passwords live in **`CLAUDE.local.md`** (gitignored) — NOT here: the repo is
public. These are aliases of the owner's own inbox (same pattern as
`p.romanczuk+michalwojcik@gmail.com`), so transactional emails route correctly
and cleanup is easy. Do not treat these as real student/teacher data — they
exist purely for exercising production flows without touching real accounts.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
