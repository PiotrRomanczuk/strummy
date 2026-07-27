---
created: 2026-07-18
updated: 2026-07-27
domain: Chords, Theory & Fretboard
tables:
  [
    chord_quiz_attempts,
    chord_srs,
    theoretical_courses,
    theoretical_lessons,
    theoretical_course_access,
  ]
maturity: mixed
---

# Chords, Theory & Fretboard

## Purpose

Three self-service learning tools orbiting the core loop, all currently hidden from navigation:

1. **Chord quiz + SRS** — students identify chord diagrams; every answer feeds an SM-2 spaced
   repetition schedule per chord, so weak chords come back sooner.
2. **Theory LMS** — a mini course platform (courses → ordered lessons, publish flags, explicit
   per-student access grants) authored by the teacher.
3. **Fretboard explorer** — a pure client-side chord/scale visualizer with **no tables** (no
   persistence by design; documented here because it shares the domain).

## Data model

DDL: `supabase/baseline/cloud_schema_2026-06-22.sql`. `chord_srs` added by migration
`20260619200001_chord_srs.sql`.

| Table                       | Role                                                                                                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chord_quiz_attempts`       | Append-only answer log: `student_id`, `chord_id` (text key into the static `CHORD_SHAPES` library — **not** a DB FK), `selected_answer`, `is_correct`, optional `response_time_ms`.     |
| `chord_srs`                 | One row per (student, chord): SM-2 state — `repetitions`, `interval_days` (real), `ease_factor` (default 2.5), `next_review_at`, `last_reviewed_at`. "Due" ≡ `next_review_at <= now()`. |
| `theoretical_courses`       | Course shell: title/description/cover, `level`, `created_by`, `is_published` + `published_at`, `sort_order`, soft delete `deleted_at`.                                                  |
| `theoretical_lessons`       | Ordered content pages per course: `content` text (markdown-ish), `excerpt`, own `is_published`, `sort_order`, soft delete.                                                              |
| `theoretical_course_access` | Explicit grant: (course_id, user_id, granted_by, granted_at). A student sees a course only if **published AND granted**.                                                                |

## Behavior & rules

### Chord quiz session

`components/skills/ChordQuiz/` (`useChordQuiz`, question/results subcomponents,
`ChordDiagram`) runs a client-side session over the static chord-shape library, then submits the
whole session in one round-trip: `submitChordQuizSession` (`app/actions/chord-quiz.ts`) validates
via `ChordQuizSessionSchema`, inserts the attempt batch (student_id always from the session,
never the payload), and calls `updateChordSRSBatch`.

### SM-2 scheduling (`lib/music-theory/srs.ts`)

Simplified binary-quality SM-2: **incorrect** → repetitions reset to 0, interval 1 day, ease
−0.2 (floor 1.3); **correct** → interval 1 day, then 6, then `round(interval × ease)`;
repetitions +1, ease unchanged. New chords start due immediately (`newSRSCard`). Time is injected
(`nowMs`) for testability. `app/actions/chord-srs.ts` exposes `getChordsDueCount`,
`getDueChordIds` (≤30, soonest-due first), and the batch upsert.

### Review mode

The quiz page offers a **review toggle** when the student has due chords: review mode limits the
question set to the due chords (E2E C1.3–C1.5). There is no separate review surface, no due-count
nudge anywhere outside the quiz page itself (CHT-1).

### Theory LMS

`app/dashboard/theory/actions.ts` carries the full CRUD: courses and lessons
(create/update/delete with publish flags and sort order), plus `get/grant/revokeCourseAccess`.
Authoring components live in `components/theory/` (course form, lesson form, access manager,
chapter reader).

### Access (RLS)

- `chord_quiz_attempts` / `chord_srs`: students insert/read/update own rows; staff read all
  (`Staff read all SRS state`, staff attempts select). No delete policies — history is
  append-only.
- `theoretical_courses`: staff see all non-deleted (`tc_select_admin`/`tc_select_teacher`);
  students only `is_published AND deleted_at IS NULL AND` an access-grant row exists
  (`tc_select_student`). Insert staff-only; update/delete creator-or-admin. Lessons and access
  rows follow the same pattern (`tl_*`, `tca_*` — students read own grants).

### Fretboard

`components/fretboard/` (`useFretboardExplorer`, board/controls/info panel) — chord and
scale selection, transposition, all client-side. No writes, no reads, no RLS involvement.

## UI surfaces

| Surface                                                                           | Route                                                                             | State                                                                                                            |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Chord quiz (with SRS review toggle)                                               | `/dashboard/skills/chord-quiz` → `components/skills/ChordQuiz/`                   | routed + working, but **no nav link** (parent "Skills" item is nav-hidden and the hub page is a stub) — URL-only |
| Skills hub                                                                        | `/dashboard/skills`                                                               | **stub** ("Coming soon"); `skills` in `CORE_LOOP_HIDDEN_ITEMS`                                                   |
| Theory: course list, course detail, lesson reader, new/edit forms, access manager | `/dashboard/theory`, `/[courseId]`, `/[courseId]/[lessonId]`, `new`/`edit` routes | **nav-hidden** (`theory` hidden for both teacher and student menus) but fully routed                             |
| Fretboard explorer                                                                | `/dashboard/fretboard` → `components/fretboard/`                        | **nav-hidden** (`fretboard` under Tools)                                                                         |

## Gaps & planned work

Scope frame: the chord-quiz surfacing bundle (CHT-1 + CHT-2, with ASG-4 in doc 06) shipped
2026-07-22, ahead of the "wait for real usage data" gate — see [90-roadmap.md](90-roadmap.md)
§Tranche 3. THY-1 below remains genuinely blocked, on content authoring rather than on usage.

**Surfacing mechanism (grill 2026-07-22).** These three tools graduate out of `nav-hidden` by
attaching to the **teacher-driven loop**, not by floating as free self-study — a tool earns a nav
reveal only once a teacher can direct it and see its outcome. Results are captured **per-tool
capability**: chord quiz → real score + SRS state; theory → a read-receipt; fretboard → nothing
(stateless by design). The chord quiz was the first tool through this door — the only one both
ship-ready and result-producing — surfaced via **assignable chord drills** (ASG-4, doc 06) and
revealed in nav on 2026-07-22. The rule stands for the rest: theory waits on content authoring;
the fretboard has no result to weave, so it stays a self-study tool.

_Shipped 2026-07-22: CHT-1 (SRS due-count nudge on the skills hub) · CHT-2 (skills hub rebuilt; `skills` revealed in nav)._

### THY-1 · Theory LMS activation (v1.1)

Concept: decide whether the theory platform joins the student surface at all. Everything is
built (CRUD, publish flags, grants, reader) but nav-hidden with no real content. Before
unhiding: author at least one real course; test the student path (published + granted) end to
end; fix discoverability (grant flow lives on the course page, easy to forget → student sees
nothing). Open design questions: content format commitment (plain text/markdown in
`theoretical_lessons.content` — no renderer contract is documented); **no completion tracking
exists** (no read/progress table — is "read" state needed, or is theory reference material?);
per-lesson vs per-course publish semantics (both flags exist — the interaction is undocumented).

**Grill 2026-07-22:** theory surfaces through its **own `theoretical_course_access` grant model
plus a lightweight read-receipt** — that settles the "read state needed?" question (yes, a
receipt, not full progress tracking) — and explicitly **not** through the assignment system (ASG-4
is chord-only). Theory is **not** the first v1.1 slice: activation stays blocked on **content
authoring** (a content problem, not code), so it trails the chord-quiz slice.

### Theory's nav absence is deliberate — not a gap

Raised as a finding in the 2026-07-27 click-through audit ("`/dashboard/theory` and its whole route
family render for a teacher but nothing links to them"), then **closed on inspection**: `theory` is
listed in `CORE_LOOP_HIDDEN_ITEMS` in `components/navigation/menuConfig.ts`, commented "Built, but
no seeded course content yet". The hiding is intentional and already recorded in code, so there is
nothing to fix — noted here so the same observation isn't re-filed.

The one real tension worth remembering when THY-1 is picked up: the surface a teacher would use to
**author** the missing content is itself hidden pending that content. Whoever starts THY-1 should
un-hide it for teachers first (the student-facing reveal stays gated on THY-1 proper).

## Test plan

Journey catalog: `reference/E2E_JOURNEYS.md` §B8.5 (quiz attempt logged), §A11.1 (fretboard).

- **E2E (exist)**: `tests/e2e/student/chord-quiz-srs.spec.ts` — C1.1 quiz page loads (not Coming
  Soon), C1.2 answer + advance, C1.3 no review toggle without SRS state, C1.4 toggle appears when
  chords seeded due, C1.5 review limited to due count, C1.6 admin access.
- **E2E (missing)**: theory has **zero** E2E coverage (author→publish→grant→student-reads is the
  journey to add when THY-1 activates); fretboard render journey A11.1.
- **Unit**: `lib/music-theory/srs.ts` interval/ease math (time-injected — cover reset, 1→6→round
  progression, ease floor); `components/skills/ChordQuiz/chord-quiz.helpers.unit.test.ts`
  (exists).
- **Integration/RLS**: chord tables own-row vs staff-read policies; theory student visibility
  (unpublished-but-granted and published-but-ungranted must both yield zero rows).

## Open questions

- `chord_id` is an app-level string key into `CHORD_SHAPES` with no DB referent — renaming or
  removing a shape orphans SRS rows silently. Accept (document the key as append-only) or add a
  chords reference table someday?
- Attempts and SRS state are kept forever with no retention policy — fine at studio scale;
  revisit only if the quiz sees real use.
- Should fretboard/theory/skills remain URL-reachable while nav-hidden, or be access-gated until
  their v1.1 activation? (Current stance: reachable-but-hidden is acceptable because none of them
  can corrupt core-loop data.)

## References

- DDL: `supabase/baseline/cloud_schema_2026-06-22.sql`; migration
  `20260619200001_chord_srs.sql`
- Logic: `lib/music-theory/srs.ts` ·
  Actions: `app/actions/{chord-quiz,chord-srs}.ts`, `app/dashboard/theory/actions.ts`
- UI: `components/skills/ChordQuiz/`, `components/theory/`,
  `components/fretboard/`, routes under `app/dashboard/{skills,theory,fretboard}/`
- Nav gating: `components/navigation/menuConfig.ts` (`CORE_LOOP_HIDDEN_ITEMS`)
- Related: doc 04 (practice/BPM), doc 10 (admin chord-analysis stats), `reference/E2E_JOURNEYS.md`
