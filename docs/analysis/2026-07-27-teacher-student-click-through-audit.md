# Teacher & student click-through audit

**Date**: 2026-07-27
**Author**: Claude Code (browser-driven audit)
**Scope**: Every teacher-reachable and student-reachable page, control and form in the dashboard,
exercised in a real browser against the local dev stack (`StudentDevelopment`, `localhost:3000`).
Teacher pass as `teacher@dev.local` (Sarah Mitchell, 97 lessons / 24 assignments / 134 songs);
student pass as `student@dev.local` (Emma Wright, 3 lessons / 8 assignments / 8 repertoire songs).
**Method**: click every control, submit every form, verify the result **in the database** rather
than trusting the UI. Test data created during the audit was reverted afterwards.

**Outcome**: 33 findings. **30 fixed** on `fix/teacher-audit-findings`, 3 closed on inspection as
not-defects. Final gates: `282 suites / 3646 tests` green, ESLint 0 errors, `tsc --noEmit` clean,
`npm run build` compiles all 92 routes.

Three passes: teacher + student (15 fixed, 13 filed as gaps), then draining those 13 (10 fixed,
3 closed, 2 new defects found), then **admin** — which turned up the worst bug of the audit:
sign-out never actually ended the session. The blueprint's Tranche 2 is empty.

---

## Fixed during the audit

Ordered by severity. Each is on `fix/teacher-audit-findings`; none are committed to `main`.

### 1. Lesson status filter matched nothing (blocker)

`/dashboard/lessons` chips read Scheduled 13 / Completed 45 / Cancelled 2; clicking any of them
returned **0 lessons** and collapsed every count to 0. `app/dashboard/lessons/page.tsx` lower-cases
the `?status=` param, `lib/services/lessons-queries.ts` passed it straight into
`.in('status', …)`, and the column stores upper-case (`SCHEDULED`). It never matched.

Fixed with a `toDbStatus` normaliser at the query boundary. Verified from both roles.

### 2. "Repeat weekly" silently discarded lesson data (blocker, data loss)

Creating a lesson with Duration 60 min + format + notes and "Repeat weekly" ticked produced four
rows with `duration_minutes = NULL`, `format = NULL`, no notes, and status forced to `SCHEDULED` —
while the live preview said "60 min". `useLessonFormSubmit` branched to `generateRecurringLessons`,
whose signature never accepted those fields.

Fixed by threading `durationMinutes` / `format` / `notes` / `status` through
`RecurringLessonInputSchema` → the action → the row insert. The non-recurring and edit paths were
verified to have always persisted these correctly, so the bug was isolated to the recurring branch.

### 3. Every AI feature was dead (blocker)

`lib/ai/model-mappings.ts` pinned seven models to OpenRouter `:free` slugs that OpenRouter has
retired: `AI_APICallError: This model is unavailable for free…` and `No :free endpoints available
for any resolved models`. `OPENROUTER_API_KEY` was set — a model-slug problem, not a missing key.

Fixed with a single `resolveOpenRouterModel()` normaliser applied at the four dispatch points
(fetch provider ×2, AI-SDK adapter ×3, `app/actions/ai/shared.ts`) rather than editing 42 string
literals. **This resolves to OpenRouter's paid tier** — the free endpoints no longer exist at all —
so it is opt-out via `OPENROUTER_ALLOW_PAID=false` for anyone who would rather see it fail loudly.

### 4. A student could mint a live API key (security)

Settings rendered the full API Keys section to students and creation succeeded. The POST handler
in `app/api/api-keys/route.ts` only checked _that a user was signed in_ — no role check. The Google
Calendar block directly above it is correctly gated on `isAdmin || isTeacher`.

Blast radius before fixing: only one route consumes API-key auth
(`/api/song/user-test-song`) and it scopes by `auth.user.id`, so this was **not** live privilege
escalation — but it handed a long-lived credential to a role with no use for one, and any future
route trusting `authenticateRequest` would inherit the gap. Fixed in the UI **and** with a
server-side guard; verified by bypassing the UI (`fetch('/api/api-keys', {method:'POST'})` as the
student now returns 403).

