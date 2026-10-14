---
created: 2026-10-14
updated: 2026-10-14
---

# Strummy — Product Requirements

Derived from [CONTEXT.md](../CONTEXT.md) (domain language) and the blueprint under
[app-blueprint/](app-blueprint/). This document states **what the product is and must do**; every
section links to the blueprint doc that holds the detail. It carries no statuses or task lists —
the planner vault owns in-flight state, and `npm run test:flows` is the status of the core.

## 1. Product thesis & target user

Strummy is a **student management system for guitar teachers**: a CRM + light LMS in which the
teacher schedules Lessons, curates a song catalog, attaches songs and homework to Lessons, and the
Student logs in to see the same truth — upcoming Lessons, their Repertoire, Assignments — and logs
practice. Teacher and student act on one record set; RLS, not UI, decides who sees what
([00-overview.md](app-blueprint/00-overview.md) § Thesis, § The core loop).

The user is a **solo teacher running their own studio** — today the owner, who is the only
Teacher and the Admin, with ~20–30 daily active users on a self-hosted Supabase stack and a
Vercel-hosted app (`strummy.online`). The strategic frame is a **trust pass, not a feature pass**:
the student-facing surface shows nothing it cannot do, and new student-facing features wait for
real usage (v1.1). Owner-value threads (billing, recording motivator) are the active frontier
([90-roadmap.md](app-blueprint/90-roadmap.md) § Tranche 6).

## 2. Roles and Flags

Terms as defined in [CONTEXT.md](../CONTEXT.md). A Profile has one or more Roles and zero or
more Flags; Flags never gate routes, they modify behaviour.

| Kind | Name            | Who                                                                                      | Sees (Visible Students)            | May write                                                                                                                                                                                  |
| ---- | --------------- | ---------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Role | **Admin**       | The operator. Today identical to the Teacher.                                            | All Students                       | Full CRUD on every domain table; roster, roles, lockouts, logs, debug, AI prompts                                                                                                          |
| Role | **Teacher**     | Runs Lessons. _Teaches_ a Student iff a non-deleted Lesson links them.                   | Students they Teach                | Full CRUD on Lessons, Songs, Assignments, Repertoire overrides, skill assessments; invites Students                                                                                        |
| Role | **Student**     | Takes Lessons. Shadow Students exist without an auth account until they claim an invite. | Themselves                         | Own rows only: advance own Assignment status, log practice (immutable; same-day delete = undo), Repertoire self-rating/notes, song requests, own profile/settings/notification preferences |
| Flag | `isParent`      | Guardian linked to one child Profile                                                     | Read-only view of the linked child | Nothing on the child's data                                                                                                                                                                |
| Flag | `isDevelopment` | Demo/test account                                                                        | As per Roles                       | Mutations blocked unless `DEMO_WRITES_ENABLED=true`                                                                                                                                        |

Detail: [01-identity-access.md](app-blueprint/01-identity-access.md) § Behavior & rules;
[reference/ARCHITECTURE.md](app-blueprint/reference/ARCHITECTURE.md) (RBAC/RLS mechanics);
[adr/2026-05-09-0001-rls-is-the-security-boundary.md](app-blueprint/adr/2026-05-09-0001-rls-is-the-security-boundary.md).

## 3. Scope

**In scope (v1 — "basic full functionality", F01–F11 in [tests/flows/README.md](../tests/flows/README.md))**

- Account: sign in/out, password reset, teacher onboarding wizard.
- Roster: add a Student (with e-mail → invited at once; without → Shadow Student), claim via invite, roles.
- Lessons: schedule (incl. weekly repeat), edit, status; Student sees it; 24 h reminder mail.
- Lesson content: songs with Progress Status, notes; recap mail; Repertoire materialises from Lessons.
- Assignments: create → Student completes → Teacher notified; overdue reminder mail; templates.
- Song library: CRUD, filters, Student browses and marks "want to learn".
- Practice logging and the at-risk signal on the teacher dashboard.
- Skills: curriculum checklist per Student, chord quiz with SRS, skills roadmap.
- Fretboard explorer with saved presets.
- Notifications: bell, inbox, per-type preferences, queued e-mail delivery.
- Admin: roster, deactivate, unlock, roles, invite teacher, logs.

