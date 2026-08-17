---
created: 2026-08-15
updated: 2026-08-15
domain: Skills & Assessment
tables: [skills, student_skills]
maturity: partial
---

# Skills & Assessment

## Purpose

The teacher's **curriculum checklist**: a catalog of guitar skills, ordered into a
lesson-by-lesson roadmap, against which the teacher records where each student stands. It answers
"what has this student actually learned, and what comes next" — a question neither lessons (what
happened when) nor repertoire (which songs) nor assignments (what homework) can answer on their
own.

Two tables, one surface: the **Skills tab** on a student's detail page. The teacher sets a status
per skill; the roadmap groups skills into numbered lessons with progress bars so the next lesson
plans itself.

> **Naming collision — read this first.** `/dashboard/skills` is **not** this domain. That route
> is the chord-quiz / SRS practice hub, owned by [05-chords-theory.md](05-chords-theory.md), and
> it never reads `student_skills`. This domain has no route of its own; it lives as a tab under
> `/dashboard/users/[id]`. The teacher nav item labelled "Skills" points at the _other_ thing
> (see SKL-2).

**Maturity: partial — the teacher half ships, the student half does not.** Assessments are read
by the AI layer and drive real prompts, but a student cannot reach their own assessment from
anywhere in the UI, and cannot contribute to it at all.

## Data model

`skills` is reference data (no student reference); `student_skills` is the per-student
assessment. Original DDL: `supabase/migrations_archive/20251217000000_create_skills_tracking_tables.sql`;
current authoritative definition in `supabase/migrations/00000000000000_baseline.sql`
(table `:5390`, policies `:9794–9913`).

| Table            | Role                                                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `skills`         | Catalog: `name` (unique), `category`, `description`, `level`, `lesson_group`. Reference data — changed only by migration.                                                            |
| `student_skills` | Assessment: `student_id → profiles.id`, `skill_id → skills.id`, `status`, `notes`, `last_assessed_at`, `UNIQUE(student_id, skill_id)`. A row exists only once a status has been set. |

No Postgres enums — both vocabularies are `text` + CHECK, mirrored in TypeScript at
`types/StudentSkills.ts` (which lives outside the `'use server'` action file on purpose: a
`'use server'` module may only export async functions).

- `status` ∈ `developing · progressing · proficient · mastered` (`student_skills_status_check`).
  Widened from the original `todo | in_progress | mastered` by `20260805110000`, which also
  backfilled existing rows. The vocabulary deliberately matches the language
  `lib/ai/agents/post-lesson-summary.ts` already used in its prompt, so teacher-entered and
  AI-suggested assessments speak one language.
- `level` ∈ `beginner · intermediate · advanced` (`skills_level_check`).
- `lesson_group` — positive integer or null; the lesson number in that level's roadmap.

`student_skills` is an **assessment** table, not a membership list — every student is implicitly
measured against the whole catalog, and `20260805120000` adds table comments saying exactly that
so the point is not re-litigated.

### Catalog evolution

The catalog is curriculum content, so it is versioned as migrations rather than edited in-app:

| Migration                                             | What                                                                          |
| ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| `20260805110000_skills_levels_and_seed.sql`           | Status vocabulary widened + backfilled; `level` added; unique(name); 18 seeds |
| `20260805120000_skills_table_comments.sql`            | Table comments only — documents the assessment semantics                      |
| `20260806090000_skills_catalog_expansion.sql`         | +54 skills across 10 categories                                               |
| `20260811090000_skills_level_and_curriculum_gaps.sql` | `level` assigned to every skill; 4 curriculum gap-fillers                     |
| `20260814120000_reclassify_skills_to_beginner.sql`    | 5 skills moved intermediate → beginner                                        |
| `20260814130000_skills_lesson_roadmap.sql`            | `lesson_group` added; beginner mapped to 11 lessons, intermediate to 16       |

Roughly 76 catalog rows across 10 categories (Chords, Technique, Rhythm, Theory, Ear Training,
Reading, Repertoire, Improvisation, Performance, Gear & Setup). Every seed uses
`on conflict (name) do nothing`, so re-running is safe.

Unrelated despite the name: `profiles.skill_level` is an onboarding self-report
(`20260727120000`), owned by [01-identity-access.md](01-identity-access.md). Different concept.

### RLS

