# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Strummy is a student management system for guitar teachers built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, and Supabase (PostgreSQL, Auth, RLS).

**Version**: cut automatically as a git tag + GitHub Release on every merge to
**`production`** (not `main` — `main` is staging; see Deployment below) — see
https://github.com/PiotrRomanczuk/strummy/releases. Do NOT state a version
number in this file (it rots) and do not trust `package.json`'s `version` field:
it is frozen and meaningless (the app is not published to npm).

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

# Version Management & Releases (automated post-merge via GitHub Action)
# Branch prefix determines bump type: feature/ → minor, fix/ → patch, etc.
# Override with PR labels: version:major, version:minor, version:patch
# Workflow automatically creates: git tags, GitHub releases, changelog links
# PR descriptions become release notes - write comprehensive, user-facing content
# Manual bump only needed for hotfixes to production branch
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

- **PR descriptions become GitHub Release notes** (auto-tag + Release on merge).
  Write them user-facing. Releases: https://github.com/PiotrRomanczuk/strummy/releases
- **Never wait for CI.** Arm auto-merge (`gh pr merge --auto --squash`) at push
  time and start the next task; check PR statuses in batches (`/merge-fleet`).
- **Remote sessions** (Claude Code on the web) cannot reach the Obsidian vault or
  the `uwh` LAN. Skip those steps, say so in the PR body, and leave a vault
  follow-up note — do not fail the task over an unreachable Mac path.

## Architecture

### Tech Stack

- **Frontend**: Next.js 16 App Router, React 19, Tailwind CSS 4, TanStack Query
- **Backend**: Supabase (PostgreSQL with RLS), Server Actions
- **Validation**: Zod schemas in `/schemas`
- **AI**: OpenRouter (cloud) and Ollama (local) via abstraction layer in `/lib/ai`
- **Testing**: Jest (unit + integration), Playwright (E2E). Every new feature MUST include Playwright E2E tests (see `.claude/rules/playwright-testing.md`).

### Directory Structure

- `/app` -- Next.js App Router pages, API routes, Server Actions
- `/components` -- React components organized by domain (lessons, songs, users, etc.)
- `/lib` -- Business logic: `/lib/ai` (AI providers), `/lib/services`, `/lib/supabase`
- `/schemas` -- Zod validation schemas
- `/types` -- TypeScript type definitions
- `/supabase` -- Database migrations
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
Tests live in `/__tests__` mirroring source structure.

## Deployment

> ⚠ **ACTUAL STATE, verified 2026-08-17: the two-stage model is now ON.**
> `main` is **staging** — merging a feature PR there does NOT reach users.
> `production` is the release branch, and merging `main` → `production` is what
> puts code in front of real users at `https://strummy.online`.

### What actually happens today

| Branch pushed              | Vercel target  | Serves                                            |
| -------------------------- | -------------- | ------------------------------------------------- |
| `main`                     | preview        | staging URL (Vercel-Auth protected), no alias     |
| `production`               | **production** | `strummy.online` + `strummy.vercel.app` (aliased) |
| any branch with an open PR | preview        | a preview URL, no alias                           |

Evidence: the Vercel _Production Branch_ setting was changed on **2026-08-16
~21:25 UTC** (project `updatedAt`), and the very next merge to `main` — PR #732
at 21:43 — produced a deployment with `target=preview` rather than
`target=production`. Before that flip, `main` had been the production branch
since the project was created; the 2026-07-31 note below describes that era.

- **Merging a feature PR to `main` is not a release.** It is a smoke gate.
- **Releasing is a `main` → `production` PR.** Its body becomes the GitHub
  Release notes; the release job in `ci.yml` fires on pushes to `production`.
- **Crons run on production deployments only** — staging does not email students.
- **Staging shares the PRODUCTION database.** It is a code smoke gate, not a safe
  playground: writes touch real student data and migrations cannot be rehearsed
  there. Vercel Authentication (SSO protection, `all_except_custom_domains`) is
  what keeps that URL from being a public second door to production data — do not
  disable it.
- **`NEXT_PUBLIC_*` is inlined at build time.** Setting a var without a rebuild
  changes nothing, and Preview/Production hold separate values.

### The failure mode this introduces: silence

The two-stage model trades "every merge ships" for "nothing ships until someone
opens the release PR". On 2026-08-17 production was found still serving the
**2026-08-15** build with nine PRs stacked up on `main`, because:

1. **Builds were failing and nobody was watching.** Every recent build errored
   with `Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'`,
   preceded by Google Fonts fetch warnings. The same build succeeds locally and a
   plain `vercel redeploy` succeeded — transient infrastructure, not a code
   defect. If it recurs, self-host the three fonts (`next/font/local`) and the
   build stops depending on Google being reachable.
2. **No release PR existed.** Merging to `main` no longer prompts anything.

So: after merging to `main`, check that the staging build actually went green,
and open the `main` → `production` PR when the batch is ready. A quiet `main` is
not the same as a shipped `main`.

### History: the era when `main` was production

From project creation until 2026-08-16, `main` deployed straight to production —
the repo half of the two-stage model (`vercel.json`'s `ignoreCommand`, the
`ci.yml`/`e2e.yml` release gates) was written on 2026-07-30, but the Vercel
_Production Branch_ setting stayed on `main`, so the guard rails were documented
and then bypassed by a dashboard setting nobody flipped. That mismatch is what
let 51 unsmoked commits reach users on 2026-07-31. Kept here because that period
explains commits and releases dated before 2026-08-16.

> Full release process, checklist, and incident response: `.claude/agents/deployment-ops.md` and `.claude/agents/git-workflow.md`

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
