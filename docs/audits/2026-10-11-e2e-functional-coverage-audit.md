# E2E functional coverage vs Claude Design mockups

**Date**: 2026-10-11
**Scope**: the 32 buildable Claude Design screens in `design-mockups/STATUS.md` (36 unique, minus 3 explorations and 1 unverified duplicate) × all specs under `tests/e2e/` on `main` (`a2556ff7`)
**Question**: do the E2E tests actually verify the key functions each mockup shows, and which edge cases are untested?
**Method**: 3 parallel read-only agents; each decoded the mockup bundles, read the live components to separate "not built" from "not tested", and read every spec in scope in full. Nothing was executed. "Likely broken" claims come from reading CSS/selectors, not from a run.
**Companion**: `2026-10-11-e2e-prod-safety-audit.md` (safety of running these specs on prod). Note that audit was done on `feature/enable-practice-features`, which is 107 commits behind `main`; this one is on `main`.

## Verdict legend

| Verdict   | Meaning                                                                               |
| --------- | ------------------------------------------------------------------------------------- |
| COVERED   | a deterministic assertion exercises the function                                      |
| PARTIAL   | the function is touched but the outcome is not asserted                               |
| VACUOUS   | a test exists but cannot fail (`if (count > 0)`, `>= 0`, stale selector, always-skip) |
| NONE      | built, no test                                                                        |
| NOT-BUILT | mockup feature with no code; excluded from scores                                     |

## Scores (0–5) — 32 screens

| Score | Screens                                                                                                                                             |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.5   | Fretboard Explorer · Auth Role Select · Onboarding Student · Landing Page                                                                           |
| 3.5   | Lesson Form                                                                                                                                         |
| 3     | Assignment Form · Song Detail · Auth Sign In · Notifications Mobile · Settings Integrations                                                         |
| 2     | Lesson List · Assignments: Student · Song Form A · Song Form Mobile · Student Form · Teacher Dashboard · Parent Dashboard                           |
| 1.5   | Lesson Detail · Admin Dashboard · Chord Quiz                                                                                                        |
| 1     | Lesson List Mobile · Lesson List: Student · Assignments: Teacher · Student Detail · Fretboard Mobile · Teacher Dashboard Mobile · Student Dashboard |
| 0.5   | Lesson Detail Mobile · Student Dashboard Mobile · Admin Dashboard Mobile · Onboarding Teacher                                                       |
| 0     | Auth Magic Link Sent (forgot-password "check your inbox")                                                                                           |

**Mean ≈ 1.9 / 5.** The pattern: create forms and navigation are covered; list/detail modules, dashboards, state transitions, error paths and everything mobile-specific are mostly not. Every mobile composition scores ≤ 1.

## Tests that exist but cannot fail (fix before adding anything)

