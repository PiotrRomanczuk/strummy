---
created: 2026-07-28
updated: 2026-07-28
---

# E2E Tested Journeys — actual inventory

Every Playwright journey that exists in `tests/e2e/`, with the feature it drives and the
user type it drives it as. Generated from the specs and from `playwright test --list`
(source of truth), not from memory.

**61 spec files · 297 test cases · 43 skipped** on the `Desktop Chrome` project, as of
2026-07-28. Supersedes `docs/2026-07-23-e2e-tested-journeys.md` (58 / 281 / 23) and the
coverage numbers in [`E2E_JOURNEYS.md`](app-blueprint/reference/E2E_JOURNEYS.md), which
catalogs journeys *needed*; this lists journeys *tested*.

**User type** is the role the spec actually authenticates as (`loginAs(...)`), not the
role the feature belongs to — several specs log in as more than one precisely to prove a
boundary. `anonymous` means it never signs in.


## Teacher  (21 specs · 48 tests)

| Spec | Feature under test | User type | Tests |
|---|---|---|---:|
| `teacher/lessons-crud.spec.ts` | Lesson create / edit / delete | teacher | 2 |
| `teacher/lesson-duration-format.spec.ts` | Lesson duration + in-person/online format | teacher | 1 |
| `teacher/lesson-repeat-weekly.spec.ts` | Recurring weekly lessons | teacher | 2 |
| `teacher/lesson-song-status.spec.ts` | Per-song status within a lesson | teacher | 2 |
| `teacher/calendar-conflicts.spec.ts` | Double-booking detection + resolve | teacher | 2 |
| `teacher/songs-crud.spec.ts` | Song library CRUD | teacher | 3 |
| `teacher/song-cover.spec.ts` | Song cover-image upload | teacher | 1 |
| `teacher/song-external-links.spec.ts` | YouTube / Ultimate Guitar resources on detail | teacher | 1 |
| `teacher/song-production-tab.spec.ts` | Song production tab visibility | student, teacher | 2 |
| `teacher/assignments-crud.spec.ts` | Assignment create / edit / delete | teacher | 2 |
| `teacher/assignment-templates.spec.ts` | Save + reuse assignment templates | teacher | 3 |
| `teacher/assignment-target-submission.spec.ts` | Daily target + submission type | teacher | 1 |
| `teacher/assignment-history.spec.ts` | Assignment change history | teacher | 1 |
| `teacher/student-preferences.spec.ts` | Skill level + goals on student detail | teacher | 2 |
| `teacher/backfill-at-risk.spec.ts` | "Needs attention" at-risk dashboard card | teacher | 2 |
| `teacher/settings-persist.spec.ts` | Teacher settings persistence | teacher | 1 |
| `teacher/ai-history.spec.ts` | AI conversation history | teacher | 1 |
| `teacher/deleted-stub-routes.spec.ts` | Deleted routes render not-found | teacher | 3 |
| `settings/avatar-upload.spec.ts` | Avatar upload + validation | teacher | 2 |
| `mobile/mobile-responsiveness.spec.ts` | Mobile / tablet layout | teacher | 13 |
| `teacher-full-journey.spec.ts` | End-to-end teacher journey | teacher | 1 |

## Admin  (18 specs · 64 tests)

| Spec | Feature under test | User type | Tests |
|---|---|---|---:|
| `teacher/users-management.spec.ts` | Roster search / detail / edit profile | admin, teacher | 5 |
| `teacher/student-onboarding.spec.ts` | Create student, import songs, invite shadow | admin | 7 |
| `teacher/student-intake.spec.ts` | Intake: identity / contact / schedule / billing | admin | 1 |
| `teacher/fretboard.spec.ts` | Fretboard tool (scales, roots, playback) | admin | 12 |
| `admin/debug-dashboard.spec.ts` | Debug dashboard | admin, teacher | 2 |
| `admin/lockout-widget.spec.ts` | Account lockout admin widget | admin, teacher | 2 |
| `admin/system-logs.spec.ts` | System logs + who may read them | admin, student, teacher | 4 |
| `ai/ai-playground.spec.ts` | AI playground | admin | 6 |
| `ai/lesson-notes-ai.spec.ts` | AI lesson-note generation | admin | 5 |
| `ai/lesson-notes-form.spec.ts` | AI notes streamed into the lesson form | admin | 1 |
| `ai/assignment-ai.spec.ts` | AI assignment generation | admin | 4 |
| `ai/feedback.spec.ts` | AI feedback capture | admin | 1 |
| `notifications/inbox.spec.ts` | Notification inbox + mark read | admin | 4 |
| `notifications/prefs.spec.ts` | Notification preferences | admin, student | 2 |
| `settings/integrations.spec.ts` | Google integration connect/status | admin | 3 |
| `settings/api-keys.spec.ts` | API keys — admin creates; student refused | admin, student | 2 |
| `dashboard/topbar.spec.ts` | Topbar, user menu, role switcher | admin | 2 |
| `manual/kuba-onboarding.spec.ts` | One-off manual onboarding journey | admin | 1 |

## Student  (10 specs · 81 tests)

| Spec | Feature under test | User type | Tests |
|---|---|---|---:|
| `student/lessons-read.spec.ts` | Lesson list + detail, read-only | student | 5 |
| `student/songs-read.spec.ts` | Song library, read-only | student | 5 |
| `student/repertoire.spec.ts` | Personal repertoire + self-rating | student | 3 |
| `student/practice.spec.ts` | Practice logging | student | 5 |
| `student/practice-bpm.spec.ts` | BPM tracking | admin, student | 5 |
| `student/assignments-interact.spec.ts` | Checklist tick, progress %, persistence | student | 7 |
| `student/chord-quiz-srs.spec.ts` | Chord quiz + spaced repetition | admin, student | 6 |
| `onboarding/complete-flow.spec.ts` | Onboarding wizard (goals, skill, schedule) | student | 24 |
| `student-learning-journey.spec.ts` | Student learning journey | student | 20 |
| `student-full-journey.spec.ts` | End-to-end student journey | student | 1 |

## Cross-role, demo & unauthenticated  (12 specs · 104 tests)

| Spec | Feature under test | User type | Tests |
|---|---|---|---:|
| `cross-role/rls-data-isolation.spec.ts` | Student A cannot read student B (real JWTs, no UI) | anonymous | 11 |
| `cross-role/access-control.spec.ts` | Route + permission boundaries | student | 5 |
| `integration/workflows.spec.ts` | Cross-feature lifecycles (lesson/assignment/song) | admin, student | 12 |
| `dashboard/sidebar.spec.ts` | Per-role sidebar nav | student, teacher | 5 |
| `dashboard/states.spec.ts` | Dashboard renders for each role | anonymous | 3 |
| `auth/role-login.spec.ts` | All three roles can sign in | anonymous | 3 |
| `auth/sign-out.spec.ts` | Sign-out clears session | admin, student | 2 |
| `auth/sign-up-complete.spec.ts` | Registration, validation, email verification | anonymous | 39 |
| `demo/demo-mutation-guards.spec.ts` | Demo accounts are read-only | demo, teacher | 8 |
| `demo/demo-screenshots.spec.ts` | Demo screenshot capture | demo | 2 |
| `smoke/critical-path.spec.ts` | Critical path smoke | anonymous | 8 |
| `smoke/landing-page.spec.ts` | Public landing content + nav anchors | anonymous | 6 |

**Total: 297 tests across 61 specs.**