### 5. Sign-out silently did nothing (all roles)

Clicking "Sign out" left the user signed in on the dashboard — no error, no redirect.
`supabase.auth.signOut()` serialises on `navigator.locks` and can hang forever; both call sites
`await`ed it with no timeout, so the redirect after it never ran. The `try/catch` on the Topbar
path did not help, because a hang is not a throw. The sign-in page already races `getUser()`
against a 3s timeout for exactly this reason.

Fixed with a shared `lib/auth/sign-out.ts` (`signOutAndRedirect`) that races the call against a
timeout and redirects regardless.

### 6. AI Chat failed completely silently

Sending a message produced an assistant bubble with **no text and no error**, and the empty
conversation was persisted. Fixed: `onError` now renders a visible error instead of deleting the
bubble, an empty-stream guard catches server-side failures that yield zero chunks, and error
messages render in the destructive style with feedback buttons suppressed.

### 7. Student saw their own name as the lesson counterparty

Lesson detail as Emma read "with **Emma Wright**", "Lesson #1 with **Emma**", "With **Emma**" —
her own name, about her own lesson. The "with X" label was derived from `lesson.studentName`
unconditionally, which is only correct for a teacher viewer. Fixed with a `viewerIsStudent` prop
and a viewer-relative counterpart; props renamed `counterpartDisplay` / `counterpartFirstName` so
the distinction cannot quietly collapse again.

### 8. Teacher could start an assigned chord drill but never save it

The drill CTA was gated on `canAct` ("owning student **or manager**"), but
`student_complete_chord_drill` requires `assignment.student_id = current_profile_id()`. A teacher
could sit through the whole quiz and hit a red "Not authorized to update this assignment" at the
end. Fixed by gating on `isStudentSubmitter`. Verified from both sides: the teacher no longer sees
the CTA, the student still does and the save succeeds.

### 9–15. Smaller fixes

| #   | Finding                                                                                                | Fix                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 9   | Filter chip counts derived from the truncated, filtered result set — every inactive chip read 0        | New `getLessonsBreakdown()` (unfiltered, uncapped); header now reads "97 lessons · showing newest 60" instead of a bare, wrong "60 lessons" |
| 10  | "Schedule post" accepted a completely empty form and created a dateless, contentless row               | Date + at least one of hook/caption/URL now required; submit disabled with an inline error                                                  |
| 11  | Homework "+ Add" from a lesson dropped the lesson's student                                            | `?studentId=` prefill, validated server-side against the teacher's own student list                                                         |
| 12  | Edit-lesson section badge read an impossible "4/3"                                                     | `populated` no longer counts the student field in edit mode, where it isn't editable                                                        |
| 13  | "No recordings yet — upload one above" (no upload control exists)                                      | Copy corrected                                                                                                                              |
| 14  | "No hashtag sets yet — create some in Content → Hashtags" (no such screen exists)                      | Copy corrected                                                                                                                              |
| 15  | Dev quick-login buttons were broken — the committed `DevTest123!` constant had drifted from the dev DB | Dev DB realigned to the committed constant                                                                                                  |

---

## Second pass — the 13 gaps, drained

Every gap the first pass filed was then worked. Ten were fixed and verified in the browser; three
turned out not to be defects.

### Fixed

