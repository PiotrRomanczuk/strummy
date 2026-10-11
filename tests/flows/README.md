---
created: 2026-10-11
updated: 2026-10-11
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

## The flows and their state on 2026-10-11

Status is from a read of the code on `fix/e2e-audit-findings` plus the two audits of
2026-10-11 (`docs/audits/`). It becomes the suite's job from here on.

| #   | Flow                                                                     | Steps | Works | Partial | Not built | Spec                         |
| --- | ------------------------------------------------------------------------ | ----- | ----- | ------- | --------- | ---------------------------- |
| F01 | Sign in, reset password, sign out                                        | 4     | 3     | 1       | 0         | `f01-account.spec.ts`        |
| F02 | Teacher adds a student → student is invited, signs up, is linked         | 5     | 3     | 2       | 0         | `f02-student-invite.spec.ts` |
| F03 | Teacher schedules a lesson (incl. weekly) → student sees it → reminder   | 4     | 2     | 1       | 1         | `f03-lesson.spec.ts`         |
| F04 | Lesson content: songs, stage per song, notes → student sees homework     | 5     | 4     | 1       | 0         | `f04-lesson-content.spec.ts` |
| F05 | Assignment: create → student starts, ticks, completes → teacher sees     | 6     | 5     | 0       | 1         | `f05-assignment.spec.ts`     |
| F06 | Song library: teacher creates/edits → student browses, wants to learn    | 4     | 4     | 0       | 0         | `f06-songs.spec.ts`          |
| F07 | Practice: student logs → dashboard streak → teacher sees at-risk         | 3     | 3     | 0       | 0         | `f07-practice.spec.ts`       |
| F08 | Skills: chord quiz with SRS, checklist, roadmap                          | 3     | 3     | 0       | 0         | `f08-skills.spec.ts`         |
| F09 | Fretboard explorer + save preset                                         | 2     | 2     | 0       | 0         | `f09-fretboard.spec.ts`      |
| F10 | Notifications: inbox, badge, preferences, email                          | 4     | 3     | 1       | 0         | `f10-notifications.spec.ts`  |
| F11 | Admin: users list, edit roles, deactivate, lock/unlock, invite a teacher | 5     | 3     | 1       | 1         | `f11-admin.spec.ts`          |

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

## Cheapest wins (built, not reachable)

- Admin "Invite teacher": `inviteUser` (`app/dashboard/actions.ts:182`) has no UI caller.
- Invite on create: `POST /api/users` stores `invite_email` but sending needs a second click.
- Student onboarding (level, goals) is never shown to claimed students: the page redirects
  anyone who already has a role. Show the Journey step once, or delete it.
- Teacher onboarding collects `inviteEmails` and drops them.
- Skills has no entry in the teacher nav; the quiz is reachable only from Fretboard.
- `/dashboard/logs` and `/admin/import-logs` are nav-hidden for admins (`menu.constants.ts`).

## Fixes that exist only on `fix/e2e-audit-findings` (PR #851)

Phone song wizard silent submit, practice tiers (7 d watch / 14 d at-risk), bell badge,
`?redirect=` after sign-in, goal labels, fretboard finishes on phones, stale preference load.
Until it merges, F06, F07, F10 are partial on `main`.

## Open questions (owner decisions — the suite moves on without them)

1. **Reminder cadence on Vercel Hobby.** The account is on the Hobby plan, which allows no cron
   schedule shorter than daily, so a "24h" reminder goes out 24–48 h ahead. Hourly delivery means
   Vercel Pro (then change `DISPATCHER_CADENCE_HOURS` and `vercel.json` together) or an external
   hourly trigger (GitHub Actions `schedule:` was deliberately switched off). Which?
2. **E-mail delivery in tests (F01.3, F02.4, F03.4, F04.5, F05.6, F10.4).** The dev stack's GoTrue
   mail (sign-up, invite, reset) lands in Mailpit (`192.168.1.75:55324`), but the app's own
   notification e-mails go through `GMAIL_*` SMTP even on dev. To prove "the student got the
   e-mail" without sending real mail, dev needs `SMTP_*` pointed at Mailpit (port 55325) and
   `STUDENT_EMAILS_ENABLED=true` in `.env.local` / the runner's env. Approve that env change?
3. **Parent portal** stays out of scope until there are users — confirm, or add F12.
