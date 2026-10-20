---
created: 2026-10-14
updated: 2026-10-14
---

# Strummy — Architecture

Living architecture reference, verified against the tree on 2026-10-14. Domain
language lives in `CONTEXT.md`; the plan lives in `docs/app-blueprint/`.
Where an older doc disagrees with this one, the code wins and this doc follows it.

## 1. System at a glance

```
 Browser (React 19, TanStack Query, supabase-js, PostHog)
   │  HTTPS                                   ▲ realtime ws / storage / REST go
   ▼                                          │ straight to Supabase (CSP allows it)
 Vercel ── Next.js 16 App Router, Node runtime (Fluid)
   ├─ proxy.ts        auth gate for /dashboard, CSP + security headers, locale cookie
   ├─ RSC pages       app/dashboard/**  (read via server client)
   ├─ Server Actions  app/actions/*     (writes; 'use server')
   ├─ Route Handlers  app/api/**        (124 route.ts; withApiAuth / withAuth)
   └─ Cron            /api/cron/dispatcher  06:00 UTC daily (vercel.json)
   │  @supabase/ssr (cookie session)         service-role (admin client, server only)
   ▼
 Supabase, self-hosted on uwh (Ubuntu HP EliteDesk, LAN 192.168.1.75)
   ├─ StudentProduction  Kong :54321 / Postgres :54322  ← Cloudflare tunnel from Vercel
   └─ StrummyDevelopment Kong :55321 / Postgres :55322  ← LAN only (dev, RLS tests, CI runner)
      Postgres + RLS · GoTrue auth · Storage · Realtime · SECURITY DEFINER RPCs

 External: OpenRouter / OpenAI / Ollama (lib/ai) · Resend SMTP or Gmail SMTP (lib/email)
           Google Calendar + Drive (googleapis) · Spotify Web API · Cal.com webhook
           Sentry (errors, replay, cron monitor) · PostHog (via /ingest rewrite) · Uptime Kuma → /api/health/live
```

## 2. Tech stack

| Layer            | Choice                                                      | Version (package.json)                               | Configured in                                                                    |
| ---------------- | ----------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| Framework        | Next.js App Router, React                                   | `next ^16.4.0`, `react 19.2.8`                       | `next.config.ts`                                                                 |
| Styling          | Tailwind CSS, shadcn/ui on Radix, Framer Motion             | `tailwindcss ^4`, `framer-motion ^12`                | `app/globals.css`, `app/design-tokens.css`, `components/ui/`                     |
| Client state     | TanStack Query (server state), React Context (UI)           | `@tanstack/react-query ^5.102`                       | `lib/query-client.ts` (staleTime 5 min, retry 1)                                 |
| Forms/validation | react-hook-form + Zod                                       | `zod ^4.5`, `react-hook-form ^7.89`                  | `schemas/*Schema.ts`                                                             |
| Backend          | Supabase (Postgres, RLS, GoTrue, Storage, Realtime)         | `@supabase/supabase-js ^2.116`, `@supabase/ssr ^0.8` | `lib/supabase/`, `supabase/migrations/`                                          |
| i18n             | next-intl, locales `en` / `pl`                              | `next-intl ^4.14`                                    | `i18n/request.ts`, `i18n/locales.ts`, `messages/{en,pl}.json` (2 450 lines each) |
| AI               | Provider abstraction + Vercel AI SDK adapter                | `ai ^7.0`, `@ai-sdk/openai-compatible ^3`            | `lib/ai/provider-factory.ts`                                                     |
| Email            | nodemailer over SMTP                                        | `nodemailer ^10`                                     | `lib/email/smtp-client.ts`                                                       |
| Logging          | Pino behind a stable facade (ADR-0003)                      | `pino ^10`                                           | `lib/logger/`                                                                    |
| Errors           | Sentry                                                      | `@sentry/nextjs ^10.73`                              | `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts`  |
| Analytics        | PostHog                                                     | `posthog-js ^1.406`                                  | `components/providers/PostHog*.tsx`, `/ingest` rewrite                           |
| Google           | googleapis (Calendar, Drive)                                | `googleapis ^178`                                    | `lib/google.ts`, `lib/services/google-*.ts`                                      |
| Testing          | Jest, Testing Library, Playwright, axe                      | `jest ^30`, `@playwright/test ^1.58`                 | `jest.config{,.integration,.rls}.ts`, `playwright*.config.ts`                    |
| Tooling          | ESLint, Prettier, husky + lint-staged, knip, Bruno          | `eslint ^10`, `typescript ^5`                        | `package.json` scripts                                                           |
| Hosting          | Vercel (Node/Fluid; no `runtime = 'edge'` exports anywhere) | —                                                    | `vercel.json`                                                                    |