| Was                                                       | Outcome                                                                                                                                                                                                |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| LES-4 · lessons list capped at 60, older rows unreachable | `?page=` paging via `.range()`, with a "Page X of Y" pager that preserves the active filters. Verified: page 2 reaches March/April 2026 lessons, header shows the true total (113)                     |
| LES-5 · "Schedule lesson" dropped the student             | `?studentId=` prefill, validated server-side against the teacher's own student list                                                                                                                    |
| PRA-4 · `999d` sentinel on the dashboard                  | `daysSincePractice` is now `number \| null`; renders "never" / "no practice logged yet" and still sorts worst-first                                                                                    |
| ASG-5 · teacher-voice copy shown to students              | "needs a nudge" → "worth catching up on"; the "for <own name>" attribution dropped for the student; the hand-in instruction disappears once the work is terminal                                       |
| NOT-4 · inbox unreachable                                 | `NOTIFICATION_ITEM` was exported from `menuConfig` and **mounted nowhere**. Added to the sidebar for both roles                                                                                        |
| AIA-3 · nested `<button>` in the chat list                | Flattened to siblings — invalid HTML and a hydration error on every chat load                                                                                                                          |
| AIA-4 · two nav items active; chips clipped               | Active-state now defers to the most specific sibling path (fixes the whole class, not just AI); chips wrap instead of scrolling behind a hidden scrollbar                                              |
| SNG-6 · "My Songs" showed the whole library               | Renamed to "Song Library" — the smallest honest option; the student's own songs remain under "My Repertoire"                                                                                           |
| UIX-1 · SSR `Select`s painted empty                       | Triggers render their label explicitly. A `placeholder` alone does **not** fix this — Radix skips the placeholder when a value is set, then can't resolve the label until `SelectContent` first mounts |
| UIX-2 · highlighted option rendered red                   | `--accent` was a saturated crimson in a wholly gold palette; it backs `focus:bg-accent` on every Select/DropdownMenu item. Retuned to a subtle gold surface, light and dark                            |

### Closed on inspection — not defects

- **NOT-5** ("Enable All" off while every child toggle is on). Checked the data: two preferences in
  other categories (`teacher_daily_summary`, `weekly_progress_digest`) genuinely were off, and the
  switch spans all 17. The control was correct; only one category is ever on screen, which is what
  made it look contradictory. Added a "15 of 17 on" count so it can't be misread again.
- **ADM-4** (API-keys table forces the page to scroll horizontally). Measured in the browser: the
  table scrolls inside its own `overflow-x: auto` container (715px content, 622px wrapper) and the
  document does not scroll horizontally at all. The original observation was a mis-read.
- **THY-2** (theory built but unreachable). `theory` is in `CORE_LOOP_HIDDEN_ITEMS`, deliberately,
  commented "Built, but no seeded course content yet". Recorded in
  [05](../app-blueprint/05-chords-theory.md) so it isn't re-filed.

### Found during the second pass

- **AI was still dead after the `:free` fix** — for a different reason. The chat path set no
  `max_tokens`, so OpenRouter reserved the model's 65536-token maximum and refused the request
  ("requires more credits, or fewer max_tokens… can only afford 7466"). Capped at 2048.
  **AI now answers end-to-end**, verified in the browser.
- **Locale-dependent date rendering** threw a React hydration error on every repertoire card
  (server `14.07.2026` vs browser `14/07/2026`). Pinned to an explicit locale across 11 components.

## Filed as blueprint gaps (first pass — all since drained)

Fourteen findings were left unfixed because they are naming, copy, layout or scope decisions the
owner should make, or because they are larger than a bug fix. Briefs live in the owning domain docs
and are ordered in [90-roadmap.md](../app-blueprint/90-roadmap.md).