| Table            | Policy                                                                                                                                                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `skills`         | `Everyone can view skills` (SELECT, `true`) · `Admins and teachers can manage skills` (ALL)                                                                                                                                                         |
| `student_skills` | `Admins and teachers can manage student skills` (ALL, `is_admin_or_teacher()`) · `Admins and teachers can view all student skills` (SELECT) · `Students can view their own skills` (SELECT `TO authenticated`, `student_id = current_profile_id()`) |

**Students hold a SELECT grant and nothing else.** There is no student UPDATE policy and no
`SECURITY DEFINER` RPC — this is the only teacher↔student artifact in the app with no student
write path of any kind (see [Comparison](#comparison-with-the-house-pattern)).

## Behavior & rules

### The only mutation

`upsertStudentSkill(studentId, skillId, status, notes?)` in `app/actions/student-skills.ts:51`
— the entire write surface of the domain. There are no REST routes (`app/api/skills` does not
exist), no delete action and no bulk assign.

1. Zod-validates against `UpsertStudentSkillInputSchema` (`schemas/StudentSkillSchema.ts`;
   `notes` capped at 1000 chars).
2. `guardTestAccountMutation` — demo accounts are blocked.
3. Hard role gate: `if (!user || (!isTeacher && !isAdmin)) return { error: 'Unauthorized…' }`.
4. Selects an existing `(student_id, skill_id)` row, then updates or inserts; either way stamps
   `last_assessed_at = now()`.
5. `revalidatePath('/dashboard/users/${studentId}')`.

Reads: `getSkills()` (catalog, ordered level → lesson_group → category → name) and
`getStudentSkills(studentId)` (`student_skills` joined to `skills`). Both swallow errors and
return `[]` after logging — a fetch failure renders an empty checklist rather than an error state.

### Assignment and assessment are the same act

There is no "assign this skill to this student" step. Every student is shown the entire catalog
for the selected level, and a `student_skills` row is created lazily the first time the teacher
picks a status. Skills with no assessment render as `not started` from a **missing row**, not a
stored value.

### Roadmap grouping and progress

`components/users/student-detail-skills.helpers.ts`:

- `groupSkillsByLesson` — buckets by `lesson_group` ascending, then appends one catch-all bucket
  for ungrouped skills (the whole `advanced` tier today). The catch-all renders last with no
  lesson header, so it looks exactly like the pre-roadmap flat list — no separate code path.
- `LESSON_MILESTONES` — `{beginner: [11], intermediate: [16], advanced: []}`. A plain constant,
  not a schema column, so retuning the curriculum needs no migration. The last mapped lesson in
  each level is a recap / performance checkpoint and renders a "Milestone" pill.
- `lessonProgress` — **two definitions of progress on purpose.** The text count is
  `mastered`-only, matching the level-tab label (`countMastered`) so a teacher never reads two
  different numbers on one screen. The bar's fill additionally gives `proficient` half credit —
  a visual-only affordance showing a lesson is coming along before everything in it is mastered.

### Client refresh

`StudentDetail.Skills.tsx` calls `router.refresh()` after a successful write. `revalidatePath`
inside the action invalidates the server cache but does not re-render an already-mounted client
component, and `studentSkills` is a static prop from the initial load — without the refresh a
save reached the DB but never appeared until a manual reload. There is no realtime subscription
and no optimistic update; a single `isUpdating` flag disables every select at once.

### Consumption by the AI layer

Assessments are not decorative — they feed prompts:

- `fetchStudentSkillProfile` (`lib/ai/registry/context-fetcher.ts:430`) joins `student_skills`
  to the catalog and formats it as a per-category narrative (`name (status)`), exposed as the
  `studentSkillProfile` context key.
- Consumed by the `assignment` agent (`lib/ai/agents/assignment.ts:77`) and
  `post-lesson-summary`, both of which declare `skills` / `student_skills` in `dataAccess`
  with `permissions: ['read']`.

The AI **reads** the profile and never writes a status back.

## UI surfaces

| Surface                         | Route / component                                           | Maturity                                                              |
| ------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------- |
| Skills tab (teacher assessment) | `/dashboard/users/[id]` → `StudentDetail.Skills.tsx`        | mounted — reachable only from a student profile, no nav entry         |
| Skills tab (student, read-only) | same route, `canEdit=false`                                 | **built, effectively unreachable** — no nav link for students (SKL-1) |
| Catalog CRUD                    | —                                                           | unbuilt by design; migrations own the catalog                         |
| Skill `notes`                   | — (column + action param exist, no UI writes or reads them) | unbuilt (SKL-3)                                                       |

Component tree, all under `components/users/`:

- `StudentDetail.Skills.tsx` — level tabs (`beginner`/`intermediate`/`advanced`) with a
  `mastered/total` count per tab; owns `activeLevel`, `isUpdating`, `error`
- `StudentDetail.Skills.Level.tsx` — groups the active level into lessons
- `StudentDetail.Skills.Lesson.tsx` — lesson header, "Milestone" pill, progress bar
- `StudentDetail.Skills.Row.tsx` — the one interactive control: `canEdit ? <StatusSelect> : <StatusBadge>`
- `student-detail-skills.helpers.ts` — grouping, milestones, progress

Page wiring: `app/dashboard/users/[id]/page.tsx` fetches `getStudentSkills(id)` + `getSkills()`
in its `Promise.all` and passes `canEdit={isAdmin || isTeacher}`. The page itself only redirects
when unauthenticated — row visibility is left to RLS, per ADR-0001.

i18n keys: `messages/en.json` (`detailSkills*`, `skillStatus*`, `skillLevel*`, `skillsLesson*`,
`skillsProgressCount`).

**Interaction inventory**: one native `<select>` per row, four options, fires on change. No
form, no submit, no save/cancel, no optimistic UI, no checkboxes, sliders, drag/drop or bulk
actions anywhere in the domain.

## Comparison with the house pattern

Every other teacher↔student artifact gives the student _some_ write. This domain is the outlier,
which is what makes SKL-4 a real design question rather than a feature request:

| Artifact                  | Teacher-owned                                 | Student-writable                                                                                            |
| ------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `assignments` (06)        | full CRUD                                     | 3 RPCs: `student_update_assignment_status`, `student_toggle_checklist_item`, `student_complete_chord_drill` |
| `student_repertoire` (03) | `current_status`, `teacher_notes`, `priority` | own columns `self_rating` + `student_notes`; RPCs `add_/remove_song_from_my_repertoire`                     |
| `practice_sessions` (04)  | read-only                                     | inverted — student authors, teacher reads; triggers fan into `student_repertoire`                           |
| `lessons.notes` (02)      | teacher-only                                  | none (deliberate)                                                                                           |
| **`student_skills`**      | **`status`, `notes`**                         | **none**                                                                                                    |

The two established precedents for adding a student voice are (a) a **separate student-owned
column** beside the teacher's (`self_rating` vs `current_status`) and (b) a **narrow
`SECURITY DEFINER` RPC** (`student_toggle_checklist_item`). Per ADR-0001 the DB is the security
boundary; the app-layer check exists for error-message quality only. The UI precedent is one
shared route branching on `canManage`/`canAct` — there is deliberately no `/app/student/*` tree.

## Gaps & planned work

### SKL-1 · Student can reach their own skill checklist

**Missing**: a student holds `Students can view their own skills` and the read-only badge UI
already renders, but there is no route into it. The only way in is typing
`/dashboard/users/<own-id>` — which is exactly how the E2E test reaches it. The student sees
nothing of the curriculum the teacher is tracking them against.

**Approach**: surface the existing read-only checklist on a student-reachable route. Cheapest
honest option is a card or tab on `/dashboard/stats` (already in the student "Progress" nav
group), reusing `StudentDetailSkills` with `canEdit={false}` rather than building a second tree.
A dedicated nav entry is the alternative; prefer it only if the checklist deserves top-level
weight.

**Files**: `components/navigation/menu.constants.ts` (student "Progress" group, `:215`) ·
`app/dashboard/stats/` · `components/users/StudentDetail.Skills.tsx` (extract if the student
view needs different chrome) · `app/actions/student-skills.ts` (a `getMySkills()` that resolves
the student from the session rather than a param).

**Accept**: signed in as a student, the checklist is reachable in ≤2 clicks from the sidebar,
shows statuses set by the teacher, and renders no `<select>`. Cross-role E2E proves student B
cannot read student A's assessments.

### SKL-2 · Teacher nav "Skills" points at the wrong feature

**Missing**: `components/navigation/menu.constants.ts:124` puts `Skills → /dashboard/skills`
in the teacher's **"Students"** group, but that route is the chord-quiz hub (doc 05). A teacher
clicking "Skills" under "Students" gets a practice tool, not the assessment surface this doc
describes. The actual checklist has no nav entry at all.

**Approach**: decide one of — move the item to a "Tools" group and relabel it for what it is
(the student nav already calls the same route "Practice Tools"); or repoint "Skills" at a real
assessment surface if SKL-5 creates one. Do not leave a nav label describing a different domain.

**Files**: `components/navigation/menu.constants.ts` · `tests/e2e/dashboard/sidebar.spec.ts`.

**Accept**: every nav label in the "Students" group leads to a student-scoped surface; the
sidebar E2E asserts the destination.

### SKL-3 · `notes` is dead weight

**Missing**: `student_skills.notes` exists, `UpsertStudentSkillInputSchema` validates it (≤1000
chars) and `upsertStudentSkill` writes it — but **no caller ever passes it** and no UI renders
it. A teacher's "why" behind an assessment has a home and no door.

**Approach**: either surface it (an expandable note per row, written through the existing action
parameter — no schema or action change needed) or delete the column and the schema field. It is
the cheapest teacher→student channel in the domain, so surfacing is the likely call — but it
only makes sense **after SKL-1**, since today the student would never see the note.

**Files**: `components/users/StudentDetail.Skills.Row.tsx` · `StudentDetail.Skills.tsx`
(thread `notes` into `handleUpdate`).

**Accept**: a teacher can attach a note to an assessment and it survives a reload; the student
read-only view renders it.

### SKL-4 · Student self-assessment (v1.1 — gated)

**Missing**: no student input of any kind. The teacher assesses in a vacuum between lessons, and
the student has no way to say "I think I've got this" or "this one still isn't working".

**Approach**: follow the `student_repertoire.self_rating` precedent — a **separate**
`student_reported_status` column so a student can never overwrite the teacher's assessment, plus
a narrow `SECURITY DEFINER` RPC modelled on `student_complete_chord_drill`
(`supabase/migrations/20260722000001_assignment_chord_drills.sql:55`): ownership check via
`current_profile_id()`, single-column write, `COMMENT ON FUNCTION` stating it is the only path.
The **divergence** between the two columns is the actual pedagogical signal — surface it to the
teacher as a flag, not as an average.

**Gated**: this needs new schema and adds a student-facing surface, which is exactly what the
Tranche 3 standing decision protects. It should wait for real usage — and it depends on SKL-1,
since a student who cannot see the checklist cannot self-assess against it.

**Files**: new migration · `app/actions/student-skills.ts` · `StudentDetail.Skills.Row.tsx` ·
`tests/e2e/cross-role/student-skills.spec.ts` · an RLS test in `lib/testing/rls/`.

**Accept**: a student sets their own status; the teacher's value is unchanged; RLS-real test
proves a student cannot write `status` nor touch another student's row.

### SKL-5 · Assessment from the lesson flow

**Missing**: skills are assessed only by navigating to a student profile and opening a tab.
The natural moment — finishing a lesson and writing it up — has no skill affordance, so the
checklist drifts out of date exactly when it is cheapest to update.

**Approach**: tick off the lesson's skills from the post-lesson note surface. The
`post-lesson-summary` agent already reads `studentSkillProfile`, so the feedback loop has
somewhere to live: it could propose the statuses and let the teacher confirm. Note that
`lesson_group` is a **static curriculum roadmap**, not a link to a real `lessons` row — a genuine
lesson↔skill link would be new schema.

**Files**: `app/dashboard/lessons/` · `lib/ai/agents/post-lesson-summary.ts` ·
`app/actions/student-skills.ts`.

**Accept**: a teacher can move a skill's status without leaving the lesson write-up, and the
change shows on the student detail tab.

### SKL-6 · No notification on assessment change

**Missing**: `upsertStudentSkill` never calls the notification layer, so a student is never told
their teacher marked something mastered — the single most motivating event the domain produces.

**Approach**: queue a best-effort in-app notification, following the assignment-create precedent
in `app/actions/assignment-edit.ts` where a notification failure logs and never blocks the write.
Depends on SKL-1 (a notification must link somewhere the student can actually open). Consider
batching — a teacher updating twelve skills in one sitting must not send twelve notifications.

**Files**: `app/actions/student-skills.ts` · the in-app notification service (doc 07).

**Accept**: marking a skill `mastered` produces exactly one in-app notification linking to the
student's checklist; a notification failure still saves the assessment.

## Test plan

Current coverage:

| Level | File                                                  | Covers                                                                                       |
| ----- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Unit  | `components/users/StudentDetail.Skills.test.tsx`      | `groupSkillsByLevel` and `countMastered` **only** — pure functions, no interaction           |
| E2E   | `tests/e2e/cross-role/student-skills.spec.ts`         | admin edits · teacher edits and it persists · **student sees read-only, `<select>` count 0** |
| E2E   | `tests/e2e/cross-role/student-skills-roadmap.spec.ts` | lesson grouping, milestone pill, progress bars                                               |

Gaps in coverage:

- **No RLS-real test.** Student read-isolation on `student_skills` is asserted only through the
  UI. The one table with a student SELECT grant and no write path deserves a direct test in
  `lib/testing/rls/` proving student B reads nothing of student A — especially before SKL-4 adds
  a write path.
- **No test of the action's role gate.** The `!isTeacher && !isAdmin` branch has no unit test;
  the E2E proves the control is absent, not that the server refuses a forged call.
- **No test for the lazy-row semantics** (unassessed skill renders `not started` from a missing
  row, and the first write inserts rather than updates).
- **The roadmap helpers have no unit test at all** — `groupSkillsByLesson`, `isMilestoneLesson`
  and `lessonProgress` live in `student-detail-skills.helpers.ts` and are covered only
  indirectly by the roadmap E2E. `lessonProgress` is the one that matters: its two-definition
  rule (text counts `mastered` only, bar gives `proficient` half credit) is exactly the kind of
  deliberate asymmetry a future edit would "simplify" away, and a pure function is the cheapest
  possible place to pin it.

## Open questions

- **Should the catalog ever be teacher-editable?** Today it is migration-only, which is honest
  for a single-teacher studio and keeps `name` unique and stable. A second teacher, or a teacher
  wanting a studio-specific skill, breaks that assumption. Deferred until a second teacher exists.
- **Is `lesson_group` a curriculum roadmap or a schedule?** It is currently the former — an
  idealized ordering, unlinked to any `lessons` row. If SKL-5 ties assessments to real lessons,
  the two meanings will need separating before they get confused.
- **Advanced tier has no roadmap** (`lesson_group` null throughout, `LESSON_MILESTONES.advanced`
  empty). Deliberate — no curriculum has been designed for it. Is advanced a real tier or an
  aspirational bucket?
- **Which baseline is authoritative for these two tables?** They exist in
  `supabase/migrations/00000000000000_baseline.sql` (`:5137`, `:5390`) but **not** in
  `supabase/baseline/cloud_schema_2026-06-22.sql`, which [00-overview.md](00-overview.md#schema-truth)
  calls the authoritative schema ("62 tables … verified against live StrummyProd 2026-07-18").
  Either the snapshot is stale or the Cloud project never had the skills feature. This needs
  checking against the live stack **before** any SKL work touches the schema — a migration
  written against the wrong lineage fails on apply.
- **Does `student_skills` overlap `student_repertoire.current_status`?** Both are per-student
  progress ladders. Repertoire tracks _songs_, skills track _capabilities_, and a song mastered
  is evidence for several skills — but nothing connects them today. Worth a grill before either
  grows more machinery.

## References

- Tables: `supabase/migrations/00000000000000_baseline.sql` (`:5390`, policies `:9794–9913`);
  catalog migrations `20260805110000` … `20260814130000`
- Actions: `app/actions/student-skills.ts` · schemas `schemas/StudentSkillSchema.ts` ·
  vocabularies `types/StudentSkills.ts`
- UI: `components/users/StudentDetail.Skills*.tsx`, `student-detail-skills.helpers.ts`;
  page `app/dashboard/users/[id]/page.tsx`
- AI consumption: `lib/ai/registry/context-fetcher.ts:430`, `lib/ai/agents/assignment.ts`,
  `lib/ai/agents/post-lesson-summary.ts`
- Security doctrine: [adr/2026-05-09-0001-rls-is-the-security-boundary.md](adr/2026-05-09-0001-rls-is-the-security-boundary.md)
- Related domains: [01](01-identity-access.md) (`profiles.skill_level`, a different thing) ·
  [03](03-songs-repertoire.md) (the `self_rating` precedent) · [05](05-chords-theory.md) (the
  `/dashboard/skills` route) · [06](06-assignments.md) (the student-RPC precedent)
- Manual test report: `docs/manual-tests/2026-08-11-skills-checklist-by-level.html`
