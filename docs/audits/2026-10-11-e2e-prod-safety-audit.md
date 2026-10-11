# E2E suite — production-safety audit

**Date**: 2026-10-11
**Scope**: all 86 Playwright specs under `tests/e2e/` + `tests/helpers`, `tests/fixtures`, `playwright.prod.config.ts`, `tests/prod-global-setup.ts`
**Question**: which specs can run against `https://strummy.online` (real Supabase DB), piece by piece, without harming production data?
**Method**: every spec read in full by 4 parallel read-only agents, classified with one schema.

## Verdict legend

| Verdict        | Meaning                                                                    |
| -------------- | -------------------------------------------------------------------------- |
| **SAFE**       | read-only, no accounts, no local deps                                      |
| **SAFE-W-ACC** | read-only but needs prod test accounts (teacher/student/admin/demo/parent) |
| **RISKY**      | mutates data; cleanup missing, pattern-based or buggy                      |
| **IMPOSSIBLE** | needs the prod service-role key, mailpit, seed IDs or SQL access           |

## Totals (86 specs)

| Group                                                                                    | SAFE  | SAFE-W-ACC | RISKY   | IMPOSSIBLE |
| ---------------------------------------------------------------------------------------- | ----- | ---------- | ------- | ---------- |
| smoke/auth/demo/dashboard/mobile/onboarding/parent/notifications/integration/manual (23) | 2     | 9          | 9       | 3          |
| teacher + teacher-full-journey (29)                                                      | 0     | 3          | 8–10    | 16–17      |
| student + settings + 2 journeys (15)                                                     | 0     | 3          | 12      | 0          |
| admin + ai + cross-role (19)                                                             | 0     | 10         | 9       | 0          |
| **Total**                                                                                | **2** | **25**     | **~39** | **~20**    |

(Agents B and C counted service-role seeding specs differently — B as IMPOSSIBLE, C as RISKY. Both mean the same thing: the spec needs the prod service-role key, and with it writes to prod unguarded.)

## Infrastructure findings (the gate is the key, not the URL)

1. **`isProductionUrl` guard protects only `cleanupAllTestData` / `runSqlCleanup`.** `seed-ids.adminClient()` and ~7 inline copies (assignment-templates, lesson-song-status, student-onboarding, admin/song-list-panel, rls-data-isolation, shadow-claim, onboarding) are unguarded. ~30 specs do service-role inserts/updates/deletes in `beforeAll`/`afterAll` straight into whatever `.env.local` points at.
2. **Guard checks a different URL than cleanup uses.** `assertNotProduction` reads `LOCAL_URL || NEXT_PUBLIC_SUPABASE_URL`; `getSupabaseClient()` deletes on `LOCAL_URL || NEXT_PUBLIC_SUPABASE_REMOTE_URL || URL`. `REMOTE_URL=prod` + `URL=dev` passes the guard and deletes on prod.
3. **Guard misses hosts**: prod Kong over LAN `192.168.1.75:54321` (only `:54322` Postgres listed) and legacy `strummy-db.marszal-arts.online`.
4. **`prod-global-setup` preflight checks DEV, not prod.** It signs in against `NEXT_PUBLIC_SUPABASE_URL` from `.env.local` (currently `192.168.1.75:55321` = dev). With default `@dev.local` accounts the preflight _passes_, then every spec times out on strummy.online — the exact 2026-08-06 failure it was written to prevent.
5. **Teardown patterns broad enough to hit real data** (if guard bypassed): songs `/EDITED$/`, `/UPDATED$/`, `/^Test Song$/`, artist `'Test Artist'` (hard deletes cascading into repertoire/lesson_songs); profiles `/^E2E/`. Prod test accounts `p.romanczuk+test*@gmail.com` are **not** in the protected list.
6. **10 device projects, no `testIgnore` per project.** A prod run without `--project` hits prod 10×: 10× AI spend, 10× fixture writes, `rls-data-isolation` creates 30 auth users.
7. **Missing prod accounts**: no admin, parent or demo test account on prod. Every admin-POV spec would run as the owner's real admin login. `CLAUDE.local.md` notes the prod test student's role assignment is blocked by the "Invalid request body" bug.
8. `tests/README.md` is stale: no mention of prod config, guard or preflight.

## Actively dangerous specs (never run against prod as-is)

| Spec                                                               | Why                                                                                                                                                                           |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `integration/workflows`                                            | creates lesson + assignment for the **first real student** in dropdown; cleanup = global teardown, which prod config disables → rows stay forever, student gets notifications |
| `teacher/backfill-at-risk`                                         | UPDATEs `last_practiced_at` on **other students'** repertoire rows; crash before `afterAll` corrupts real practice dates                                                      |
| `teacher/calendar-conflicts`                                       | pre-clean DELETEs **all** pending `sync_conflicts` for the teacher                                                                                                            |
| `teacher/song-detail-audio-player`                                 | UPDATEs `audio_files` on an **arbitrary real song** (`.limit(1)`)                                                                                                             |
| `teacher/student-preferences`                                      | deletes student's `user_preferences`, nulls `skill_level`; never restores originals                                                                                           |
| `teacher/settings-persist`                                         | restores teacher `full_name` to constant `'Sarah Mitchell'`                                                                                                                   |
| `teacher/assignment-templates`                                     | deletes assignments by title                                                                                                                                                  |
| `student/chord-quiz-srs`                                           | `delete chord_srs where student_id=X` before and after → wipes SRS history                                                                                                    |
| `student/assignments-interact`, `student-learning-journey`         | click Start/Complete on the **first real assignment** showing the button; never reverted                                                                                      |
| `notifications/inbox`                                              | "Mark all read" marks **every** real unread notification read                                                                                                                 |
| `notifications/prefs`                                              | upserts `notification_preferences`, deletes student's pref even if pre-existing                                                                                               |
| `admin/lockout-widget`                                             | sets `failed_login_attempts=5` + `locked_until` on test student (locks it while other specs run)                                                                              |
| `cross-role/my-skills`, `student-skills`, `student-skills-roadmap` | upsert into **global** `skills` catalog ("Lesson 998/999", "E2E Test Skill"), never cleaned → visible to every real student/teacher                                           |
| `cross-role/rls-data-isolation`                                    | creates 3 auth users per run; `deleteUser(u.authId)` is a bug (field is `id`) → leaks 3 users every run on every stack                                                        |
| `auth/shadow-claim-with-data`                                      | seeds lessons onto a **random real teacher** (`limit(1)`, no ORDER BY)                                                                                                        |
| `auth/sign-up-complete`                                            | 8 real sign-ups per project per run, no cleanup; 3 hardcode `@example.com` which Resend rejects (550)                                                                         |
| `ai/ai-playground`, `ai/feedback`                                  | real OpenRouter spend; permanent junk conversations in the owner's chat history                                                                                               |
| `manual/kuba-onboarding`                                           | deletes profiles `%Kuba Spiridono%` + a real Gmail auth user; stale selectors; `isRemote` only matches `vercel.app`                                                           |