| ID                                                  | Finding                                                           |
| --------------------------------------------------- | ----------------------------------------------------------------- |
| [LES-4](../app-blueprint/02-lessons-calendar.md)    | Lessons list silently caps at 60 rows with no pagination          |
| [LES-5](../app-blueprint/02-lessons-calendar.md)    | "Schedule lesson" from a student's page drops the student         |
| [PRA-4](../app-blueprint/04-practice-progress.md)   | `999d` / `—` practice sentinels leak into the dashboard           |
| [THY-2](../app-blueprint/05-chords-theory.md)       | Theory courses are fully built but have no nav entry              |
| [SNG-6](../app-blueprint/03-songs-repertoire.md)    | "My Songs" shows a student the whole studio library               |
| [ASG-5](../app-blueprint/06-assignments.md)         | Teacher-voice copy on student-facing assignment surfaces          |
| [NOT-4](../app-blueprint/07-notifications-email.md) | `/dashboard/notifications` has no nav entry                       |
| [NOT-5](../app-blueprint/07-notifications-email.md) | "Enable All" reads off while every child toggle is on             |
| [AIA-3](../app-blueprint/08-ai-assistant.md)        | Nested `<button>` in the chat conversation list (hydration error) |
| [AIA-4](../app-blueprint/08-ai-assistant.md)        | Both AI nav items highlight; quick-prompt chips clip off-screen   |
| [ADM-4](../app-blueprint/10-admin-observability.md) | API-keys table forces the whole page to scroll horizontally       |
| [UIX-1](../app-blueprint/reference/UI_STANDARDS.md) | Server-rendered shadcn `Select`s paint empty until hydration      |
| [UIX-2](../app-blueprint/reference/UI_STANDARDS.md) | Highlighted `Select` option renders in destructive red            |

---

## Third pass — admin role

The first two passes covered teacher and student. Admin was audited afterwards, plus a production
build as a whole-app regression check.

### Sign-out never actually signed anyone out (critical)

The single most serious defect found in the whole audit, and it was only caught because the earlier
"fix" was tested on the wrong layer.

The session is an `sb-<ref>-auth-token` **cookie** written by the SSR client — `localStorage` holds
no `sb-*` keys at all. `supabase.auth.signOut()` in the browser clears localStorage and leaves that
cookie untouched, so middleware kept seeing a valid session and redirected straight back to the
dashboard. **On a shared machine the next person was still signed in.**

The earlier timeout-guard fix (pass 1) made the button _appear_ to work in dev — it redirected —
but the session survived; that was the redirect racing the middleware, not a real sign-out.

Replaced with a route handler at `app/auth/signout/route.ts`: a plain navigation that signs out
server-side and 303s to `/sign-in`, with the cleared cookie on the response. Both call sites (sidebar
footer, topbar menu) are now `<a href="/auth/signout">`. Deliberately **not** a client call — a
navigation cannot silently no-op the way the floating promise did (it failed with no redirect, no
error, and no log), and it still works with JS broken.
Verified: after clicking, `document.cookie` has no `sb-*` entries and `/dashboard` redirects to
`/sign-in?redirect=/dashboard`.

### The DB badge lied about which database you're on

The admin topbar badge read **"Local DB · localhost:54321"** while the app was connected to
`192.168.1.75:55321`. The host string was **hardcoded** in `components/debug/DatabaseStatus.tsx`
(`'localhost:54321'` when local, `'supabase.co'` otherwise) — it never reflected the real target.

That is the one piece of UI telling an operator which database they are about to act on, and per
`CLAUDE.md` port **54321 on this setup is StudentProduction**. So the badge named the production
port while pointed at dev. Now sourced from `useDbConnection()`, which already resolves the real
host (and honours the `sb-provider-preference` cookie). Verified: reads `192.168.1.75:55321`.

### Checked and fine

- Admin dashboard: real platform stats (700 users / 354 students / 322 teachers / 134 songs /
  452 lessons) and pending invites. The At-risk / Cohort insights / Audit log / Services cards are
  explicit `ComingSoonBody` placeholders, not broken queries.
- Admin data scope: lessons list shows all 452 across every teacher, with the admin-only Teacher
  column and eyebrow "All lessons".
- **Pagination at scale**: "Page 1 of 8" for 452 lessons; page 8 renders exactly 32 rows
  (452 − 7×60), the correct boundary.
- Admin nav matches teacher by design; the admin-only routes (cohorts, logs, health, stats/\*) are
  in `CORE_LOOP_HIDDEN_ITEMS`.

### Two committed sources disagreed on the dev credentials — and "fixing" it broke E2E