**Out of scope until there are users** (same source, § Scope): Cal.com intake, Google Calendar
sync as a product promise, AI surfaces (`SHOW_AI_FEATURES`), practice features behind
`SHOW_PRACTICE_FEATURES`, parent portal as a tested flow, Spotify / Ultimate Guitar import, admin
stats stubs. Gated by the Tranche 3 rule (new schema **and** a student-facing surface with no
teacher-visible result → wait for usage): achievements/streaks, tempo ladder, student
self-assessment ([90-roadmap.md](app-blueprint/90-roadmap.md) § Tranche 3).

**Planned, not built**: Billing & payments ([12-billing-payments.md](app-blueprint/12-billing-payments.md)).

## 4. User journeys

Routes are those under `app/`; each step names the page it happens on.

### 4.1 Teacher onboarding and first Lesson (F01, F02, F03)

1. Sign up / sign in — `/sign-up`, `/sign-in`; Google or e-mail + password.
2. Teacher onboarding wizard writes `user_preferences` — `/onboarding`.
3. Add a Student — `/dashboard/users/new`. With an e-mail the invite is sent immediately; without one a Shadow Student is created.
4. Student claims the invite — `/accept-invitation` → `claim_shadow_profile` relinks history.
5. Schedule the first Lesson, optionally "repeat weekly" — `/dashboard/lessons/new`.
6. Student signs in and sees it — `/dashboard` (student view), `/dashboard/lessons`.
7. 24 h before, the dispatcher cron queues the reminder; the Student receives it (`lesson-reminders` → `process-notification-queue`).

### 4.2 Teacher weekly loop (F03–F06, F08)

1. Open today's Lessons — `/dashboard` (teacher view), `/dashboard/lessons`.
2. Run the Lesson: attach songs, set Progress Status per song, write notes (AI draft optional) — `/dashboard/lessons/[id]`, `/dashboard/lessons/[id]/edit`.
3. Mark the Lesson completed; the recap mail goes out; Repertoire advances forward-only via trigger.
4. Assign homework, optionally from a template or linked to a song / chord drill — `/dashboard/assignments/new`, `/dashboard/assignments/templates`.
5. Assess skills on the Student's checklist — `/dashboard/users/[id]` (Skills tab).
6. Add or edit songs the roster needs — `/dashboard/songs/new`, `/dashboard/songs/[id]/edit`.
7. Review the roster: at-risk card, practice, completions — `/dashboard`, `/dashboard/users/[id]`.

### 4.3 Student practice loop (F04–F10)

1. Sign in; dashboard shows next Lesson, open Assignments, weekly practice chart — `/dashboard`.
2. Read lesson notes and song statuses — `/dashboard/lessons/[id]`.
3. Browse the library, mark "want to learn" — `/dashboard/songs`, `/dashboard/songs/[id]`.
4. Work the Repertoire: self-rating and notes — `/dashboard/repertoire`.
5. Log a practice session (duration, song, BPM, notes); same-day remove = undo — `/dashboard/practice`.
6. Advance an Assignment `not_started → in_progress → completed` — `/dashboard/assignments/[id]`.
7. Drill chords with SRS; see the skills roadmap — `/dashboard/skills/chord-quiz`, `/dashboard/my-skills`.
8. Explore the fretboard, save a preset — `/dashboard/fretboard`.
9. Read notifications; tune preferences — `/dashboard/notifications`, `/dashboard/settings/notifications`.

### 4.4 Admin operations (F11)

1. Roster search, filters, deactivate — `/dashboard/users`.
2. Edit roles and active toggle — `/dashboard/users/[id]/edit`.
3. Unlock locked accounts — `/dashboard` (admin view, locked-accounts card).
4. Invite a teacher — `/dashboard/users` (inline invite).
5. Read system logs — `/dashboard/logs`; cron and service health — `/dashboard/admin/debug`.
6. Manage AI prompt templates — `/dashboard/admin/prompts`.

### 4.5 Parent view (out of F01–F11; shipped 2026-07-23)

1. Parent signs in; `isParent` routes the dashboard to the family portal — `/dashboard` (`ParentView`).
2. Reads the linked child's Lessons, practice and teacher note, read-only.
3. Receives the child's notifications per preferences — `/dashboard/settings/notifications`.