| Spec                                                                                                        | What is wrong                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `student/assignments-interact` status tests                                                                 | look for `assignment-start-button` / `assignment-complete-button` testids that do not exist in `AssignmentStatusActions` → always `test.skip`; remaining asserts inside `if (count>0)`                                                                                                              |
| `student/assignments-interact` "filter by status"                                                           | student view has no select → always skips                                                                                                                                                                                                                                                           |
| `student/lessons-read` "only own lessons"                                                                   | opens the **detail** page then looks for list rows, finds 0, takes the else branch                                                                                                                                                                                                                  |
| `student/lessons-read` "no edit or delete"                                                                  | delete is an icon button with only `aria-label`; `button:has-text("Delete")` can never match                                                                                                                                                                                                        |
| `student/lessons-read` "songs section"                                                                      | text "songs in this lesson" no longer exists, inside an `if`                                                                                                                                                                                                                                        |
| `teacher/lesson-song-status` test 2                                                                         | changes status in the DB, asserts only the song title is still visible                                                                                                                                                                                                                              |
| `teacher-full-journey` Phase 1 / 3 / 13                                                                     | `data-tour="student-list"` and `a:has-text(title)` selectors never match (rows carry title in `aria-label`); cleanup testids `lesson-delete-button`, `delete-confirm-button` do not exist                                                                                                           |
| `integration/workflows` Multi-Entity, navigation, consistency                                               | expects `table` and text "Lesson Songs" — neither exists; `count >= 0`                                                                                                                                                                                                                              |
| `cross-role/access-control` C2                                                                              | asserts only that no `/error/i` text is visible; isolation never checked                                                                                                                                                                                                                            |
| `student-learning-journey`                                                                                  | "My Assignments" matched by the **sidebar**, not the page; detail/complete steps `if`-guarded; theme-toggle test has no assertion                                                                                                                                                                   |
| `student-full-journey` Phase 1                                                                              | every dashboard check `if (count>0)`                                                                                                                                                                                                                                                                |
| `teacher/assignments-crud` lifecycle, `users-management` A6.4                                               | hard-skipped with stale "Coming Soon" reason; the forms exist (`assignment-target-submission` proves the first, `UserEditForm` the second)                                                                                                                                                          |
| `teacher/backfill-at-risk` "drops out"                                                                      | filters rows by `hasText: 'last practiced'`; copy is now "No practice logged in N days" → `toHaveCount(0)` trivially true. Empty-state check computes risk per repertoire row, not per student → likely always skips. Header comment still says the detail at-risk visual "was never built" — it is |
| `mobile/mobile-responsiveness` day-spine test                                                               | `.ui-dayspine-lesson` is inside `hidden md:block` (`TeacherDashboard.tsx:100-114`) → can only pass on iPad Pro, fails on every phone project. 44px touch-target test only `console.warn`s. iPad tests fall back to `main` when `stats-grid` is missing (it is)                                      |
| `mobile/fretboard-mobile` tests 1, 5, 6; `student/fretboard` "learns a shape"; `cross-role/fretboard-roles` | PR #843 (`design-tokens.css:1620-1627`) hides `fb-info`, `.ui-fb-insights` and all `fb-controls` children except the key group below 768px while Controls is closed. Specs never open the toggle → `boundingBox` null / hidden select on phone projects. Tablets still pass                         |
| `student/songs-read`                                                                                        | "search" asserts `>= 0`; "resource links" inside `if`; "view detail" only checks an h1 exists                                                                                                                                                                                                       |
| `parent/dashboard` sidebar                                                                                  | checks for label "People", renamed "Students"                                                                                                                                                                                                                                                       |
| `teacher/song-edit-exhaustive` (untracked)                                                                  | fills ~13 fields, asserts only the title                                                                                                                                                                                                                                                            |

## Per-domain detail

### Lessons & assignments (agent report, 9 screens)

**Lesson Form (3.5)** — COVERED: student pills, duration, format, repeat-weekly (N rows 7 days apart). PARTIAL: date/time (saved time never asserted), songs grid (lesson_songs never checked on detail), notes/AI (saved notes not asserted), edit (title only). NONE: live preview, Cancel, all three validation errors (`errorChooseStudent`, `errorPickDateTime`, `errorRepeatNeedsStudent`).
Edge cases: submit with no student / no date; recurring with no student; past date; `?repeat=weekly` pre-check; recurring collision; PL labels.

**Lesson List (2)** — COVERED: row → panel, open full page, close; created lesson appears. PARTIAL: Newest/Oldest (URL only, order not asserted), status chips (via `?status=` URL, never clicked, counts unchecked), New lesson (390 only). NONE: year select, "Recurring…" button, column content, empty state, pagination (60/page).

**Lesson List Mobile (1)** — only the + button and student-hides-create. NONE: day-grouped cards, pill filters, card → page, desktop table hidden (regression guard for bug B2).

**Lesson List: Student (1)** — COVERED: no create controls. VACUOUS: own-lessons-only. NONE: teacher column shown, student empty state.

