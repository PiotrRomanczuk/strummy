---
created: 2026-07-18
updated: 2026-07-29
domain: Admin & Observability
tables:
  [
    audit_log,
    audit_log_2026_01,
    audit_log_2026_02,
    audit_log_2026_03,
    audit_log_2026_04,
    audit_log_2026_05,
    audit_log_2026_06,
    audit_log_2026_07,
    audit_log_2026_08,
    audit_log_2026_09,
    audit_log_2026_10,
    audit_log_2026_11,
    audit_log_2026_12,
    audit_log_default,
    system_logs,
  ]
maturity: mixed
---

# Admin & Observability

## Purpose

Everything the operator (owner-admin) uses to watch and run the system: the persisted log stream,
the (legacy) unified audit log, the cron job fleet, and the admin route surface. This doc is
deliberately a **disposition map** — most of this domain is scaffolding around a solo-operated
production stack, not product.

## Data model — disposition table

| Table                                       | Disposition                 | Detail / action                                                                                                                                                                                                                                                      |
| ------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `audit_log` (parent, partitioned by month)  | **dormant / legacy**        | Restored 2026-06-19 as legacy design. The `tr_audit_{lessons,assignments,profiles,song_progress}` trigger **functions** exist (jsonb old/new diffs via `jsonb_diff`), but **no trigger attaches them** in the baseline — nothing writes here. Keep; do not build on. |
| `audit_log_2026_01` … `audit_log_2026_12`   | **dormant** (12 partitions) | Monthly range partitions of the above; empty by construction.                                                                                                                                                                                                        |
| `audit_log_default`                         | **dormant**                 | Catch-all partition.                                                                                                                                                                                                                                                 |
| _(post-baseline drift)_ `audit_log_2027_01` | **dormant**                 | Auto-created on StrummyProd by the post-baseline `ensure_audit_partitions()` function. Not in the baseline file; expect it when diffing.                                                                                                                             |
| `system_logs`                               | **live**                    | Persisted warn/error stream (ADR 0003 Phase 2.5): level, prefix, message, request/user ids, context/error jsonb. Written by `lib/logger/supabase-destination.ts`; read by `app/api/admin/logs`.                                                                      |

**Superseded-by**: live audit actually flows to the per-domain `*_history` tables —
`lesson_history`, `assignment_history`, `user_history`, `song_status_history` — documented in
their own domain docs (02, 06, 01, 03). Reference those; don't duplicate here.

**Audit functions** (retained, currently unwired): `jsonb_diff(left, right)` returns the keys of
`left` whose values differ from `right` (used to store minimal old/new change sets);
`tr_audit_*` classify the action (`created/updated/deleted/status_changed/rescheduled/cancelled/
completed/role_changed`) and insert into `audit_log` with `auth.uid()` as actor.

**Known live drift vs baseline** (StrummyProd, out-of-band): functions
`ensure_audit_partitions()` and `refresh_song_matviews()` exist post-baseline; partition
`audit_log_2027_01` auto-created. Recorded in 00-overview §Schema truth.

## Required environment

`.env.example` is gitignored in this repo, so the observability env contract lives here.