Journey catalogue with test pointers: [reference/E2E_JOURNEYS.md](app-blueprint/reference/E2E_JOURNEYS.md).

## 5. Feature specs

Maturity uses the legend from [00-overview.md](app-blueprint/00-overview.md) § Maturity legend:
mounted · nav-hidden · built-unmounted · unbuilt · dormant · aspirational. Where a domain mixes
levels, the row names the surface that sets it.

### 5.1 Identity & access — [01-identity-access.md](app-blueprint/01-identity-access.md)

| Feature                         | Behaviour / rules                                                                                                   | Surfaces (routes)                                                   | Maturity |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------- |
| Auth & session                  | E-mail/password + Google; SSR cookie session; sign-out is a server route; lockout + rate limit; `auth_events` audit | `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`       | mounted  |
| Onboarding                      | Wizard writes `user_preferences`; rejects a Profile that already has a Role (no escalation)                         | `/onboarding`                                                       | mounted  |
| Roster & Shadow Students        | Create with/without e-mail; invite on create; `claim_shadow_profile` relinks; Teaches derives from Lessons          | `/dashboard/users`, `/dashboard/users/new`, `/dashboard/users/[id]` | mounted  |
| Roles & activation (admin)      | Role booleans → `user_roles` by trigger; active toggle                                                              | `/dashboard/users/[id]/edit`                                        | mounted  |
| Self-service settings, API keys | Name/phone/avatar upload; bearer API keys (students may not mint)                                                   | `/dashboard/settings`, `/dashboard/profile` (redirect)              | mounted  |
| Theme/language/timezone panel   | Actions exist, no UI consumer                                                                                       | —                                                                   | unbuilt  |

### 5.2 Lessons & calendar — [02-lessons-calendar.md](app-blueprint/02-lessons-calendar.md)

| Feature              | Behaviour / rules                                                                                                      | Surfaces (routes)                                      | Maturity                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------ |
| Lesson CRUD          | One Teacher × one Student; status enum; soft delete; songs attached with Progress Status; weekly repeat creates N rows | `/dashboard/lessons`, `/new`, `/[id]`, `/[id]/edit`    | mounted                                          |
| List                 | Status filter, sort, pagination, role-aware; breakdown counts from the full set                                        | `/dashboard/lessons`                                   | mounted                                          |
| Google Calendar sync | Best-effort mirror both ways; conflicts resolved side-by-side; webhook renewal cron                                    | `/dashboard/calendar`, `/dashboard/calendar/conflicts` | mounted (dormant integration — 1 connected user) |
| Calendar grid view   | CUT (CAL-1, 2026-07-18) — controls-only page                                                                           | —                                                      | unbuilt                                          |

### 5.3 Songs & Repertoire — [03-songs-repertoire.md](app-blueprint/03-songs-repertoire.md)

| Feature                    | Behaviour / rules                                                                                                          | Surfaces (routes)                                               | Maturity          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------- |
| Song catalog               | Shared library, staff-gated writes; URL-state list (level/key/author/category/search/sort/page/selected)                   | `/dashboard/songs`, `/new`, `/[id]`, `/[id]/edit`               | mounted           |
| Repertoire                 | Created by trigger on first Lesson song; Via-Lesson forward-only, Direct Override may regress; Progress History by trigger | `/dashboard/repertoire`, `/dashboard/users/[id]`                | mounted           |
| Song requests              | Student asks for a song; teacher reviews                                                                                   | `/dashboard/songs/requests`                                     | mounted           |
| Spotify enrichment         | Match + import pipeline; admin review pages are placeholders                                                               | `/dashboard/admin/spotify-*`                                    | unbuilt (UI)      |
| Song of the Week, sections | Actions exist, no surface                                                                                                  | —                                                               | unbuilt           |
| Song analytics             | Matviews refreshed by cron, no reader                                                                                      | `/dashboard/songs/analytics`, `/dashboard/songs/chord-analysis` | nav-hidden (stub) |

### 5.4 Practice & progress — [04-practice-progress.md](app-blueprint/04-practice-progress.md)

