# Teacher & student production audit — Playwright walkthrough

**Date**: 2026-08-01
**Scope**: `https://strummy.online` (production), driven with Playwright as the two
dedicated production test accounts (`p.romanczuk+testteacher@` / `p.romanczuk+teststudent@`),
plus code tracing in the repo to establish root causes.
**Method**: every teacher-facing and student-facing route reachable from the nav,
plus direct URL probes for routes the nav hides, plus authenticated `fetch()` calls
to the API from inside the signed-in browser session.

---

## Headline

**One regression accounts for most of what is broken: the identity-model rebuild
split `profiles.id` from `auth.users.id`, and roughly a dozen call sites still pass
the auth id into a query that filters a profile-id column.** The fix was applied to
the teacher dashboard, the lessons list, repertoire and settings — each carries an
explanatory comment warning about exactly this — but the **assignments domain, the
AI hub, and every teacher-facing student picker were missed.**

The user-visible result, verified live:

- A teacher **cannot create an assignment at all** — the student dropdown is empty
  and, unlike the lesson form, there is no "new student by email" escape hatch.
- The **assignments list can never return a row** for anyone, teacher or student.
- **Both AI tools on `/dashboard/ai` are permanently disabled** — they gate on
  selecting a student, and the student list is always empty.
- **Lesson detail has no Edit affordance**, so lesson notes — the thing the product
  is sold on — can never be written through the UI. The edit page itself works if
  you type the URL.
- The **AI chat answers with a service error**, so the third AI surface is dead too.

That is the entire "teach — Strummy remembers" loop from the landing page: notes,
homework, and AI drafting. The read surfaces (dashboard, lessons list, songs,
students, repertoire) all work well, which is why this has stayed invisible.

---

## 1. The id-space regression (root cause)

`getUserWithRolesSSR()` deliberately returns **both** ids, and its own source
comments warn against confusing them:

```
lib/getUserWithRolesSSR.ts:17-20
    user: null,
    // Empty string, never `user.id`: a caller that filters a profile-id column
    // by an auth id gets zero rows rather than the wrong rows.
    profileId: '',
```

`app/dashboard/page.tsx:104-107` records the same lesson after it had already
caused an outage:

> `userId` is the auth id and `profileId` is profiles.id — they are different
> values since the identity-model rebuild. […] Passing the auth id to those matched
> zero rows and rendered a completely empty dashboard […] for a teacher who in fact
> had a full book of lessons.

### Call sites still passing the wrong id

| File:line                                              | Passes    | Column actually filtered                | User-visible consequence                                                          |
| ------------------------------------------------------ | --------- | --------------------------------------- | --------------------------------------------------------------------------------- |
| `app/dashboard/lessons/new/page.tsx:42`                | `user.id` | `teacher_students.teacher_id`           | Student dropdown empty on **Schedule a lesson**                                   |
| `app/dashboard/lessons/[id]/edit/page.tsx:51`          | `user.id` | same                                    | Cannot reassign a lesson's student                                                |
| `app/dashboard/assignments/new/page.tsx:24`            | `user.id` | same                                    | **Assignment cannot be created** — no escape hatch                                |
| `app/dashboard/assignments/[id]/edit/page.tsx:33`      | `user.id` | same                                    | Student field unusable on edit                                                    |
| `app/dashboard/assignments/page.tsx:48`                | `user.id` | same                                    | Student filter on the list is empty                                               |
| `app/dashboard/ai/page.tsx:24`                         | `user.id` | same                                    | **Both AI tools permanently disabled**                                            |
| `app/dashboard/assignments/page.tsx:47`                | `user.id` | `assignments.teacher_id` / `student_id` | **Assignments list always empty for everyone**                                    |
| `app/dashboard/assignments/[id]/page.tsx:27`           | `user.id` | `assignment.teacherId`                  | `canManage` always false — teacher can't act on their own assignment              |
| `app/dashboard/assignments/[id]/page.tsx:28`           | `user.id` | `assignment.studentId`                  | `isOwningStudent` always false — student can't act on their own homework          |
| `app/dashboard/assignments/[id]/edit/page.tsx:28`      | `user.id` | `assignment.teacherId`                  | Non-admin teacher is **always redirected away** from editing their own assignment |
| `app/dashboard/lessons/[id]/page.tsx:47`               | `user.id` | `lesson.teacherId`                      | `canEdit` always false — **no Edit button on lesson detail**                      |
| `app/dashboard/lessons/[id]/page.tsx:60`               | `user.id` | `lesson.studentId`                      | `viewerIsStudent` always false                                                    |
| `app/dashboard/assignments/templates/new/page.tsx:20`  | `user.id` | `teacherId` written to the row          | Templates saved with an auth id — unreadable by the profile-scoped list           |
| `app/dashboard/assignments/templates/[id]/page.tsx:31` | `user.id` | same                                    | same                                                                              |

