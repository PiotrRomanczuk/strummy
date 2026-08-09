---
created: 2026-07-18
updated: 2026-07-27
domain: Assignments
tables: [assignments, assignment_templates, assignment_history]
maturity: built
---

# Assignments

## Purpose

Homework: a teacher assigns work to a student (optionally linked to a lesson and/or a song,
optionally due-dated); the student gets an in-app notification, sees it in their list, and
advances its status through a server-enforced state machine (`not_started → in_progress →
completed`, with `cancelled` and read-time `overdue`). The teacher watches the status come
back. This closes the "assigns homework → student practices" leg of the core loop.

Supersedes the former spec 03-assignments (deleted 2026-07-18; git history). That spec's headline gaps — no
create/detail/edit surfaces, no student status control, missing student RLS
UPDATE policy — have all shipped (deferred in the PR #441 era, built since; verified against
code 2026-07-18). What remains open is templates, the unused history table, and DB-level
column scoping of the student write.

## Data model

| Table                  | Role                                                                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assignments`          | `title`, `description`, `status` (enum, default `not_started`), `due_date`, `teacher_id`, `student_id`, optional `lesson_id` + `song_id`, soft `deleted_at`. CHECK `teacher_id <> student_id`. |
| `assignment_templates` | Reusable `title` + `description` per teacher — schema only; nothing reads or writes it in a mounted flow.                                                                                      |
| `assignment_history`   | Trigger-written audit: `change_type` (`created/status_changed/updated/deleted`), jsonb before/after, `changed_by`.                                                                             |

Enum `assignment_status`: `not_started | pending | in_progress | completed | overdue |
cancelled` — `pending` is legacy (the app's state machine never produces it); `overdue` is
derived at read time (`calculateAssignmentStatus`), not written by the student path.

### Triggers, functions, RLS (behavioral one-liners)

- `track_assignment_changes` → `assignment_history` on every insert/update/delete; `tr_audit_assignments` → legacy `audit_log`.
- `update_updated_at_column` on `assignments` + `assignment_templates`.
- RLS: SELECT admin / owning teacher / owning student (+ `assignments_select_parent` via `is_child_of_parent` — parent UX unbuilt, see 01); INSERT/UPDATE/DELETE admin-or-teacher; **`assignments_student_status_update`** lets a student UPDATE their own row — the policy is row-scoped only, with column scope (status-only) enforced in the app layer (its own comment says so). See ASG-3.
- Templates RLS: teacher-own + admin policies exist and are ready for a UI that never came.

## Behavior & rules

- **Create** (teacher/admin): form → `app/actions/assignment-edit.ts`; validates
  teacher/student pairing, optional `lesson_id` must belong to the same pair; queues an
  `assignment_created` in-app notification **best-effort** — a notification failure logs and
  never blocks the create (delivery is 07's job). API twin: `POST /api/assignments`.
- **Edit / soft-delete** (teacher/admin): full-field edit through the same form in edit
  mode; delete sets `deleted_at`; all reads filter it.
- **Student writes are status-only**: `updateAssignmentStatus` (server action consumed by
  `AssignmentStatusActions`) checks ownership, validates the transition against
  `VALID_STATUS_TRANSITIONS` (`schemas/AssignmentSchema.ts`), writes only `status` through
  the cookie-bound client so RLS is exercised. Non-status fields from a student 403 at the
  app layer (`validateStudentUpdate` on the PATCH route).
- **State machine**: `not_started → in_progress | cancelled`; `in_progress → completed |
cancelled`; `overdue → in_progress | completed | cancelled`; `completed`/`cancelled`
  terminal; same-status no-op allowed. Terminal states render no buttons.
- **Roles in the list**: teachers/admins see student column + counts; a pure student
  (`isStudent && !isTeacher && !isAdmin`) gets the condensed "From your teacher" layout.
- **AI assist**: the create form can draft the description via the AI action layer (08 owns
  providers/limits).

## UI surfaces

### List behaviour (the list-table standard)

The assignments list follows `reference/LIST_TABLE_PATTERN.md`. All of its state
lives in the query string, so any view is one shareable link and Back/Forward
work.

| Param     | Meaning                                    | Omitted when          |
| --------- | ------------------------------------------ | --------------------- |
| `status`  | Tab filter over **effective** status       | "All"                 |
| `student` | Teacher/admin only — one student           | unset                 |
| `q`       | Title search (`ilike`)                     | empty                 |
| `sort`    | `due_date｜created_at｜updated_at｜title｜status` | needs-attention default |
| `dir`     | `asc｜desc`                                 | no `sort`, or `asc`   |
| `page`    | 1-based                                    | page 1                |
| `selected`| Assignment open in the panel               | panel closed          |

**Filtering.** Status tabs carry counts tallied over the *whole* set, not the
filtered one, so a badge still tells you what is behind a tab you are not on.
Search is debounced ~350 ms and uses `router.replace`, so typing a title does
not leave one history entry per keystroke. Every filter change resets to page 1.

**Sorting.** Due, Title and Status are sortable column headers; clicking an
inactive column sorts ascending, clicking the active one flips `dir`. Progress
is deliberately **not** sortable — it is a per-row checklist tally with no
ordering behind it. With no `sort`, rows use the needs-attention default:
overdue → not started → in progress → completed → cancelled, then by due date
(undated last).

**Pagination.** `ASSIGNMENTS_PAGE_SIZE = 50`. The pager hides at one page and
its ends are `aria-disabled` rather than removed, so the control does not jump.

Paging happens **in memory**, not in SQL, and that is deliberate:
`effectiveStatus` (overdue) is derived at read time from `due_date`, and the
default ordering sorts by it — neither is expressible as an `ORDER BY` over
stored columns. The full set is already loaded for the tab counts, so slicing
costs nothing extra. When row counts outgrow that, the fix is a generated
`effective_status` column, **not** a slice pushed further down.

An out-of-range `page` clamps to the last real page rather than rendering empty:
a stale bookmark to page 9 of a filter that now holds two should show content,
not read as "no assignments".

**Clicking a row** sets `?selected=<id>` and opens the slide-in panel (due date,
checklist progress, student) — it does **not** navigate to
`/dashboard/assignments/[id]`. Clicking the open row closes it. "Open full page"
is the way to the detail route; the close control clears only `selected`,
leaving every other filter and the page intact. The panel needs no extra query —
`AssignmentRow` already carries everything it shows.

**Known divergence, deliberately unresolved.** Assignments encode sort as two
params (`sort=title&dir=desc`); songs use one (`sort=title_desc`). Both are
defensible — two params stay orthogonal and do not double the enum per column —
and the standard mandates neither. Converging them is cosmetic churn on working
code; revisit only if a fourth list makes the inconsistency actually cost
something.


| Surface                                                           | Route / component                                                                       | Maturity                                                      |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| List (role-aware, counts, status pills)                           | `/dashboard/assignments` → `AssignmentsList`                                   | mounted (nav "Assignments" / "My Assignments")                |
| Create (student/song pickers, due date, AI description)           | `/dashboard/assignments/new` → `AssignmentCreate`                              | mounted                                                       |
| Detail (links to lesson/song, student status controls, edit link) | `/dashboard/assignments/[id]` → `AssignmentDetail` + `AssignmentStatusActions` | mounted                                                       |
| Edit (teacher/admin)                                              | `/dashboard/assignments/[id]/edit` → `AssignmentCreate` (edit mode)            | mounted                                                       |
| Templates list / new / detail                                     | `/dashboard/assignments/templates{,/new,/[id]}` → `TemplatesList`                       | mounted (built 2026-07-20, reversing ASG-1)                   |
| Assignment history timeline                                       | — (table written by trigger, read nowhere)                                              | unbuilt                                                       |

## Gaps & planned work

_Shipped 2026-07-19: ASG-2 (`assignment_history` surfaced as a detail timeline) · ASG-3 (student status write column-scoped in the database)._
_Shipped 2026-07-22: ASG-4 (assignable chord drills — the first v1.1 slice)._

_Shipped 2026-07-20: assignment templates — **decision reversed.** ASG-1 (grill 2026-07-18)
cut the three "Coming soon" template stubs and left the schema dormant, on the reasoning that a
solo teacher had no evidence of needing them. The stubs were duly deleted in the 2026-07-19
honesty batch. Then on 2026-07-20 templates were built for real — `TemplatesList`,
`lib/services/assignment-template-queries.ts`, a start-from-template path on the create form, and
`tests/e2e/teacher/assignment-templates.spec.ts`. The table is live, not dormant. Recorded here
rather than silently deleted because the reversal is the interesting part: the "no usage
evidence" test was applied to a feature whose schema and actions already existed, which made
rebuilding it cheap enough that the decision did not hold._

## Test plan

- **E2E (existing)**: `tests/e2e/teacher/assignments-crud.spec.ts` (A5.1 lifecycle),
  `tests/e2e/student/assignments-interact.spec.ts` (B5.1–B5.4: no create button, status
  advance, content read-only, filter), cross-role isolation in
  `tests/e2e/cross-role/rls-data-isolation.spec.ts`. Catalog: `reference/E2E_JOURNEYS.md` §A5,
  §B5.
- **E2E (missing per journeys)**: A5.2 full link round-trip (integration-covered), A5.3
  templates (blocked on ASG-1).
- **Unit/integration**: `AssignmentCreate.test.tsx`,
  `app/actions/__tests__/assignment-templates.test.ts`, state-machine tests around
  `validateStatusTransition`, notify-on-create tests (create succeeds when
  `queueNotification` throws), assignments RLS assertions in the `jest.config.rls.ts`
  suite — extend with the ASG-3 database-level rejections.
- **Notification leg**: assignment-created delivery is asserted in 07's queue-processor
  tests; here we only assert the queue write.

## Open questions

1. ~~Templates: worth existing?~~ — **resolved twice.** Cut 2026-07-18 (stubs deleted
   2026-07-19), then built for real 2026-07-20. Answer: yes.
2. **`overdue` as data vs derivation**: today `overdue` is computed at read time and also a
   writable enum value; no cron writes it. Standardize on derivation-only (and stop
   exposing it as a transition source in `VALID_STATUS_TRANSITIONS`?) or add a nightly
   marker so filters/counts and notifications (07's reminder engine) share one truth?
3. **Retire the `pending` enum value?** Unreachable from the app's state machine; dropping
   an enum value is a migration hassle — worth it on the next schema-consolidation pass, or
   document-and-ignore?
4. **Should students see who/when in history** (shapes ASG-2's student rendering):
   exposing `changed_by` to students leaks nothing (it's their teacher), but is the
   timeline useful to them or teacher-only noise?

## References

- Schema: `supabase/baseline/cloud_schema_2026-06-22.sql` (§assignments,
  §assignment_templates, §assignment_history, enum `assignment_status`, policy
  `assignments_student_status_update`, trigger `track_assignment_changes`)
- Superseded spec: `docs/specs/03-assignments.md` (deleted 2026-07-18; git history)
- State machine: `schemas/AssignmentSchema.ts` (`VALID_STATUS_TRANSITIONS`,
  `validateStatusTransition`)
- RLS doctrine: `docs/app-blueprint/reference/ARCHITECTURE.md` + ADR-0001; notification delivery: 07; AI
  description drafting: 08; lesson/song linking: 02 / 03