| Feature                  | Behaviour / rules                                                                                   | Surfaces (routes)       | Maturity                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------- |
| Practice log             | Duration, song, BPM, notes; immutable; same-day delete = undo; aggregates onto `student_repertoire` | `/dashboard/practice`   | mounted (gated by `SHOW_PRACTICE_FEATURES`) |
| Weekly chart, at-risk    | Student dashboard chart; teacher "needs attention" card clears on practice                          | `/dashboard`            | mounted                                     |
| Teacher view of sessions | Inside the health-aware student detail                                                              | `/dashboard/users/[id]` | mounted                                     |
| My Stats                 | Placeholder                                                                                         | `/dashboard/stats`      | nav-hidden (stub)                           |
| Tempo ladder, streaks    | v1.1; streaks have no schema                                                                        | —                       | aspirational                                |

### 5.5 Chords, theory, fretboard — [05-chords-theory.md](app-blueprint/05-chords-theory.md)

| Feature            | Behaviour / rules                                                               | Surfaces (routes)                                                                | Maturity   |
| ------------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------- |
| Chord quiz + SRS   | SM-2 per chord; due-count nudge; assignable as a drill (ASG-4)                  | `/dashboard/skills`, `/dashboard/skills/chord-quiz`, `/dashboard/skills/history` | mounted    |
| Fretboard explorer | Pure client-side; scale/key/chord/interval in URL; saved presets                | `/dashboard/fretboard`, `/fretboard` (public)                                    | mounted    |
| Theory LMS         | Courses → ordered lessons, publish flags, per-student grants; no seeded content | `/dashboard/theory/**`                                                           | nav-hidden |

### 5.6 Assignments — [06-assignments.md](app-blueprint/06-assignments.md)

| Feature          | Behaviour / rules                                                                                                                       | Surfaces (routes)                                       | Maturity |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------- |
| Assignment CRUD  | Optional lesson/song/drill link, due date, daily target, submission type; AI description                                                | `/dashboard/assignments`, `/new`, `/[id]`, `/[id]/edit` | mounted  |
| State machine    | `not_started → in_progress → completed`, `cancelled`, read-time `overdue`; Student advances own via RPC; teacher notified on completion | `/dashboard/assignments/[id]`                           | mounted  |
| Templates        | Title + checklist inherited on start-from-template                                                                                      | `/dashboard/assignments/templates{,/new,/[id]}`         | mounted  |
| History timeline | `assignment_history` written by trigger, shown on detail                                                                                | `/dashboard/assignments/[id]`                           | mounted  |

### 5.7 Notifications & e-mail — [07-notifications-email.md](app-blueprint/07-notifications-email.md)

| Feature            | Behaviour / rules                                                                                                                               | Surfaces (routes)                                   | Maturity |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------- |
| In-app feed + bell | 17 types, per-user per-type preferences; realtime bell; mark read / all read                                                                    | `/dashboard/notifications`                          | mounted  |
| E-mail             | Queued, retried via SMTP; deliverable-e-mail chokepoint skips Shadow Students; `STUDENT_EMAILS_ENABLED` master switch; reminders/recaps/overdue | `/dashboard/settings/notifications`, `/unsubscribe` | mounted  |
| Admin analytics    | API exists, page is a placeholder (NOT-3)                                                                                                       | `/dashboard/admin/notifications`                    | unbuilt  |

### 5.8 AI assistant — [08-ai-assistant.md](app-blueprint/08-ai-assistant.md)

| Feature            | Behaviour / rules                                                                                    | Surfaces (routes)                                              | Maturity                              |
| ------------------ | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------- |
| Inline generators  | Lesson notes, assignment description; OpenRouter or Ollama behind one interface; `max_tokens` capped | inside lesson / assignment editors                             | mounted (gated by `SHOW_AI_FEATURES`) |
| Hub, chat, history | Teacher/admin only; Students have no AI surface by design                                            | `/dashboard/ai`, `/dashboard/ai/chat`, `/dashboard/ai/history` | nav-hidden                            |
| Prompt templates   | Admin-edited prompts                                                                                 | `/dashboard/admin/prompts`                                     | mounted (admin)                       |

### 5.9 Content production — [09-content-production.md](app-blueprint/09-content-production.md)