| Variable                                | Where             | Effect if unset                                                                                                                                                                                          |
| --------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SENTRY_DSN`                | Vercel, runtime   | **Sentry initialises as a silent no-op.** Every `logger.error` → `captureException`, every error boundary, and the Vercel cron monitors report nowhere. `lib/env.ts` warns, but only into `system_logs`. |
| `SENTRY_AUTH_TOKEN`                     | Vercel, **build** | Source maps are not uploaded → production stack traces are minified and near-useless. Scope `project:releases`.                                                                                          |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | optional          | Browser tracing defaults to 0.1. Raise to 1 temporarily while chasing a regression.                                                                                                                      |
| `SENTRY_TRACES_SAMPLE_RATE`             | optional          | Same, for server + edge runtimes.                                                                                                                                                                        |
| `LOG_LEVEL`                             | optional          | `debug` in development, `info` in production.                                                                                                                                                            |
| `SYSTEM_LOGS_PERSIST`                   | optional          | Set to `off` to stop teeing warn/error into `system_logs`. Any other value, or unset, = on. Production only; dev never persists.                                                                         |
| `INGEST_URL` / `INGEST_TOKEN`           | optional          | `lib/observability/home-ops-log.mjs` emits are a silent no-op (currently the case in prod).                                                                                                              |

DSN and auth token both come from sentry.io → org `bmr-p0` → project `guitar-crm`.
`NEXT_PUBLIC_*` values are inlined at build time — **a redeploy is required** after adding
them; setting the var against an existing deployment does nothing.

**Audited 2026-07-29**: `NEXT_PUBLIC_SENTRY_DSN` was absent from Vercel entirely, so all
error tracking had been inert. If Sentry ever looks quiet again, check this first.

## Behavior & rules

- **Logging** — unified pino logger (ADR 0003); warn/error entries are tee'd to `system_logs`
  via `lib/logger/supabase-destination.ts`. Admin read API: `app/api/admin/logs/route.ts`
  (no UI consumer yet — see ADM-1).
- **`logger.error` accepts a context wrapper** — `log.error(msg, { error, ...ctx })` is
  unwrapped by `lib/logger/normalize-error.ts` (ADR 0003 amendment 2026-07-29). Before that,
  the 90 call sites using this shape persisted as `message: '[object Object]'`. Passing a real
  `Error` is still preferred — only that shape carries a stack into Sentry as an exception.
- **Legacy audit read** — `getAuditLogs()` in `app/dashboard/actions.ts` selects the latest
  `audit_log` rows (admin-only). Since nothing writes the table, it returns `[]`; treat as dead
  code tied to the legacy design.
- **Cron auth** — every `/api/cron/*` route validates `verifyCronSecret` (`lib/auth/cron-auth`).
- **Cron graceful degrade** — cron routes return 200 with an error payload rather than 500
  (no paging on known-degraded states); missing-table conditions are detected via
  `isMissingTableError` (`lib/services/db-error-helpers.ts`) and skipped.
- **Dispatcher pattern** — Vercel Hobby allows one cron, so `vercel.json` schedules **only**
  `/api/cron/dispatcher` (daily 06:00 UTC) and it invokes every other job in-process
  (day-of-week gating for weekly jobs). Individual routes remain directly callable. There are
  no direct per-route crons and no GitHub Actions triggers — every job's real cadence is the
  dispatcher's.
- **Registry must match the dispatcher** — `lib/health/cron-registry.ts` feeds the debug
  dashboard. It carried per-route schedules that stopped being true when `3d2f1c25` collapsed
  the fleet, so the dashboard advertised a 15-minute notification queue that ran daily.
  Entries now carry a `trigger` (`vercel-cron` / `via-dispatcher` / `manual`) and the
  dispatcher's effective schedule. Keep it in sync with `buildDailyJobs` / `buildWeeklyJobs`.

### Cron job catalog (15 routes in `app/api/cron/`)

All run via the dispatcher at daily 06:00 UTC unless noted.

| Job                          | Trigger                | Does                                                                      |
| ---------------------------- | ---------------------- | ------------------------------------------------------------------------- |
| `dispatcher`                 | **vercel cron**, 06:00 | Runs all jobs below in-process; weekly jobs gated by day-of-week          |
| `daily-report`               | via dispatcher         | Admin song report email (`sendAdminSongReport`)                           |
| `drive-video-scan`           | via dispatcher         | Scan Drive for new videos → `song_videos` + admin notify (doc 09)         |
| `lesson-reminders`           | via dispatcher         | Enqueue `lesson_reminder_24h` notifications (doc 02/07)                   |
| `assignment-due-reminders`   | via dispatcher         | Enqueue `assignment_due_reminder` (doc 06/07)                             |
| `assignment-overdue-check`   | via dispatcher         | Flag overdue assignments + `assignment_overdue_alert` (doc 06/07)         |
| `calendar-sync`              | via dispatcher         | Poll all teachers' Google Calendars (`syncAllTeacherCalendars`) (doc 02)  |
| `update-student-status`      | via dispatcher         | Recompute student activity/pipeline status (doc 01)                       |
| `renew-webhooks`             | via dispatcher         | Renew/cleanup expiring Google Calendar webhooks (doc 02)                  |
| `process-notification-queue` | via dispatcher         | Drain `notification_queue` + retry failed (doc 07)                        |
| `cleanup-auth-events`        | via dispatcher         | GDPR: delete `auth_events` (emails + IPs) older than 90d (doc 01)         |
| `prune-system-logs`          | via dispatcher         | Retention for `system_logs`: warn 30d, error 90d                          |
| `admin-monitoring`           | via dispatcher         | Notification failure/bounce/backlog checks + daily admin summary (doc 07) |
| `weekly-digest`              | via dispatcher, Sun    | Weekly progress digest emails (opt-in; doc 07)                            |
| `weekly-insights`            | via dispatcher, Mon    | Weekly insight emails to teachers                                         |

## UI surfaces

Analytics/logs nav ids (`logs`, `song-stats`, `lesson-stats`, `chord-analysis`, `cohorts`) are in
`CORE_LOOP_HIDDEN_ITEMS` → nav-hidden; but every admin page below currently renders a
**"Coming soon" placeholder**, so the honest status is unbuilt-behind-a-route:

| Route                                                               | Status                                                                                                                                                                           |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/dashboard/admin/debug`                                            | placeholder — real panels exist in `components/debug/*` (AIGenerationsPanel, AIProviderPanel, AIQueuePanel, CronStatusPanel, DatabaseStatus, ServicesGrid) → **built-unmounted** |
| `/dashboard/logs`                                                   | placeholder — `system_logs` viewer **unbuilt** (API exists)                                                                                                                      |
| `/dashboard/admin/stats/{lessons,songs,chord-analysis}`             | placeholders — **unbuilt**                                                                                                                                                       |
| `/dashboard/admin/{spotify-connect,spotify-import,spotify-matches}` | placeholders — Spotify admin UIs **unbuilt** (doc 03 owns the pipeline)                                                                                                          |
| `/dashboard/admin/{notifications,drive-videos,documentation}`       | placeholders — **unbuilt** (docs 07 / 09 own the backends)                                                                                                                       |
| Admin home cards                                                    | `/dashboard` admin view (platform metrics, pending invites, role switcher) — **mounted** (doc 01)                                                                                |

## Gaps & planned work

_Shipped 2026-07-19: ADM-1 (`system_logs` viewer at `/dashboard/logs`) · ADM-2 (legacy `audit_log` read dropped) · ADM-3 (debug dashboard mounted)._

## Test plan

- **E2E**: admin surface smoke lives under `tests/e2e/smoke/` + §A2 of `reference/E2E_JOURNEYS.md`
  (admin dashboard cards). Cron routes are backend journeys → Jest integration layer with
  `verifyCronSecret` fixtures, not Playwright.
- **Unit**: logger destination (`lib/logger/*` tests), cron auth, dispatcher job-result
  aggregation.
- **Ops checks**: `/cron-debugger` skill for job execution history; dispatcher response body
  reports per-job `status`/`durationMs`.

## Open questions

- ~~Dispatcher vs systemd timers post-cutover~~ — **resolved 2026-07-18: dispatcher stays.**
  The app remains on Vercel after cutover (only the DB moves), so Vercel cron keeps working
  unchanged. Revisit only if the app itself ever moves off Vercel.
- ~~Formal retention policy for `system_logs`~~ — **resolved 2026-07-29: warn 30d, error 90d**,
  enforced by `prune-system-logs` via the dispatcher. Error keeps the same 90-day window as
  `auth_events` (a full quarter of incident review); warn is mostly noise-with-a-pulse and
  earns a month.
- No unauthenticated liveness endpoint. `/api/health` is admin-gated, so the Uptime Kuma
  instance on the Pi cannot probe the app — site-down detection is currently manual. A
  `/api/ping` returning 200 + build SHA with no DB access would close this.
- ~~Cron failures reported as successes~~ — **resolved 2026-07-29.** Cron routes return
  200-with-error-payload by design, so `runJob` counted `{ success: false }` bodies as
  successes and logged nothing. It now inspects the body and `logger.error`s on a reported
  failure (`skipped: true` still counts as a deliberate no-op), which reaches `system_logs`
  and Sentry. Still open: nobody reads the dispatcher's own response, so a _whole-dispatcher_
  failure (timeout, cold-start crash) is still silent — that needs an external prober or a
  home-ops ingest emit.

## References

- ADR: `docs/adr/2026-05-17-0003-unified-logger-pino-backend.md`
- Code: `app/api/cron/*`, `app/api/admin/*`, `lib/logger/*`, `components/debug/*`,
  `app/dashboard/actions.ts` (`getAuditLogs`)
- Schema: `supabase/baseline/cloud_schema_2026-06-22.sql` (`audit_log*`, `system_logs`,
  `jsonb_diff`, `tr_audit_*`); drift notes in `00-overview.md` §Schema truth
- Live audit (the real one): `*_history` tables in docs 01, 02, 03, 06