## Cleanup bugs (leak even on dev)

- `teacher-full-journey`: all 3 deletes broken (`a:has-text(title)` never matches aria-label rows; song dialog button is "Delete song", not "Confirm"). Best candidate to delete the spec.
- `song-detail-duplicate`, `song-detail-quick-assign`: test 2 switches to student and `afterEach` deletes **as the student** → song leaks.
- `song-cover`: no cleanup at all; relies on teardown.
- Inline end-of-test deletes (lesson-duration-format, lessons-crud, song-edit-exhaustive, assignment-target-submission, tasks): leak on any mid-test failure.
- `song-edit-exhaustive.spec.ts` is **untracked in git**.

## Prod-safe set available today

**No accounts needed** (14 tests):

- `smoke/critical-path`, `smoke/landing-page`

**With prod testteacher + teststudent** (read-only):

- `teacher/fretboard` (needs admin — see below), `teacher/deleted-stub-routes`, `student/fretboard`, `settings/avatar-upload`
- `auth/sign-out` (run last/alone — kills cached sessions), `dashboard/sidebar` (fails on version drift vs checkout), `mobile/list-mobile`
- `cross-role/access-control`, `cross-role/practice-tools-hub`
- test 1 only of `teacher/assignments-crud`, `lessons-crud`, `songs-crud`
- 31 validation tests of `auth/sign-up-complete` (not the 8 submits), 2 Access-Control tests of `onboarding/complete-flow`
- `student-full-journey` minus Phase 10; `student-learning-journey` minus Phase 4

**Blocked on a prod admin account**: `auth/role-login`, `dashboard/topbar` (and expects single-role admin — owner is admin+teacher), `dashboard/states`, `admin/debug-dashboard`, `admin/import-logs`, `teacher/fretboard`.

**Blocked on a demo account**: `demo/demo-tour`, `demo/demo-screenshots`.

**Fixable to safe with small changes** (take IDs/names from UI or env instead of service role): `teacher/song-production-tab`, `teacher/users-management`, `teacher/student-onboarding` read-only tests, `cross-role/song-detail-content-tabs`.

## Quality observations

- Many tests cannot fail: `if (count > 0)`, `>= 0` asserts, `test.skip` on missing precondition; `student/songs-read` visits `/songs/null` and passes when seed fails.
- Heavy overlap: song creation in 8 teacher specs; lesson creation in 4; `song-edit-exhaustive ≈ songs-crud`; both journeys duplicate CRUD specs with weaker asserts.
- Stale skips: `assignments-crud` lifecycle ("Coming Soon" — but `assignment-target-submission` proves the form works), `users-management` A6.4, `integration/workflows` user-creation.
- Hardcoded dates now in the past: 2026-01-01, 04-15, 05-20, 05-30, 08-01, 08-15, 09-01, 09-08, 09-15. Past-dated `SCHEDULED` lessons may trigger status/overdue crons; `practice-bpm` and `lesson-list-panel` create lessons inside the reminder-cron window.
- Tags don't encode prod safety. `@smoke` happens to be safe; `@auth` covers both read-only and account-creating specs.

## Recommended remediation order

1. **Guard the key, not the teardown**: put `assertNotProduction()` inside `seed-ids.adminClient()` and all inline copies; make guard and `getSupabaseClient()` resolve the same URL; add `192.168.1.75:54321` and `strummy-db.marszal-arts.online` to the host list; add `p.romanczuk+test*` to protected accounts.
2. **Fix the preflight**: when `PLAYWRIGHT_BASE_URL` is set, require `NEXT_PUBLIC_SUPABASE_URL` to be the prod host (or resolve it from the target), otherwise abort.
3. **Add `@prod-safe` tag** to the read-only set above; prod config gets `grep: /@prod-safe/` and `projects: [Desktop Chrome]` only (optionally one phone).
4. **`testIgnore` in prod config** for `integration/`, `manual/`, the 3 skills specs, `rls-data-isolation`, `sign-up-complete` submits.
5. Create prod **admin** test account (and decide on demo); fix the prod test student role bug.
6. Fix cleanup bugs (`teacher-full-journey`, duplicate/quick-assign student-session delete, `rls-data-isolation` `authId`→`id`); commit or delete `song-edit-exhaustive`.
7. Merge overlapping song/lesson CRUD specs; delete `teacher-full-journey`; un-skip stale skips; move hardcoded dates to relative.
8. Rewrite `tests/README.md` with the prod workflow.