| Feature             | Behaviour / rules                                                    | Surfaces (routes)                         | Maturity     |
| ------------------- | -------------------------------------------------------------------- | ----------------------------------------- | ------------ |
| Drive attachments   | Files on songs, lessons, assignments, profiles; streamed via the app | song / lesson detail                      | mounted      |
| Social pipeline     | `song_videos` state, per-platform posts, hashtags, metrics           | Production tab on `/dashboard/songs/[id]` | mounted      |
| Recording motivator | "Do nagrania" board + lesson transcripts (CNT-5…8)                   | —                                         | aspirational |
| Admin drive videos  | Placeholder (CNT-2)                                                  | `/dashboard/admin/drive-videos`           | unbuilt      |

### 5.10 Admin & observability — [10-admin-observability.md](app-blueprint/10-admin-observability.md)

| Feature                      | Behaviour / rules                                                 | Surfaces (routes)                                                     | Maturity          |
| ---------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------- |
| Logs viewer                  | `system_logs` over `/api/admin/logs`; admin-only nav item         | `/dashboard/logs`, `/dashboard/admin/import-logs`                     | mounted           |
| Debug dashboard              | AI, cron, DB, services panels; polls `/api/health`                | `/dashboard/admin/debug`                                              | mounted           |
| Admin home                   | Platform metrics, pending invites, locked accounts, role switcher | `/dashboard`                                                          | mounted           |
| Stats, cohorts, health pages | Placeholders                                                      | `/dashboard/admin/stats/*`, `/dashboard/cohorts`, `/dashboard/health` | nav-hidden (stub) |

### 5.11 Skills assessment — [11-skills-assessment.md](app-blueprint/11-skills-assessment.md)

| Feature                               | Behaviour / rules                                                                             | Surfaces (routes)                    | Maturity |
| ------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------ | -------- |
| Teacher checklist                     | Catalog by migration; level tabs → lessons → skills; status per Student; milestones, progress | `/dashboard/users/[id]` (Skills tab) | mounted  |
| Student roadmap                       | Read-only own checklist                                                                       | `/dashboard/my-skills`               | mounted  |
| Self-assessment, notes, notifications | SKL-3…6                                                                                       | —                                    | unbuilt  |

### 5.12 Billing & payments — [12-billing-payments.md](app-blueprint/12-billing-payments.md)

| Feature                       | Behaviour / rules                                                                         | Surfaces (routes)                                           | Maturity     |
| ----------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------ |
| Monthly bill per Student      | Unbilled completed Lessons × `lesson_rate` → Stripe invoice; Stripe is the ledger         | `/dashboard/billing`, `/dashboard/users/[id]` (Rozliczenia) | aspirational |
| Student / parent pays         | BLIK / card / Przelewy24 on the hosted page; PDF; "Do zapłaty" home card                  | `/dashboard/billing`, `/dashboard`                          | aspirational |
| Overdue reminders, compliance | Via the doc 07 dispatcher; faktura/rachunek, KSeF decision before billing a human (BIL-7) | —                                                           | aspirational |

## 6. Non-functional requirements

- **Security boundary = RLS.** Every table has RLS; Students write through `SECURITY DEFINER` RPCs; `StudentAccess` only populates selectors and pre-write 403s — never a `WHERE`. Cross-role isolation is proven by `tests/e2e/cross-role/rls-data-isolation.spec.ts` and `npm run test:rls` against the dev stack only. → [adr/…0001](app-blueprint/adr/2026-05-09-0001-rls-is-the-security-boundary.md), [91-testing-strategy.md](app-blueprint/91-testing-strategy.md) § RLS testing, [reference/ARCHITECTURE.md](app-blueprint/reference/ARCHITECTURE.md).
- **Schema as migrations.** Every DB change is an idempotent file in `supabase/migrations/`; generated types from one root `database.types.ts`, drift gated in CI. → `CLAUDE.md` § Database Changes, `.claude/rules/structure.md` S4.
- **i18n pl/en.** `next-intl`, `messages/pl.json` + `messages/en.json` (2 450 keys each); dates, statuses and labels follow the viewer's locale; no bare `toLocale*()` calls. → `i18n/locales.ts`, `i18n/request.ts`.
- **Mobile-first.** Every surface works at 320 px with `dark:` variants; Playwright device projects 320–1920 px. → `.claude/rules/code-style.md`, `.claude/rules/playwright-testing.md`.
- **E-mail.** SMTP transport behind `STUDENT_EMAILS_ENABLED`; non-production sends to the dev stack's Mailpit; auth-mail URLs restored after any stack restart. → [07-notifications-email.md](app-blueprint/07-notifications-email.md), `docs/runbooks/supabase-stack-restart.md`, `lib/env.ts`.
- **Crons.** One daily Vercel cron (`/api/cron/dispatcher`, 06:00) fans out to the producer jobs under `app/api/cron/*` then drains the queue; Hobby plan ⇒ "24 h" reminders arrive 24–48 h ahead. → `vercel.json`, [10-admin-observability.md](app-blueprint/10-admin-observability.md), [tests/flows/README.md](../tests/flows/README.md) § Open questions.
- **Observability.** Sentry (`@sentry/nextjs`, `instrumentation*.ts`), Pino logger facade (ADR-0003) into `system_logs`, `/api/health` polled by the debug page, home-ops log shipper. → `lib/observability/`, [adr/…0003](app-blueprint/adr/2026-05-17-0003-unified-logger-pino-backend.md).
- **Deployment.** `main` deploys to production; PR previews; gates = `ci.yml` + Core flows job. → `CLAUDE.md` § Deployment, [92-launch-runbook.md](app-blueprint/92-launch-runbook.md), [reference/PRODUCTION_REQUIREMENTS.md](app-blueprint/reference/PRODUCTION_REQUIREMENTS.md) (env vars, services, checklist).
- **Honesty rule.** No "coming soon" reachable from student nav; `menu.constants.ts` is the per-feature reveal ledger. → [00-overview.md](app-blueprint/00-overview.md) § The core loop.