**Lesson Detail (1.5)** — COVERED: songs list shows title. PARTIAL: hero (title/30 min/Video call only), Edit (by URL not click), student read-only (Edit half real, Delete half blind). VACUOUS: stage stepper. NONE (UI): delete via trash+confirm (API only), breadcrumb, Recap email (completed only), History, + Add song, per-song notes/history, "Assign as homework", notes autosave, Assignments card + quick-assign-all, Continuity card.
Edge cases: stepper persists after reload; quick-assign-all twice → no duplicates; confirm dialog Cancel vs Confirm; Recap absent when SCHEDULED; student on another student's lesson URL → 404/redirect; 0 songs empty state.

**Lesson Detail Mobile (0.5)** — title visible only. NONE: back bar, edit icon (absent for student), date block, student card + health dot, read-only stepper, notes/assignments sections.

**Assignment Form (3)** — COVERED: student pick, daily target, submission type, template → title+checklist, AI brief. PARTIAL: task description, due date (never asserted), Send only. NONE: **multi-student → N rows** (the mockup's headline change), song/drill select, chord drill, live preview, validation, Edit (skipped).

**Assignments: Teacher (1)** — COVERED: header + New, detail History (3 entries). PARTIAL: created row visible. NONE: summary counts, Open/Completed/Cancelled tabs, row progress/due/status, **Quick-assign panel**, empty bucket.
Edge cases: completed moves to Completed tab; overdue pill + header count; quick-assign to 2 students; cancel → Cancelled tab.

**Assignments: Student (2)** — COVERED: no create controls, select card → `?selected=` pane, checklist tick + % persist, no edit/delete. PARTIAL: inbox rail heading only. VACUOUS: task card, **Start working / Mark complete / Hand it in**. NONE: practice log bars, chord chart, empty state.
Edge cases: not_started → in_progress → completed persists after reload; student cannot cancel; completed leaves active count; another student's `?selected=<id>` shows nothing.

### Songs, students, skills (agent report, 8 screens)

**Song Form A (2)** — COVERED: create → detail, edit title, capo stepper, category → tab, YouTube/UG links. PARTIAL: exhaustive edit (title only), cover URL (DB only). NONE: Spotify accelerator, **duplicate-song warning**, difficulty/key, chord chips, strumming, AI notes, image upload + error, Save draft, live preview, validation, Cancel.

**Song Form Mobile (2)** — COVERED: 4-step wizard create. NONE: Back/segments, Save draft, server error → step I, difficulty tabs. **Likely bug**: Next never validates; all required fields are on step I; empty title + Create on step IV hits native `required` on a hidden input → silently blocked. Untested.

**Song Detail (3)** — COVERED: Edit/Delete + confirm, Duplicate (+hidden for student), audio play/pause, Production tab (staff only), Resources, Want-to-learn, student read-only. PARTIAL: quick assign (one student; mockup has 3), metadata strip (list panel only), Chords/Lyrics tabs (aria only). NONE: speed/loop (testids exist, never clicked), waveform/seek, Usage/Currently learning/Related. NOT-BUILT: tablature, print, PDF.

**Student Form (2)** — COVERED: intake → profile (as admin), submit → redirect. PARTIAL: empty submit (URL unchanged only). NONE: instrument/start date/avatar colour/phone/day/duration/billing, preview, Cancel, **edit route** (stale skip). Edge cases: **teacher-only account adding a student** (spec notes it fails RLS, "flagged separately", untested); invalid/duplicate email; parent email for minors.

**Student Detail healthy/at-risk (1)** — COVERED: name, About line, Skills tab, import link. NONE: **stat tiles, at-risk banner/red Schedule/danger tiles**, Message/Schedule, practice chart, recent activity, next lesson, teacher note, Overview/Lessons/Repertoire/Practice tabs.
Edge cases: **threshold disagreement** — detail page flags at ≥14 days, dashboard card at ≥7, so a student is "at risk" on one surface and not the other between day 7 and 13; never-practised shows "—"; attendance exactly 70; another student's `/users/[id]`.

**Chord Quiz (1.5)** — COVERED: hub → quiz (3 roles), diagram + "1 of N" + 5 hearts, SRS Random/Review toggle + due limit. PARTIAL: answer → feedback (accepts either result). NONE: home stats (streak/XP/goal/due card), deterministic wrong answer → heart lost, keyboard 1–4/Enter, out-of-hearts end, **summary (+XP, streak, Play again)**, attempts/SRS persisted, **History page** (no spec opens the route).

**Fretboard Explorer (4.5)** — strong, deterministic coverage across 5 teacher specs + roles: keys, sharp/flat, scales, chord mode, intervals, hide non-scale, root highlight, tap-to-identify, info rail, diatonic chords, share URL, malformed URL fallback, CAGED, finishes, playback, a11y. NONE: **save preset** (RLS test only). NOT-BUILT: "Showing chords for <song>" chip.

**Fretboard Mobile (1)** — COVERED: neck scrolls, rotate hint, no overflow, tap. VACUOUS/STALE: rail order, full rail, CAGED cards (hidden until Controls opened, see table above). NONE: Controls/Done toggle (`aria-expanded`), key grid visible while closed.

### Dashboards, auth, shell (agent report, 15 screens)

**Teacher Dashboard (2)** — COVERED: at-risk practice flags (seeded, badge, link, drops out). PARTIAL: day spine (phone-only, broken). VACUOUS: greeting (h1 attached), roster (`data-tour` dead). NONE: overdue-assignment flags + "Reach out", week density/utilization, this-week-vs-last, song-library quick assign. NOT-BUILT: designed empty state ("No students yet", Getting started 2/5).
Edge cases: fresh teacher with 0 students/lessons; at-risk cap 5; 6 vs 7 days boundary; lesson at axis ends.

**Teacher Dashboard Mobile (1)** — COVERED: hamburger sheet opens, no overflow. NONE: `TeacherMobileTop` next-lesson hero, today timeline, attention top-3 — never asserted anywhere.

**Student Dashboard (1)** — PARTIAL: countdown hero (regex text only), repertoire card. VACUOUS: practice set, last-lesson recap, activity. NONE: week practice bars, Start practice → `/practice`, Reschedule mailto, streak/achievements, Song of the Week.

**Student Dashboard Mobile (0.5)** — h1 + no overflow only.

**Admin Dashboard (1.5)** — COVERED: locked accounts + Unlock. VACUOUS: greeting. NONE: platform pulse, churn/at-risk list, cohort health (1000-row paging fix has no regression test), live services, audit log, pending invites, AI strip. NOT-BUILT: Send report / Approve / Resend.
Edge cases: admin who is also teacher (default view → teacher); `?view=admin` as non-admin falls through; degraded services.

**Admin Dashboard Mobile (0.5)** — h1 + no overflow only.

**Parent Dashboard (2)** — COVERED (weak): "Checking in on" heading, redirect from `/users`. PARTIAL: stat chips, nav exclusions (stale "People"). NONE: child switcher `?child=`, practice week, upcoming lessons, latest note (no future-lesson leak — a fix from the fidelity pass, untested), billing stub. NOT-BUILT: messaging, invoices.
Edge cases: 0 linked children; 2+ children; `?child=` pointing at someone else's child **must not leak**; mobile width.

**Auth Sign In (3)** — COVERED: email+password per role, form on mobile, no Google/sign-up link, sign-out kills `sb-*` cookies, unauth `/dashboard` → `/sign-in` (loose). PARTIAL: demo button visible, never clicked. NONE: **wrong password FormAlert, locked account / rate-limit message, unconfirmed → Resend**, forgot-password link, `?demo=true` autofill, validation on blur. NOT-BUILT: return-to after expired session (always `router.push('/dashboard')`), magic link, Apple.

**Auth Role Select (4.5)** — fully covered as onboarding step 1 (tiles, Continue gating, Back preserves, mobile).

**Auth Magic Link Sent (0)** — built as forgot-password "Check your inbox"; nothing in `tests/e2e` references forgot-password, reset-password or accept-invitation. Edge cases: unknown email must not reveal existence; expired reset link (`ResetPasswordForm.LinkError`).

**Onboarding Student (4.5)** — COVERED: level/goals/guitars/target, gating, deselect → disabled, persist + Done (UI copy conditional), all redirects.

**Onboarding Teacher (0.5)** — only the "I teach guitar" tile visibility. NONE: about → studio (+live preview) → invite emails (parse count, bad email) → schedule → done; `is_teacher` persisted.

**Notifications Mobile (3)** — COVERED: feed with seeded rows, mark one (DB poll), mark all, prefs toggle round-trip, 390 overflow. NONE: filter chips All/Lessons/Practice/System, daily digest counts, load more (30/page), empty state, row click → target. NOT-BUILT in the Design shell: **bell unread badge** (only in legacy `NavigationShell`). Only the admin inbox is tested.

**Settings Integrations (3)** — COVERED: Google Calendar card state. PARTIAL: tab rail (via `?tab=` only), Connect (skips when already connected), student denial (API-keys only). NONE: Disconnect, Spotify card, OAuth error banner, `?tab=bogus` fallback, teacher (non-admin) sees the tab.

**Landing Page (4.5)** — COVERED: hero + CTAs, nav anchors, how-it-works/for-teachers/beta/final CTA, mobile collapse, PL locale, no console errors. NONE (low value): day-in-the-life, features, founder, footer.

**Cross-cutting shell** — role switcher tested only for its _absence_ on a single-role admin; a multi-role user switching `?view=` has no test. Top-bar search ⌘K, week chip, bell, New lesson: no coverage. Sidebar config/label parity and student exclusions: COVERED (parent not in the matrix).

## Top 12 uncovered functions (ranked by user impact)

1. **Student assignment status transitions** (Start working → Mark complete → Hand it in) — the core student loop; tests exist and always skip.
2. **Sign-in error paths** — wrong password, locked account, unconfirmed → resend. Lockout is only tested from the admin side.
3. **Student Detail at-risk state** and stat tiles — plus the 7-day vs 14-day threshold disagreement between dashboard and detail.
4. **Lesson Detail song stage stepper**, per-song "Assign as homework", quick-assign-all — the teaching-session surface.
5. **Teacher onboarding wizard** (5 steps, `is_teacher` persisted) — zero E2E.
6. **Multi-student assignment creation** and the teacher **Quick-assign panel** + Open/Completed/Cancelled tabs.
7. **Chord-quiz session end** — wrong answer → hearts → out-of-hearts → summary → attempts/SRS saved; History page.
8. **Lesson delete via UI** (trash + confirm) and a **real** student isolation test (another student's lesson absent from list and 404 on direct URL).
9. **Role switcher for multi-role users** and `?view=` resolution (the owner is admin+teacher).
10. **Mobile compositions** — `TeacherMobileTop`, `StudentDashboard.Mobile`, `AdminMobileTop`, lesson detail mobile, lesson list mobile cards: never asserted.
11. **Forgot-password → reset flow**, including the expired-link error and not revealing whether an email exists.
12. **Parent `?child=` isolation** (must not leak another family's child) and the latest-note no-future-leak fix.

## Suspected product bugs surfaced by the audit (verify, then test)

- Song Form Mobile: `Next` never validates; empty title + Create on step IV is silently blocked by native `required` on a hidden input.
- At-risk threshold: detail ≥14 days vs dashboard ≥7 days.
- `student-preferences.spec` asserts raw preference keys (`play_songs`) reach the teacher's About line — a UX bug locked in by a test.
- Bell has no unread badge in the Design shell (only in legacy `NavigationShell`).
- Sign-in has no return-to; expired session always lands on `/dashboard`.

## Recommended first batch (12 specs, ≤10 tests each per the E2E rule)

| #   | Spec                                                                       | Adds                                                                                                                                                      |
| --- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `student/assignments-interact.spec.ts`                                     | add `data-testid` to `AssignmentStatusActions`; drive not_started → in_progress → completed on the seeded row; assert DB + reload; drop `if` and skip     |
| 2   | `auth/sign-in-errors.spec.ts` (new)                                        | wrong password → FormAlert, stays on `/sign-in`; seeded `locked_until` → "temporarily locked"; authenticated user on `/sign-in` → redirect                |
| 3   | `teacher/student-detail-at-risk.spec.ts` (new)                             | seed 14 days → banner + danger tile; 13 days → none; never practised → "—". Fix `backfill-at-risk` `hasText`                                              |
| 4   | `teacher/lesson-song-status.spec.ts`                                       | click a stepper stage, reload, assert UI + `lesson_songs.status`; replace DB-only test                                                                    |
| 5   | `onboarding/complete-flow.spec.ts`                                         | "Teacher path" describe: 5 steps, one bad + one good invite email, `is_teacher` + redirect                                                                |
| 6   | `teacher/assignments-board.spec.ts` (new)                                  | quick-assign to 2 students → 2 rows on Open; complete one → `?tab=completed`; overdue pill + count                                                        |
| 7   | `student/chord-quiz-srs.spec.ts`                                           | known-wrong option → hearts 4 + answer revealed; 5 wrong → summary with XP; `/skills/history` renders the session                                         |
| 8   | `cross-role/access-control.spec.ts`                                        | seed another student's lesson → absent from list, direct URL 404/redirect (replaces C2 and lessons-read "only own")                                       |
| 9   | `teacher/lessons-crud.spec.ts`                                             | delete via trash: Cancel keeps, Confirm removes; submit with no student → `errorChooseStudent`                                                            |
| 10  | `dashboard/role-switcher.spec.ts` (new)                                    | seeded teacher+student sees switcher; `?view=student` renders student dashboard; `?view=admin` as non-admin falls back                                    |
| 11  | `mobile/mobile-responsiveness.spec.ts` + `mobile/fretboard-mobile.spec.ts` | replace the phone day-spine test with `TeacherMobileTop` asserts; open Controls before touching rail/info and assert hidden while closed                  |
| 12  | `teacher/songs-crud.spec.ts`                                               | wizard: empty title, Next×3, Create → lands on step I with error (will fail until the bug is fixed); exact title+artist duplicate shows "View existing →" |

Housekeeping in the same pass: un-skip or delete `assignments-crud` lifecycle and `users-management` A6.4; fix or delete the dead branches in `teacher-full-journey`, `integration/workflows`, `student-learning-journey`; fix parent "People" → "Students"; commit or delete `song-edit-exhaustive`; nothing under `tests/e2e` checks lessons/assignments/songs in PL.

## Follow-up (same day): fixed on `fix/e2e-audit-findings`

Report with screenshots: `docs/manual-tests/2026-10-11-e2e-audit-fixes.html`.

- **All five suspected product bugs confirmed and fixed**: song-wizard silent submit, practice-tier mismatch (shared `practiceTier()`), missing bell badge, ignored `?redirect=` (validated `postLoginPath()`), raw goal keys.
- **Found while fixing**:
  - The fretboard finish picker was unreachable on phones.
  - A stale notification-preferences load could overwrite a toggle.
  - The phone nav trigger was 36px.
  - Teacher and admin phone dashboards had no visible `h1`.
  - 1555 leaked `E2E Quick Assign Song` / `E2E Duplicate Source` rows sat on the dev stack (removed).
- **Every spec in "Tests that exist but cannot fail" is fixed or removed.** The three root journeys were deleted; their phases are covered by domain specs.
- **Not done** (new coverage, not bug fixes): items 2, 5, 6, 7, 9, 11 and 12 of the recommended batch, i.e. new specs for sign-in errors, the teacher onboarding wizard, the assignments board, chord-quiz end-of-session, the role switcher, forgot-password and parent `?child=` isolation.
- **Left as-is on purpose**:
  - `teacher/settings-persist` restores a constant name, which is documented in the spec.
  - `dashboard/states` stays a smoke test, which is documented.
  - The destructive dev-only seeders (`calendar-conflicts`, `chord-quiz-srs`, `student-preferences`, `song-detail-audio-player`) are now refused on prod by the service-role guard.
  - `song-edit-exhaustive.spec.ts` is still untracked and not ours to touch.