## 3. Runtime topology & environments

| Environment | Trigger                        | App URL                                | Database                                                |
| ----------- | ------------------------------ | -------------------------------------- | ------------------------------------------------------- |
| dev         | `npm run dev` on the Mac       | `http://localhost:3000`                | `StrummyDevelopment` via `NEXT_PUBLIC_SUPABASE_LOCAL_*` |
| preview     | any branch with an **open PR** | per-deployment Vercel URL              | whatever the Vercel env provides (prod stack)           |
| production  | merge to `main`                | `strummy.online`, `strummy.vercel.app` | `StudentProduction` through the Cloudflare tunnel       |

- **One branch, one target** since 2026-10-11 (`docs/analysis/2026-10-11-development-process-audit.md`): `main` deploys to production; no `production` branch, release train or tags. `vercel.json`'s `ignoreCommand` only builds `main`, `production` and PR branches; `release-train.yml` and the `release` job in `ci.yml` (still keyed on `refs/heads/production`) are dormant.
- **Supabase env groups** (`lib/supabase/config.ts`): `NEXT_PUBLIC_SUPABASE_LOCAL_URL/_ANON_KEY` + `SUPABASE_LOCAL_SERVICE_ROLE_KEY` win when both URL and key are set; otherwise `NEXT_PUBLIC_SUPABASE_REMOTE_*` / `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. `next.config.ts` TCP-probes the local URL at `next dev` start and unsets the local vars if unreachable. The `sb-provider-preference=remote` cookie forces remote per request (`lib/supabase/provider-preference.ts`).
- **Required env** (`lib/env.ts`, checked in `instrumentation.ts` `register()`): `NEXT_PUBLIC_SENTRY_DSN` always; `CRON_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD` in production. `STUDENT_EMAILS_ENABLED=true` opts students into email; otherwise their notifications stay in-app.
- **Crons run on production deployments only.** `vercel.json` defines one cron (Hobby limit): `/api/cron/dispatcher` at `0 6 * * *`, guarded by `verifyCronSecret` (`Authorization: Bearer $CRON_SECRET`).
- `NEXT_PUBLIC_*` is inlined at build time — changing one needs a redeploy.

## 4. Request & data flow

```
request ─► proxy.ts (matcher: "/" and "/fretboard" only — see §11)
             ├─ supabase.auth.getUser()         ├─ /dashboard/* without user → /sign-in?redirect=
             ├─ profiles.is_active/is_admin     ├─ deactivated → sign-out; /dashboard/admin w/o is_admin → /dashboard
             ├─ x-user-id / x-user-roles headers└─ CSP, X-Frame-Options, Referrer-Policy, NEXT_LOCALE cookie
        ─► RSC page / Server Action / Route Handler
             ├─ getUserWithRolesSSR()  → lib/auth/loadAuthedProfile (React.cache, admin client) → { user, profileId, isAdmin… }
             ├─ withApiAuth(request, handler, { requiredRole }) for app/api (routes are OUTSIDE the proxy matcher)
             ├─ studentAccess(authed).visibleStudentIds() / canView()  — UI + pre-write 403s, not security
             └─ Zod schema from schemas/ at the boundary
        ─► Supabase client
             ├─ lib/supabase/server.ts  createClient()      cookie session, RLS applies   (RSC, actions, routes)
             ├─ lib/supabase/client.ts  createClient()      browser, RLS applies          (hooks, realtime)
             └─ lib/supabase/admin.ts   createAdminClient() service role, bypasses RLS    (cron, auth loader, webhooks)
        ─► Postgres: RLS policies → tables, or SECURITY DEFINER RPC for student writes
```

**Write — student completes an assignment** (`app/actions/assignment-status.ts`):

1. Client component calls `updateAssignmentStatusAction(assignmentId, 'completed')`.
2. Action loads roles via `getUserWithRolesSSR()`; `guardTestAccountMutation` blocks `is_development` accounts unless `DEMO_WRITES_ENABLED`.
3. Reads the assignment with the cookie-bound server client (RLS limits what is visible).
4. Validates ownership and the transition (`validateStatusTransition`) — UX checks, per ADR-0001.
5. Owning student → `supabase.rpc('student_update_assignment_status', …)` (`SECURITY DEFINER`, `supabase/migrations/20260719000001_assignment_student_status_rpc.sql`); teacher/admin → direct `assignments.update` under RLS.
6. On completion, `notifyTeacherOfCompletion` enqueues an in-app notification; `revalidatePath('/dashboard/assignments…')` invalidates the RSC cache.

**Read — lessons list** (`app/dashboard/lessons/page.tsx`): RSC calls `getUserWithRolesSSR()` → query helpers in `lib/services/lessons-queries.ts` with the server client → RLS returns only the viewer's rows → props into `components/lessons/LessonsList`. Client-side refetches go through TanStack Query hooks (`hooks/`, `components/**/use*.ts`) against `app/api/**` route handlers.

**Locale**: `proxy.ts` resolves `?lang=` > `profiles.locale` > `NEXT_LOCALE` cookie > `Accept-Language` and writes the cookie; `i18n/request.ts` reads the cookie (header fallback) and loads `messages/<locale>.json`.

## 5. Code layout & layering

```
app/          routes (App Router), app/actions (Server Actions), app/api (route handlers), app/dashboard/**
components/   by domain (admin ai assignments auth … songs users) + ui/ (shadcn registry) + providers/
hooks/        cross-cutting client hooks (useAIStream, useDatabaseStatus, useDashboardStats, useIsWidescreen)
lib/          server + shared logic (sub-areas below)
schemas/      Zod schemas, one `XSchema.ts` per entity, barrel `index.ts`
types/        domain TS types; `types/database.types.ts` is a 15-line re-export of root `database.types.ts`
i18n/ messages/   next-intl config and en/pl catalogues
supabase/     migrations/ (71 files + rollback/), config
tests/        flows/ (F01–F11 core flows), e2e/ (per-domain Playwright), fixtures/, helpers/, sql/
scripts/      ci/ database/ e2e-remote/ setup/ testing/ verify/ — invoked only via `npm run <thing>`
```

**Import direction** (enforced by review and `npm run check:structure`): `app → components → hooks → lib → schemas/types`. `lib/` never imports from `app/` or `components/`. Server-only modules declare `import 'server-only'` (`lib/access`, `lib/auth/loadAuthedProfile`). `lib/supabase/server.ts` and `client.ts` are the load-bearing client/server boundary (ADR-0001 context; `structure.md` S1/S3).

| `lib/` area                                                          | Purpose                                                                                                                                                       |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/`                                                          | `config` (env selection), `server`, `client`, `admin`, `provider-preference`, `index` (lazy browser singleton)                                                |
| `auth/`                                                              | `api-auth` (`authenticateRequest`), `withApiAuth`, `with-auth`, `loadAuthedProfile`, `cron-auth`, rate limiter, lockout, disposable-email, test-account guard |
| `access/`                                                            | `StudentAccess` — `visibleStudentIds()` / `canView()` over the `teacher_students` view                                                                        |
| `services/`                                                          | business logic and `*-queries.ts` per domain (lessons, assignments, calendar sync, notifications, Spotify, Drive…)                                            |
| `ai/`                                                                | provider factory, `providers/` (openrouter, openai, ollama, mock, vercel-ai-adapter), `agents/`, `registry/`, rate limiter, queue, streaming analytics        |
| `email/`                                                             | SMTP client, `templates/` (23 transactional templates), `recipient.ts` (`getDeliverableEmail`, ADR-0002), bounce/retry                                        |
| `notifications/`                                                     | reminder windows, unsubscribe tokens, notification logger                                                                                                     |
| `health/`                                                            | service checkers, `cron-registry`, Sentry cron check-ins                                                                                                      |
| `logger/`                                                            | facade (`logger`, `createLogger`), Pino/console backends, edge logger, request context, redaction                                                             |
| `observability/`                                                     | `home-ops-log.mjs` — events to the home-ops console                                                                                                           |
| `database/`, `api/`                                                  | legacy dual-DB routing (`/api/database/status`) and the external REST layer (`/api/external/*`) — few importers                                               |
| `testing/`                                                           | Jest helpers, mocks, `rls/env.ts` (prod-URL hard refusal)                                                                                                     |
| `google.ts`, `spotify*.ts`, `storage/`, `music-theory/`, `calendar/` | integration clients and pure helpers                                                                                                                          |

**Generated types (S4)**: root `database.types.ts` (5 274 lines) is the only schema type source — `npm run db:types` regenerates from the dev stack, `npm run db:types:check` fails CI (`types-drift` job) when stale. Never hand-edit it or add a second copy.
**Naming**: one convention under `components/` (`PascalCase.tsx`, `Parent.Section.tsx`, `useThing.ts`, `kebab-subject.role.ts`, `index.ts`), enforced by `C6` — see `.claude/rules/code-style.md`.

## 6. Database & security boundary

- **RLS is the boundary** (ADR-0001). Every table ships with RLS from its first migration; app-side filters are UX, never enforcement, and reviewers must not add them back.
- **Identity**: `auth.users.id` ≠ `profiles.id` since the July 2026 rebuild. All domain FKs hold **profile ids**; `loadAuthedProfile` exposes `profileId` for exactly this reason. Match on `profiles.user_id` when starting from an auth id.
- **Roles** are booleans on `profiles` (`is_admin`, `is_teacher`, `is_student`); `is_parent`, `is_development` are Flags, not Roles (`CONTEXT.md`). SQL helpers: `public.is_admin()`, `public.is_teacher()`, `public.is_student()`, `public.current_profile_id()` (`20260728110000_role_helpers_user_id_unfiled.sql`).
- **Teaches** is derived: `teacher_students` view = teacher/student pairs with ≥1 non-deleted lesson. `StudentAccess` reads it; RLS policies use the same definition.
- **Student writes go through `SECURITY DEFINER` RPCs** — `student_update_assignment_status`, `student_complete_chord_drill` — never direct `UPDATE`s. Progress history is trigger-owned (`fn_sync_lesson_song_to_repertoire`, `AFTER UPDATE OF current_status`).
- **Migrations**: `supabase/migrations/YYYYMMDDHHMMSS_short_description.sql`, idempotent DDL (`create table if not exists`, `create or replace function`, `drop policy if exists` before `create`), `public.set_updated_at()` trigger convention. Baseline `00000000000000_baseline.sql`; latest `20261011171500_track_lesson_changes_enum_case.sql`. Apply to dev with `docker exec -i supabase_db_StrummyDevelopment psql … < file` on `uwh`; the file is still committed.
- **Gates**: `types-drift` (every PR), `migrations-replay` and `db-parity` (self-hosted) in `e2e.yml`; `npm run test:rls` seeds and deletes users, so `lib/testing/rls/env.ts` throws on any production-shaped URL.

## 7. Integrations

| Integration     | Entry point                                                                                            | Notes                                                                                                                                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI              | `lib/ai/provider-factory.ts` — `AI_PROVIDER` ∈ `auto \| openrouter \| openai \| ollama \| mock`        | `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `OLLAMA_BASE_URL` (default `http://localhost:11434`); agents in `lib/ai/agents/`; role-based per-minute limits in `lib/ai/rate-limiter.ts`; SSE streaming via `hooks/useAIStream.ts`                                                        |
| Email           | `lib/email/smtp-client.ts`                                                                             | `SMTP_HOST` override (E2E → Supabase Inbucket) > `RESEND_API_KEY` (prod) > `GMAIL_USER`/`GMAIL_APP_PASSWORD`. App templates: `lib/email/templates/`. **Auth** templates (confirm, invite, email-change) are served from `public/email/*.html` because GoTrue fetches them over HTTP |
| GoTrue mailer   | `docs/runbooks/supabase-stack-restart.md`                                                              | `supabase stop/start` resets `GOTRUE_MAILER_URLPATHS_*`/`TEMPLATES_*` → dead links / "Error sending confirmation email". Repair with `~/ops/restore-gotrue-mail-urls.py prod`                                                                                                       |
| Google Calendar | `lib/google.ts`, `lib/services/calendar-*.ts`, `/api/webhooks/google-calendar`, `/api/oauth2/callback` | Shipped, dormant (1 connected user). Attendee resolution per ADR-0002                                                                                                                                                                                                               |
| Google Drive    | `lib/services/google-drive*.ts`, `/api/drive/**`                                                       | Song/lesson videos; daily `drive-video-scan`                                                                                                                                                                                                                                        |
| Spotify         | `lib/spotify.ts`, `/api/spotify/**`                                                                    | OAuth (`SPOTIFY_CLIENT_ID/_SECRET`), track enrichment, admin match review                                                                                                                                                                                                           |
| Cal.com         | `/api/webhooks/calcom`, `lib/services/calcom*.ts`                                                      | Trial-lesson intake → teacher lead                                                                                                                                                                                                                                                  |
| External REST   | `/api/external/songs`, `/api/external/database/status`                                                 | bearer `api_keys`; `lib/api/unified-db.ts`                                                                                                                                                                                                                                          |

**Cron jobs** (all inside the single dispatcher, `lib/health/cron-registry.ts`): daily-report, lesson-reminders, assignment-due-reminders, assignment-overdue-check, drive-video-scan, sync-calendars-and-update-status, renew-webhooks, cleanup-auth-events, prune-system-logs, admin-monitoring; weekly-digest and weekly-insights on their weekday; `process-notification-queue` runs last so the day's enqueues ship in the same run. `maxDuration = 60`.

## 8. Observability

- **Sentry** (`org bmr-p0`, project `guitar-crm`): server/edge/client inits, 10 % traces, replay on error, `vercelAIIntegration` with inputs/outputs off, `tunnelRoute: '/monitoring'`, `onRequestError` in `instrumentation.ts`, cron monitor `cron-dispatcher` check-ins (`lib/health/cron-monitor.ts`).
- **Logger facade** (ADR-0003): `logger` / `createLogger('ns')` from `@/lib/logger`; Pino JSON in prod, pino-pretty in dev, console shim on edge/browser; redacts token/password/cookie keys; `error` → `captureException`, info/warn → breadcrumbs; `runWithRequestContext` (AsyncLocalStorage) adds `requestId`/`userId`/`role`, wired by `withApiAuth`. `console.*` in production code is a hard CI failure (`C14`).
- **Health**: `GET /api/health` (admin; 8 external checkers + cron registry), `GET /api/health/live` (unauthenticated; 200 = app + DB, 503 = DB down; polled by Uptime Kuma on the Pi). Dashboard at `/dashboard/health`.
- **Analytics**: PostHog through `/ingest` rewrites (`next.config.ts`); AI streaming analytics in `lib/ai/streaming-analytics.ts`. No `@vercel/analytics` package.
- **home-ops**: `lib/observability/home-ops-log.mjs` emits `app:strummy` events to the home-ops console.

## 9. Testing architecture

| Layer         | Command                            | Config                                                       | Scope                                                                                    |
| ------------- | ---------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Unit          | `npm test` / `npm run test:ci`     | `jest.config.ts`                                             | colocated `*.test.ts(x)`, Supabase mocks in `lib/testing/__mocks__`, coverage thresholds |
| Integration   | `npm run test:integration`         | `jest.config.integration.ts`                                 | `lib/testing/integration-helpers.ts`                                                     |
| RLS (real DB) | `npm run test:rls`                 | `jest.config.rls.ts`                                         | only suite touching a database — dev stack via `RLS_TEST_*`; hard-refuses prod           |
| Core flows    | `npm run test:flows`               | `playwright.config.ts`                                       | `tests/flows/f01–f11`, Desktop Chrome, dev stack, never mocked                           |
| E2E matrix    | `npx playwright test`              | `playwright.config.ts` (+ prod/remote/visual/video variants) | `tests/e2e/<domain>/`, ≤10 per feature, device projects 320–1920 px                      |
| Structure     | `npm run check:structure[:strict]` | `scripts/ci/check-structure.sh`                              | C1–C19, baseline ratchet in `scripts/ci/.structure-baseline`                             |

**CI** (`.github/workflows/`):

| Workflow                               | Trigger                                   | Jobs                                                                                                                                                                                                        |
| -------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`                               | push/PR to `main`, `production`           | `quality-gates` (lint + tsc, `check:structure:strict`, `test:ci`, `test:integration`, build), `gitleaks`; `knip`, `lighthouse-ci` need label `extended-ci`; `release` only on `production` pushes (dormant) |
| `e2e.yml`                              | PR, push to `main`/`production`, dispatch | self-hosted on `uwh`: `flows` (every PR), `rls`, `types-drift`, `db-parity`, `migrations-replay`, `bruno`; full `e2e` needs label `e2e` or a risky path                                                     |
| `auto-merge.yml`                       | PR opened                                 | arms `gh pr merge --auto --squash`                                                                                                                                                                          |
| `nightly-e2e.yml`, `release-train.yml` | dispatch only                             | not part of the merge path                                                                                                                                                                                  |

A merge to `main` needs the required checks green (ci `quality-gates`, e2e `flows`/`rls`/`types-drift`); merging **is** the production deploy.

## 10. Decisions (ADR index)

| ADR  | Date       | Decision                                                                                                                                                                                         |
| ---- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0001 | 2026-05-09 | RLS is the single authorization boundary; app-side filters are UX only and get deleted, not duplicated                                                                                           |
| 0002 | 2026-05-17 | Shadow students are first-class: visible "Unclaimed" state, invite flow, one email-resolution chokepoint (`getDeliverableEmail`), unique `invite_email` index, lifecycle logged to `auth_events` |
| 0003 | 2026-05-17 | One logger facade (`logger`, `createLogger`) with a Pino backend; redaction, request context and Sentry tying live in the facade; parallel loggers deleted                                       |

Files: `docs/app-blueprint/adr/`.

## 11. Known constraints & gaps

- `proxy.ts` matcher effectively matches only `/` and `/fretboard` (unescaped `.*..*`); dashboard auth gating, CSP and locale cookies do not run on other routes — the comment in `proxy.ts` explains the fix and why it needs its own PR.
- `app/api/**` sits outside the proxy; every handler must wrap itself in `withApiAuth` / `withAuth` (`C15`, `C16` report on missing try/catch and Zod).
- Some app-side ownership checks compare `user.id` (auth id) with profile-id columns, e.g. `app/actions/assignment-status.ts` (`assignment.student_id === user.id`) — harmless for security (RLS/RPC decide) but yields wrong UX errors post-rebuild.
- Rate limiters (`lib/auth/rate-limiter.ts`, `lib/ai/rate-limiter.ts`) are in-memory `Map`s — per-instance under Fluid compute.
- Single daily cron (Vercel Hobby); reminder windows must stay aligned with `DISPATCHER_CADENCE_HOURS` in `lib/notifications/reminder-window.ts`.
- `lib/database/` and `lib/api/` (dual-DB routing, external REST) have a handful of importers; see `structure.md` S2 before extending them.
- Remote (cloud) sessions cannot reach `uwh`; see `docs/remote-dev-db-access.md` for the dev tunnel and `.claude/rules/workflow.md` for the fallback.
- Local git hooks and the release train are documented in several older places; the only live merge path is §9.

## 12. References

- `CONTEXT.md` — domain language · `CLAUDE.md` — commands, stacks, deployment · `.claude/rules/structure.md`, `code-style.md`, `workflow.md`, `playwright-testing.md`
- `docs/app-blueprint/` — plan, domain docs, `adr/` · `docs/analysis/2026-10-11-development-process-audit.md` — one-branch decision
- `docs/runbooks/supabase-stack-restart.md` · `docs/remote-dev-db-access.md` · `tests/flows/README.md` · `lib/auth/README.md` · `lib/notifications/README.md` · `schemas/README.md`
