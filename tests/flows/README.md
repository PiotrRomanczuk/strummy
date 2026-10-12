---
created: 2026-10-11
updated: 2026-10-12
---

# Core flows — the definition of "basic full functionality"

One spec per flow, in this directory. **The suite result is the status.** There is no
separate progress document: a flow is done when its spec is green, and nothing else.

```bash
npm run test:flows                     # all flows, Desktop Chrome, dev stack
npm run test:flows -- --grep F03       # one flow
```

Each step inside a spec is in one of three states, and Playwright reports them apart:

| State           | How it is written                      | Meaning                                                                   |
| --------------- | -------------------------------------- | ------------------------------------------------------------------------- |
| **pass / fail** | a normal `test()` with hard assertions | built; green = works end-to-end through the UI and the DB, for both roles |
| **fixme**       | `test.fixme(true, 'NOT BUILT: …')`     | the product feature does not exist yet; the spec names what is missing    |
| **skip**        | `test.skip(true, 'TODO automate: …')`  | built and believed to work, test not written yet                          |

Rules for a flow spec: it drives the UI as the real roles (`loginAs`), it seeds only through
`adminClient()` in `beforeAll` and deletes by id in `afterAll`, it never wraps an assertion in
`if (count > 0)`, and it never relies on data that happens to be in the database.

## Scope

"Basic" = a teacher runs lessons with a handful of students and both sides see the same
truth. In scope: F01–F11. Out of scope until there are users: Cal.com intake, Google Calendar
sync, AI surfaces, parent portal, Spotify/UG import and the admin stats stubs
(`SHOW_AI_FEATURES` and `SHOW_PRACTICE_FEATURES` stay as they are; the flows just don't
depend on them).

## The flows and their state on 2026-10-12

Every step of F01–F11 is a real test: **41 steps, 0 fixme, 0 TODO skips.** Run locally against the
dev stack (`npm run test:flows`) with SMTP pointed at Mailpit (below): 41 passed. In CI the
`Core flows (Desktop Chrome)` job runs the same suite on every PR.

| #   | Flow                                                                     | Steps | Spec                         |
| --- | ------------------------------------------------------------------------ | ----- | ---------------------------- |
| F01 | Sign in, wrong password, reset mail, sign out, teacher onboarding        | 5     | `f01-account.spec.ts`        |
| F02 | Add student with e-mail → invited at once → claims → journey → roles     | 5     | `f02-student-invite.spec.ts` |
| F03 | Schedule a lesson (incl. weekly) → student sees it → 24h reminder mail   | 4     | `f03-lesson.spec.ts`         |
| F04 | Lesson content: songs, stage, notes → student sees them → recap mail     | 5     | `f04-lesson-content.spec.ts` |
| F05 | Assignment: create → complete → teacher notified → overdue reminder mail | 6     | `f05-assignment.spec.ts`     |
| F06 | Song library: create/edit → student browses, wants to learn              | 4     | `f06-songs.spec.ts`          |
| F07 | Practice: at-risk before → log → dashboard → flag gone after             | 4     | `f07-practice.spec.ts`       |
| F08 | Skills: chord quiz with SRS, checklist, roadmap, Skills in teacher nav   | 4     | `f08-skills.spec.ts`         |
| F09 | Fretboard explorer + save preset                                         | 2     | `f09-fretboard.spec.ts`      |
| F10 | Notifications: bell, inbox, preference toggle, queued mail delivered     | 4     | `f10-notifications.spec.ts`  |
| F11 | Admin: roster, deactivate, unlock, roles, invite teacher, logs in nav    | 7     | `f11-admin.spec.ts`          |

**Mail-delivery steps** (F03.4, F04.5, F05.6, F10.4) refuse to run unless `SMTP_HOST` points at the
dev stack's Mailpit and `STUDENT_EMAILS_ENABLED=true` — otherwise the app would use the real Gmail
transport and the test would send a genuine mail. They report as _skipped_ with that message. Env
for the Mac and for the runner's `~/.strummy-e2e/.env.local`:

```
SMTP_HOST=192.168.1.75
SMTP_PORT=55325
SMTP_SECURE=false
STUDENT_EMAILS_ENABLED=true
```

and no `GMAIL_*` in any non-production env.

What the suite found on the way (all fixed, all with a migration or a unit test): `SKILL_LEVELS`
without `novice` (#852); onboarding role escalation (#853); reminders window and queue order (#854);
`get_pending_notifications` returning no entity, so the queue dedup never matched (#872);
`track_lesson_changes` comparing the enum in lowercase, so **no lesson status change ever succeeded
from the edit form** (#873 — apply `20261011171500` to production); `assignment-due-reminders` with
the same fixed-window gap (#875).

"Cheapest wins", all shipped: invite on create (#863), journey after claim (#867), teacher notified
on completion (#859), invite teacher in the UI (#868), Skills in the teacher nav (#869), Logs for
admins (#870).

## Known blockers — all three fixed on 2026-10-11

1. **Role save bug** ("Invalid request body" when ticking Student) — `SKILL_LEVELS` lacked
   `'novice'`. Fixed in #852 (`schemas/StudentIntakeSchema.ts`, unit tests for all four levels).
2. **Privilege escalation in onboarding** — `saveOnboarding` wrote `is_teacher` from the payload for
   any caller. Fixed in #853: the action rejects a profile that already has any role.
3. **24h reminders never arrived** — fixed in #854: `lesson-reminders` selects every lesson that
   reaches the 24 h mark before the next dispatcher run (`lib/notifications/reminder-window.ts`),
   and the dispatcher drains the notification queue after the producer jobs instead of in
   parallel. The cron stays daily (see Open questions). `STUDENT_EMAILS_ENABLED` is documented in
   `lib/env.ts` and is still **unset in Production** — the owner has to set it.

## Open questions (owner decisions — the suite moves on without them)

1. **Reminder cadence on Vercel Hobby.** The account is on the Hobby plan, which allows no cron
   schedule shorter than daily, so a "24h" reminder goes out 24–48 h ahead. Hourly delivery means
   Vercel Pro (then change `DISPATCHER_CADENCE_HOURS` and `vercel.json` together) or an external
   hourly trigger (GitHub Actions `schedule:` was deliberately switched off). Which?
2. ~~**E-mail delivery in tests.**~~ Decided 2026-10-12: non-production environments send through
   the dev stack's Mailpit (`SMTP_HOST=192.168.1.75`, port 55325) with `STUDENT_EMAILS_ENABLED=true`
   and no `GMAIL_*`. The four mail steps guard on it and skip otherwise. **Still to do by the
   owner: set it in `~/.strummy-e2e/.env.local` on `uwh` and in the Mac's `.env.local`.**
3. **Parent portal** stays out of scope until there are users — confirm, or add F12.
4. **Daily activity report / panel.** Nothing today says who used the app and how; the "Morning
   Briefing" is a song-library coverage report and the admin summary is queue statistics. The data
   exists (`auth_events`, `practice_sessions`, `assignment_history`, `chord_quiz_attempts`,
   `lessons`; PostHog has page views only). Options: an admin page `/dashboard/admin/activity` in
   the app (no new infra), or events into home-ops and a panel on the Pi. Mail at most as a weekly
   digest. Which, and when?
5. ~~**Teacher onboarding `inviteEmails`.**~~ Decided 2026-10-12: the field and its wizard step are
   gone. Students are invited from the roster (add with an e-mail → invited at once, F02); F01.5
   walks a new account through the teacher wizard without it.
6. **CI mail spam (found 2026-10-11).** The ungated `bruno` job ran the `cron/` folder on every
   PR with real `GMAIL_*` credentials on the runner: two "Morning Briefing" mails and a bounce per
   `@dev.local` recipient per run. #855 puts Bruno behind `extended-ci`; the durable fix is
   Open question 2 (Mailpit for every non-production environment) plus dropping `cron/` from the
   GET-only smoke.
