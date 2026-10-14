# AGENTS.md — ground rules for AI coding agents in Strummy

_2026-10-14_

Tool-agnostic guide (Cursor, Codex, Claude Code, …). Self-sufficient; `CLAUDE.md` and `.claude/rules/` hold the longer Claude-specific form and take precedence where they differ.

## 0. Read first

| File                    | Why                                                                    |
| ----------------------- | ---------------------------------------------------------------------- |
| `CONTEXT.md`            | Domain language — the terms in §1, with the reasoning behind each      |
| `docs/PRD.md`           | Product intent and scope                                               |
| `docs/ARCHITECTURE.md`  | System shape: layers, data flow, security boundary                     |
| `docs/DESIGN_SYSTEM.md` | Tokens, components, visual rules                                       |
| `docs/app-blueprint/`   | Per-domain detail (`00-overview.md` → `NN-<domain>.md`), roadmap, ADRs |

## 1. What this app is

Strummy is a student-management system for guitar teachers: profiles, lessons, songs, repertoire, assignments. Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + Supabase (Postgres, Auth, RLS). One bounded context, one repo, one branch (`main` = production on Vercel).

| Term                 | Meaning — use this, not that                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Profile**          | App-level user row (`profiles`); every authed user has exactly one. Not "User" (that is the Supabase `auth.users` row), not "Account".                                   |
| **Role**             | Exactly three: Admin, Teacher, Student. Boolean columns `is_admin / is_teacher / is_student`, surfaced as `roles.isAdmin…`. Not "permission", not "user type".           |
| **Flag**             | Non-Role boolean on Profile: `isParent`, `isDevelopment`. Modifies behaviour; never gates routes. Never treat as a Role.                                                 |
| **Teaches**          | Teacher teaches Student iff ≥1 non-deleted Lesson exists between them (`teacher_students` view). The only membership definition.                                         |
| **Visible Students** | Students a Profile may see (Admin → all, Teacher → taught, Student → self). From `StudentAccess.visibleStudentIds()`; RLS enforces it, queries do not.                   |
| **StudentAccess**    | `lib/access/StudentAccess.ts` — `visibleStudentIds()` and `canView(id)`. No `scope(query)`; RLS does that.                                                               |
| **Repertoire**       | Student × Song rows in `student_repertoire`, created by trigger on first Lesson use. Not "song list", not `lesson_songs`.                                                |
| **Progress Status**  | Enum `song_progress_status`: `to_learn → started → remembered → with_author → mastered`. Not "level"/"difficulty"; never duplicate as string literals.                   |
| **Song Progress**    | Two write paths only: via Lesson (`lesson_songs.status`, trigger advances forward-only) and direct override (`updateRepertoireEntryAction`, may regress). No third path. |
| **Progress History** | Append-only `song_status_history`, written by trigger only. App code reads, never writes.                                                                                |

## 2. Hard constraints — NEVER

- Work on `main`. Branch first: `feature/…`, `fix/…`, `chore/…`, `refactor/…` (no ticket prefix).
- Run bare `git stash` / `git stash pop` — the checkout and stash are shared with other sessions. Make a WIP commit instead.
- Assume port **54321** is local. On the `uwh` host **54321 = PRODUCTION**, **55321 = dev** (`StudentDevelopment`). Apply migrations and seeds to dev only.
- Change the schema ad hoc (psql, Studio, dashboard) without a committed file in `supabase/migrations/`.
- Hand-edit `database.types.ts` or any `types/database.types*` re-export. Run `npm run db:types`.
- Run `supabase stop` / `supabase start` on production without `docs/runbooks/supabase-stack-restart.md` — every restart silently breaks auth email links and templates.
- Use `any` (`unknown` if truly unknown). Never `@ts-ignore` to get green.
- Write inline style objects (`style={{…}}`, colour maps, Satori `style`). Everything goes in `className` with project tokens; arbitrary values (`text-[64px]`) for one-offs. Only exception: a value computed at runtime with no class equivalent (`width: \`${pct}%\``).
- Ship a bare support module (`helpers.ts`, `format.ts`, `primitives.tsx`) — see §4 naming.
- Add `v2`, `new`, `old`, `legacy`, `deprecated` as a lasting path segment. Finish the cutover or delete.
- Leave `foo.ts` beside `foo/` — the file shadows the directory's `index.ts` (`check:structure` C1 hard-fails).
- Mock anything in E2E tests. Use the dev stack and seeded role accounts.
- Add `Co-Authored-By: Claude …` (or any AI co-author) to a commit.
- Log tokens/secrets (mask: `token.slice(0, 6) + '…'`), put secrets in `NEXT_PUBLIC_*`, or commit credentials, tunnel hostnames or prod URLs — the repo is public.
- Write `student_repertoire.current_status` or `song_status_history` from API routes or crons (§1).

## 3. Workflow