## 7. Open gaps

Briefs live in the owning domain doc; order lives in [90-roadmap.md](app-blueprint/90-roadmap.md).

| Tranche                    | Gap IDs                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| T1 Self-host launch        | P3–P5 of [92-launch-runbook.md](app-blueprint/92-launch-runbook.md)                                |
| T2 v1 trust fixes          | ADM-5, ADM-6, ADM-7, ADM-8, ASG-6, IDA-6, CAL-4, LES-6, SKL-1, SKL-2, SKL-3                        |
| T3 v1.1 parking lot        | PRA-2, THY-1, SNG-1…4, SKL-4, SKL-5, SKL-6, achievements/streaks                                   |
| T4 Debt                    | Cloud project fate                                                                                 |
| T5 Parked                  | CNT-2, CNT-3, CNT-4, NOT-3                                                                         |
| T6 Owner-value threads     | BIL-1…8, CNT-5…8                                                                                   |
| Cross-cutting SaaS hygiene | HYG-1…5 ([reference/SAAS_HYGIENE_BENCHMARK.md](app-blueprint/reference/SAAS_HYGIENE_BENCHMARK.md)) |

Cross-doc open questions are indexed at the end of the roadmap.

## 8. References

- Domain language: [CONTEXT.md](../CONTEXT.md)
- Blueprint index: [app-blueprint/README.md](app-blueprint/README.md), [00-overview.md](app-blueprint/00-overview.md)
- Domain docs: [01](app-blueprint/01-identity-access.md) · [02](app-blueprint/02-lessons-calendar.md) · [03](app-blueprint/03-songs-repertoire.md) · [04](app-blueprint/04-practice-progress.md) · [05](app-blueprint/05-chords-theory.md) · [06](app-blueprint/06-assignments.md) · [07](app-blueprint/07-notifications-email.md) · [08](app-blueprint/08-ai-assistant.md) · [09](app-blueprint/09-content-production.md) · [10](app-blueprint/10-admin-observability.md) · [11](app-blueprint/11-skills-assessment.md) · [12](app-blueprint/12-billing-payments.md)
- Roadmap and testing: [90-roadmap.md](app-blueprint/90-roadmap.md), [91-testing-strategy.md](app-blueprint/91-testing-strategy.md), [92-launch-runbook.md](app-blueprint/92-launch-runbook.md)
- Core flows (status of the core): [tests/flows/README.md](../tests/flows/README.md)
- Reference: [PRODUCTION_REQUIREMENTS.md](app-blueprint/reference/PRODUCTION_REQUIREMENTS.md), [E2E_JOURNEYS.md](app-blueprint/reference/E2E_JOURNEYS.md), [ARCHITECTURE.md](app-blueprint/reference/ARCHITECTURE.md)
- Decisions: [app-blueprint/adr/](app-blueprint/adr/)
