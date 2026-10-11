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

## Known blockers (fix these first, they break several flows)

1. **Role save bug** ("Invalid request body" when ticking Student): `schemas/StudentIntakeSchema.ts:12`
   `SKILL_LEVELS` lacks `'novice'`, which onboarding (`onboarding.constants.ts:34`) and the Cal.com
   intake write and the DB allows (migration `20260730120000`). The edit form re-sends `skillLevel`,
   Zod rejects it. One-line fix. Blocks F02, F11.
2. **Privilege escalation in onboarding**: `app/actions/onboarding.ts` `saveOnboarding` writes
   `is_teacher` from the payload with no check that the caller has no role yet. An invited student
   can call it with `role: 'teacher'` and then read every profile through `profiles_select_staff`.
   Only the page redirects role-holders; the action must too. Blocks nothing visible, must be fixed
   before any invite goes out.
3. **24h reminders never arrive**: the Vercel cron runs the dispatcher once a day at 06:00 UTC
   (`vercel.json`); `lesson-reminders` selects lessons 23–25 h ahead, so only lessons at 05:00–07:00
   UTC next day qualify, and the queue processor runs in parallel with the enqueue
   (`dispatcher/route.ts:219`), so rows wait for the next day. Student email is also off unless
   `STUDENT_EMAILS_ENABLED=true`, which no env file sets. Blocks F03, F05, F10.

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