The service layer itself is fine — `getStudentOptions`
(`lib/services/lesson-form-data.ts:36`) and `getAssignmentsList`
(`lib/services/assignments-queries.ts:92`) both correctly filter profile-id
columns. Only the page-level callers are wrong.

**Live confirmation.** As the teacher, `/dashboard/lessons` returned 29 lessons —
and that list _is_ scoped (`getRecentLessons` → `scopeColumn` →
`.eq('teacher_id', profileId)`, `lib/services/lessons-queries.ts:126,147`), and it
is called with `profileId`. So the teacher's profile genuinely owns those lessons
(`/api/lessons` shows `teacher_id: 31463c13-…` on every row). The same teacher's
student picker returns zero. Same data, same session, two different ids.

### A second, independent problem behind the picker

Even with the id fixed, the picker source is a chicken-and-egg:

```sql
-- supabase/migrations/00000000000000_baseline.sql:5631
CREATE VIEW public.teacher_students … AS
 SELECT DISTINCT teacher_id, student_id FROM public.lessons WHERE deleted_at IS NULL;
```

A student only becomes pickable **after** they already have a lesson with you. A
freshly invited student can never be given their first lesson or first assignment
through the normal path. The lesson form papers over this with "+ New student by
email…"; the assignment form has nothing.

---

## 2. Other confirmed defects