1. `git branch --show-current && git status --short` — never start on `main`; create the branch **before** writing code.
2. Implement. Small PRs: ≤ 500 lines, one flow per PR.
3. Gates — all must pass, zero exceptions: `npm run lint && npm run typecheck && npm test`. Add `npm run test:integration` when touching services, `npm run check:structure` when adding/moving modules, `npm run db:types:check` after a migration.
4. Manual test report **before** committing non-trivial work: `docs/manual-tests/YYYY-MM-DD-<feature>.html` — self-contained HTML (inline CSS), what changed + exact steps/inputs/expected results; embed real screenshots as base64 when a browser was used. Skip only for typos/config one-liners.
5. Commit: `type(scope): description` (`feat`, `fix`, `chore`, `refactor`, `docs`, `test`).
6. PR body: 3–5 lines a user would understand — what works now, what did not before, any manual step (env var, migration). Screenshots for UI.
7. Squash-merge to `main` **is the production deploy**. No release branch, no tags. Verify on the live site after merge.

**Non-blocking CI**: push, open the PR, arm `gh pr merge --auto --squash <pr>`, start the next task. Only a red check interrupts you; fix on the branch and push again. Preview deployments exist only for branches with an open PR.

## 4. Code conventions

| Limit          | Value                            |
| -------------- | -------------------------------- |
| Component file | < 200 LOC                        |
| Hook file      | < 150 LOC                        |
| Any other file | < 150 LOC, single responsibility |
| Function body  | < 50 LOC                         |

**File naming under `components/`** — exactly five shapes (`components/ui/` is the shadcn registry and is exempt):

| Kind           | Shape                                 | Example                  |
| -------------- | ------------------------------------- | ------------------------ |
| Component      | `PascalCase.tsx`                      | `SongForm.tsx`           |
| Sub-component  | `Parent.Section.tsx`                  | `SongForm.Preview.tsx`   |
| Hook           | `useThing.ts` (+ `useThing.types.ts`) | `useSongPicker.ts`       |
| Support module | `kebab-subject.role.ts`               | `song-picker.helpers.ts` |
| Barrel         | `index.ts`                            |                          |

`role` is a closed vocabulary: **helpers · types · constants · styles · data · i18n · shared**. A new role requires editing `.claude/rules/code-style.md` and `C6_ROLES` in `scripts/ci/check-structure.sh` in the same commit. A module exporting several components is PascalCase named for the group (`LessonDetailPrimitives.tsx`).

- Directories: `kebab-case/` always. Tests: colocated beside the subject (`X.test.tsx`, `X.unit.test.ts`, `X.integration.test.ts`) — no `__tests__/` under `components/`.
- Identifiers: PascalCase components/types, camelCase functions/variables, `is/has/can` booleans, `use` hooks. Early returns, guard clauses, validate at boundaries.
- Validation: Zod schemas in `/schemas` (`<Thing>Schema.ts`); validate on blur, clear errors on typing.
- Supabase clients: `lib/supabase/server.ts` in Server Components / Actions / routes, `lib/supabase/client.ts` in client components, `lib/supabase/admin.ts` (service role) only in trusted server code. Never import server modules into client components.
- i18n: `next-intl` (`messages/en.json`, `messages/pl.json`). No hardcoded user-facing strings; dates/labels follow the viewer's locale.
- Styling: mobile-first Tailwind, always `dark:` variants, shadcn/ui from `components/ui/` — read the real source, never guess props.
- Logging: `@/lib/logger` facade only. API responses: never a field named `data` — use `items`, `user`, `lesson`, …
- One exported name, one definition in `lib/`. Deprecated code is deleted or mounted, never maintained.

## 5. Database rules

- Every change = a file in `supabase/migrations/YYYYMMDDHHMMSS_short_description.sql`, idempotent (`create table if not exists`, `add column if not exists`, `create or replace function`, `drop policy/trigger if exists` before `create`).
- RLS on every table. Helpers: `public.is_admin()`, `public.is_teacher()`, `public.current_profile_id()`, trigger `public.set_updated_at()` — pattern: `supabase/migrations/20260718090500_assignments.sql`.
- The DB is the security boundary (ADR-0001). Students write through `SECURITY DEFINER` RPCs, never direct table updates.
- After a migration: apply to **dev**, then `npm run db:types` and commit the regenerated `database.types.ts`; `npm run db:types:check` gates drift in CI.

| Stack                | Host (LAN)       | API port  | Postgres | Use                                                       |
| -------------------- | ---------------- | --------- | -------- | --------------------------------------------------------- |
| `StudentDevelopment` | `uwh`            | 55321     | 55322    | migrate, seed, RLS tests                                  |
| `StudentProduction`  | `uwh` (+ tunnel) | **54321** | 54322    | read-only unless explicitly asked; never unproven changes |