`components/auth/DevQuickLogin.tsx` carried a single shared `DevTest123!`; `tests/fixtures/auth.fixture.ts`
and `playwright.config.ts` carry **per-role** `test123_admin` / `test123_teacher` / `test123_student`.
The dev DB matched the test fixtures.

In pass 1 the quick-login buttons appeared dead, so the DB was changed to match `DevQuickLogin.tsx` —
which **silently broke the entire E2E auth suite**, and went unnoticed because Playwright is not part
of `npm test` and was never run. The single shared password had in fact never matched any of the three
accounts, so quick-login could not have worked from that constant either.

Resolved the other way round: DB restored to `test123_*`, and `DevQuickLogin.tsx` now carries the same
per-role credentials with a comment naming the fixtures as authoritative. One source of truth.
Verified: `tests/e2e/auth/` → **40 passed**.

**Correction**: quick-login was repeatedly reported in this audit as broken. It is **not** — the
buttons work (a programmatic click fills the form and signs in). The synthetic clicks used during the
audit were missing the target. Only the credentials conflict was real.

### Sign-out coverage already existed — it was just red and out of the gate

`tests/e2e/auth/sign-out.spec.ts` already asserted the admin case correctly ("after sign-out,
`/dashboard` redirects to `/sign-in`") — that test _would_ have caught the sign-out bug. It was failing
for the credentials reason above, and Playwright isn't in `npm test`, so nothing surfaced it.

The student case only checked the post-click URL, which is precisely the weak assertion that produced
the false green. Strengthened to match the admin case **plus** an explicit assertion that no `sb-*`
cookie survives. Both pass.

**Worth acting on**: `npm test` (Jest) is not a sufficient gate on its own. The E2E suite catches a
class of defect — real session/auth behaviour — that unit tests structurally cannot.

### Whole-app regression check

`npm run build` compiles and generates **all 92 routes** with no errors — a stronger signal than
spot-checking pages in dev, and it covers every route touched by the ~80 changed files.

## Investigated and cleared (not bugs)

Worth recording so they are not re-investigated.

- **Landing page "broken"** — a stale `Module not found: LandingEditorial` error in the dev log was
  from an earlier session. `app/page.tsx` imports `components/landing/LandingPage.tsx`, which
  exists; `GET /` returns 200.
- **Practice Log "0 minutes logged" vs Repertoire "889m practiced"** — seed-data artifact, not a
  logic error. `student_repertoire.total_practice_minutes` was seeded without matching
  `practice_sessions` rows. The write path is correct: logging a 30 min session moved Wonderwall
  64 → 94 with `practice_session_count` 0 → 1, and Remove rolled it back to exactly 64 / 0.
- **Assignment-form preview showing "—" for the title** — by design; the preview previews the
  _song_, not the title.
- **Student assignment "Reach out" doing nothing** — it is a `mailto:` link; correct behaviour.
- **Practice form rejecting a valid duration** — auditor mis-click, not a defect. Presets, custom
  duration, 1–480 validation, notes, BPM and History all work.

## Not tested (deliberately)

- **"Connect Google Calendar"** — initiates an OAuth grant against the owner's real Google account.
  Needs the owner to drive it.

## Environment issues surfaced (not product defects)

- The dev DB carries RLS test-suite residue: ~30 `RLS fixture / content-tables / practice-undo`
  songs appear in every song picker and in the Songs list, plus many `rls-admin-*` / `rls-teacher-*`
  profiles. Worth a cleanup pass before the DB is used for any demo.
- `.next` had grown to **8.4 GB** and filled the disk mid-audit, which broke writes until it was
  cleared. Worth periodic pruning.

## References

- Teacher-pass raw log: session scratchpad `findings.md`
- Student-pass raw log: session scratchpad `findings-student.md`
- Previous UX pass: [2026-07-20-ux-frontend-audit.md](2026-07-20-ux-frontend-audit.md)