| #   | Severity | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Evidence                   |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| A   | High     | **AI chat is dead in production.** Sending a message returns "the AI service didn't return a response. This usually means the configured model is unavailable."                                                                                                                                                                                                                                                                                                                                                                                               | Live, `/dashboard/ai/chat` |
| B   | Medium   | **Hydration errors (React #418) on at least three pages** — AI chat, chord quiz, lesson edit. On AI chat the mismatch is the message timestamp ("10:11 AM"), i.e. the same locale/time class of bug the 2026-07-27 sweep fixed across 11 components; these were missed.                                                                                                                                                                                                                                                                                       | Console, live              |
| C   | Medium   | **Greeting derives a display name from the email local part** when the profile has no name — "Good morning, P.romanczuk+testteacher." — and the `<h1>` has `overflow-wrap: normal`, so on a 390 px viewport it forces the **whole page** to 486 px and the dashboard scrolls horizontally. Two bugs compounding; both hit every freshly invited user, whose profile names are null.                                                                                                                                                                           | Live + `getComputedStyle`  |
| D   | Medium   | **Lesson notes are unreachable.** Detail says "No notes captured from this lesson yet. Add them from the edit view" — and there is no link to the edit view (finding 1). `/…/edit` works if typed.                                                                                                                                                                                                                                                                                                                                                            | Live                       |
| E   | Medium   | **`/api/stats/weekly` has no role check** — it authenticates and then counts `lessons`, `profiles` and `songs` with no owner filter (`app/api/stats/weekly/route.ts:22-40`). RLS currently contains the damage (a student got `lessonsCompleted:0`, `newStudents:1` = their own row), so today only the shared song count leaks. It is a defence-in-depth hole, not yet a live breach — but it is one RLS change away from being one. `/api/students/pipeline` and `/api/students/needs-attention` are likewise reachable by a student (200, empty payloads). | Live `fetch` as student    |
| F   | Low      | **`/api/users` returns its payload under a `data` key**, which the project's own API rule forbids (`data.data.data`).                                                                                                                                                                                                                                                                                                                                                                                                                                         | Live                       |
| G   | Low      | **Landing page numbers are stale/wrong**: claims "110+ releases" (actual: 157), "3,200+ automated tests" (actual ~3,850), and the beta card says "v0.113 · Jul 2026" while the newest release is v0.163.0. `components/landing/Landing.Strips.tsx:84`, `Landing.BetaCard.tsx:62`.                                                                                                                                                                                                                                                                             | Repo + `gh release`        |
| H   | Low      | **The footer's only Legal link goes to `#`** (`components/landing/Landing.Footer.tsx:27`) and there is no privacy or terms route in `app/`. The vault already flags minors/GDPR as an open question for the 5 real students.                                                                                                                                                                                                                                                                                                                                  | Live + repo                |
| I   | Low      | **Song library hygiene**: the assignment form's song `<select>` renders all 393 songs and exposes the duplicates and junk — "Rumble — Link Wray" vs "Rumble — Link Wray His Ray Men", "Free Fallin"/"Free Fallin'", two "Smoke on the Water", "Apologize" twice under different artists, plus `Control Song 1774261460408 — Control Artist`, `UG tab 1863704`, `Alex G Runnner` (typo), several "— Unknown".                                                                                                                                                  | Live                       |
| J   | Low      | **The new-lesson form ships the entire 393-song library into the DOM unvirtualized** (the page snapshot is ~2,000 nodes). Fine at 393; not fine at 4,000.                                                                                                                                                                                                                                                                                                                                                                                                     | Live                       |
| K   | Low      | **`/dashboard/practice` is reachable by direct URL for a student** and renders a working log form, although PR #614 hid practice surfaces behind a flag and the nav no longer links it. The flag gates the nav, not the route.                                                                                                                                                                                                                                                                                                                                | Live                       |

---

## 3. What actually works well

Worth stating plainly, because the audit reads negative and the product does not
deserve that impression:

- **Teacher read surfaces are genuinely good.** The dashboard (day spine, week
  density, utilisation, roster, song of the week), the lessons list with status and
  year filters and per-date grouping, the lesson detail with its continuity rail
  ("#14 May 11", "#13 Apr 14"), the 393-song library with level/key/author filters,
  student detail with tabs — all fast, all correct, all attractive.
- **Song detail is the strongest screen in the app**: chord diagrams rendered per
  voicing, inline chord-over-lyric charts, and Ultimate Guitar / YouTube / Spotify
  links all resolving.
- **The student's "want to learn" flow works end to end.** I added _Wish You Were
  Here_ from song detail, saw it land on `/dashboard/repertoire` at stage "To
  learn" with a stage stepper and a notes affordance, and removed it again cleanly.
  (Test data left clean.)
- **RLS is holding on the student side.** A student sees 0 lessons, 0 assignments,
  an empty repertoire, only their own row from `/api/users`, and gets a 404 on
  another student's lesson URL. Teacher-only routes redirect to `/dashboard`.
- **Chord quiz works** for the student, including answer feedback.
- **The fretboard works** and is reachable by both roles.
- **Sign-out genuinely clears the session** (the 2026-07-27 bug has stayed fixed) —
  I round-tripped between the two accounts four times.
- **Mobile is fine everywhere except the dashboard `<h1>`** — the lessons list at
  390 px had zero overflow.

---

## 4. Student-experience notes (beyond bugs)

The student's product is currently **four nav items, three of which are empty by
design until a teacher acts**: My Lessons, My Assignments, My Repertoire, Song
Library. A newly invited student lands on a dashboard that says "No upcoming
lessons" and "No songs assigned yet" — and, because of finding 1, their teacher
cannot give them homework, so the assignments tab will stay empty indefinitely.

Two things the student _can_ do — the chord quiz and the fretboard — are **not in
the student nav at all**; they are only reachable if the student guesses the URL.
The landing page sells the fretboard as a headline feature. That is free value
sitting one nav entry away.

---

## 5. Suggested plan

Ordered by "what stops the product working", not by effort.

### Tranche 1 — unbreak the core loop (do this first, one PR)

1. **Fix the id-space call sites.** Replace `user.id` with `profileId` at the 14
   sites in the table above. Mechanical, low-risk, and it restores assignments, the
   AI hub, lesson editing and every student picker at once.
2. **Add a regression guard, not just a fix.** The comments already exist and were
   still not enough. Options, cheapest first: rename the destructured field at the
   call sites so `user.id` reads wrong; or a lint rule / architecture test asserting
   that `getStudentOptions`, `getAssignmentsList` and friends are never called with
   an expression named `user.id`. Ship the check with the fix — the repo's own
   `structure.md` rule S9 says a rule without a check is decoration.
3. **Break the `teacher_students` chicken-and-egg.** Decide whether "my students"
   means "people I have taught" (current, derived from lessons) or "people assigned
   to me" (a real relation). Until then, at minimum give the assignment form the
   same "+ New student by email…" escape hatch the lesson form has.
4. **Fix the AI chat model configuration** — this is the third time the AI surface
   has died in production on provider/model config. Whatever the fix, add a
   synthetic check that actually sends a prompt and asserts a non-error reply, so
   the next breakage arrives as an alert rather than as an audit finding.

### Tranche 2 — trust and polish before the 5 students land

5. **Fix the name fallback**: derive a display name from `first_name`/`last_name`,
   fall back to something human ("there") rather than the email local part, and add
   `overflow-wrap: anywhere` to the greeting `<h1>` so no name can break the layout.
6. **Kill the three hydration errors** (AI chat timestamp, chord quiz, lesson edit)
   using the same locale-pinning pattern already applied elsewhere.
7. **Guard `/api/stats/weekly`** with a teacher/admin role check, and decide the
   fate of `/api/students/pipeline` and `/api/students/needs-attention` — the vault
   already has a `wip/dead-route-purge` branch for exactly this that was never
   PR'd. Either land it or delete it.
8. **Surface the fretboard and chord quiz in the student nav.** Cheapest real value
   in the whole backlog: the features exist, work, and are advertised.

### Tranche 3 — housekeeping

9. **Landing page truth pass**: 157 releases, ~3,850 tests, current version. These
   are recruiter-facing numbers and being _under_-stated is a wasted asset.
10. **Ship a real beta-notice / privacy page.** The `#` link is the only Legal item
    on a public product page, and minors/GDPR is already an open flag.
11. **Song library cleanup**: dedupe the ~10 duplicate titles, delete the test junk
    rows (`Control Song …`, `UG tab 1863704`), fix `Alex G Runnner`.
12. **Virtualise or paginate the song pickers** before the library grows again.

---

## Open questions

- Why does the `+testteacher` account's profile own the owner's 29 imported
  lessons? Either the shadow-claim matched on invite email, or the calendar import
  attributes lessons to a single teacher profile regardless of account. Worth
  settling before a second teacher exists — it is the difference between "correct"
  and "every teacher sees every teacher's book".
- `lesson.teacherName` renders "—" on detail even though `teacher_id` is set;
  probably just a null `full_name` on the teacher profile (same root as finding C),
  but unconfirmed.
- Are there any assignment rows in production at all? The list is broken
  independently, so its emptiness proves nothing either way.