Apply on dev: `docker exec -i supabase_db_StudentDevelopment psql -U postgres -d postgres < <file>` (on `uwh`). The RLS harness refuses to run against prod. Remote sessions without LAN access push the branch and let the self-hosted runner (`e2e.yml`) do DB work.

## 6. Testing rules

Pyramid: **70 % unit (Jest) · 20 % integration (Jest) · 10 % E2E (Playwright)**. TDD: failing test → implement → refactor. Mock external APIs in unit/integration; never in E2E.

| Layer              | Command                    | Notes                                                                         |
| ------------------ | -------------------------- | ----------------------------------------------------------------------------- |
| Unit               | `npm test`                 | ~290 suites; colocated `*.test.ts(x)`                                         |
| Integration        | `npm run test:integration` | `jest.config.integration.ts`; helpers in `lib/testing/integration-helpers.ts` |
| Unit + integration | `npm run test:all`         |                                                                               |
| RLS                | `npm run test:rls`         | only suite hitting a real DB (dev stack)                                      |
| Core flows         | `npm run test:flows`       | `tests/flows`, Desktop Chrome — runs on every PR                              |
| Full E2E           | `npx playwright test`      | `tests/e2e/`; full matrix needs the `e2e` PR label                            |

**A change needs E2E only when it adds or alters a critical flow**: role sign-in/out; create/edit lesson, assignment, song, student; student completes assignment or logs practice; parent view; anything enforcing permissions (then test each role). Max **10 E2E tests per feature**; copy, layout, empty states, filters, formatting go to Jest. Seed data in `beforeAll` (admin client), clean up in `afterAll`. `tests/e2e/manual/` and `*.audit.ts` are opt-in.

## 7. Commands

```bash
npm run dev                 # dev server (nodemon + next dev)
npm run build               # production build
npm run lint                # ESLint
npm run typecheck           # tsc --noEmit (CI gates on this)
npm test                    # Jest unit
npm run test:integration    # Jest integration
npm run test:all            # unit + integration
npm run test:rls            # RLS suites against dev DB
npm run test:flows          # core Playwright flows
npx playwright test         # full E2E
npm run check:structure     # structural drift (C1 hard-fails); --strict in CI
npm run db:types            # regenerate database.types.ts from dev schema
npm run db:types:check      # fail if committed types are stale
npm run db:inspect          # inspect dev schema
npm run seed                # seed dev DB
```

## 8. Where things live

| Path                         | What                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| `app/`                       | App Router pages, API routes, Server Actions (one dir per route — exempt from "no single-file layers") |
| `components/<domain>/`       | UI by domain; `components/ui/` = shadcn registry                                                       |
| `hooks/`                     | Shared React hooks                                                                                     |
| `lib/access/`                | `StudentAccess` — the only visibility resolver                                                         |
| `lib/auth/`                  | API auth, cron auth, `loadAuthedProfile`                                                               |
| `lib/supabase/`              | `server.ts`, `client.ts`, `admin.ts`, `middleware.ts`                                                  |
| `lib/services/`              | Business logic and `*-queries.ts`                                                                      |
| `lib/ai/`                    | AI abstraction: OpenRouter / OpenAI / Ollama / mock providers                                          |
| `lib/logger`                 | Logging facade (ADR-0003)                                                                              |
| `lib/testing/`               | Jest helpers, RLS harness                                                                              |
| `schemas/`                   | Zod schemas                                                                                            |
| `types/`                     | TS types; `types/database.types.ts` re-exports root `database.types.ts`                                |
| `supabase/migrations/`       | The schema's source of truth                                                                           |
| `messages/`, `i18n/`         | next-intl messages and config                                                                          |
| `proxy.ts`                   | Next.js 16 request proxy (the former `middleware.ts`)                                                  |
| `tests/flows/`, `tests/e2e/` | Playwright                                                                                             |
| `scripts/ci/`                | `check-structure.sh`, `.structure-baseline`, pre-commit                                                |
| `docs/manual-tests/`         | Per-change HTML test reports                                                                           |
| `docs/runbooks/`             | Ops runbooks (Supabase restart, cutovers, CI cost)                                                     |
| `docs/app-blueprint/`        | Domain docs, `90-roadmap.md`, `adr/`, `reference/`                                                     |

## 9. When unsure

- Ops question → `docs/runbooks/` first, then `docs/remote-dev-db-access.md`.
- Domain or feature question → `docs/app-blueprint/<NN-domain>.md`; settled decisions → `docs/app-blueprint/adr/`.
- Structural rule and the incident behind it → `.claude/rules/structure.md`; naming → `.claude/rules/code-style.md`.
- Next.js API → `node_modules/next/dist/docs/` (see block below), not memory.
- Precedence: **if a rule here conflicts with the code, the rule wins — fix the code. If a rule here conflicts with `CLAUDE.md` or `.claude/rules/`, `CLAUDE.md` wins — then fix this file.**

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
