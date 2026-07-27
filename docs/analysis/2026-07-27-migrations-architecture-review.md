# Migrations Architecture Review

**Date**: 2026-07-27
**Author**: Claude Code (session review, requested by Piotr)
**Scope**: all 27 active migrations in `supabase/migrations/`, cross-checked against `supabase/baseline/cloud_schema_2026-06-22.sql`, `supabase/migrations_archive/` (173 files), app code, and the RLS integration harness (`lib/testing/rls/`).

Overall craftsmanship is high: enum discipline, a single `set_updated_at()`, SECURITY DEFINER RPCs as the student write path (ADR-0001), advisory-lock lesson numbering, partial indexes, excellent migration comments. The findings below are ordered by severity; **1 and 2 are bugs, not style**.

---

## Critical

### 1. Identity-model split: `auth.uid()` compared against `profiles.id` columns

The rebuilt core (`20260718090100`…`090500`) established the independent-PK model: `profiles.id` ≠ `auth.uid()`, RLS goes through `current_profile_id()`. But six later migrations compare **profile-id columns directly to `auth.uid()`**:

| Migration                                        | Broken comparison                                                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `20260719000001` (student status RPC)            | `v_assignment.student_id IS DISTINCT FROM auth.uid()`                                                      |
| `20260720000001` (checklist RPC)                 | same                                                                                                       |
| `20260722000001` (chord drill RPC)               | same                                                                                                       |
| `20260719000004` (assignment_history RLS)        | `a.teacher_id = auth.uid() OR a.student_id = auth.uid()`, `p.id = auth.uid()`                              |
| `20260719000006` (user_preferences teacher read) | `profiles.id = auth.uid()`                                                                                 |
| `20260719190000` (song_status_history)           | `auth.uid() = student_id` **plus a dual FK on the same column → both `auth.users(id)` and `profiles(id)`** |

`assignments.student_id` references `profiles(id)`, and `handle_new_user` inserts profiles with `id = gen_random_uuid()`. So **for every organically-signed-up user, these paths fail closed**: student RPCs raise "Not authorized", the assignment-history timeline is invisible. It works today only because the 53 backfilled profiles happen to have `id == user_id` — and the RLS tests bake in that coincidence explicitly (`lib/testing/rls/seedTwoTeachers.ts:54-57` upserts `{ id, user_id: id }`), so CI cannot catch it. `docs/DATABASE_REBUILD.md:113` flags this reconciliation as open ("A-reconcile") — the migrations shipped since went the wrong way.

The `song_status_history` dual FK is worse than a wrong comparison: every insert must satisfy **both** FKs, which is impossible once `profiles.id ≠ auth.uid()` — and the table is written by an `AFTER UPDATE` trigger on `student_repertoire`, so a failing insert aborts the whole status-change transaction. That re-creates a variant of the very incident `20260719190000` was written to fix.

**Fix**: replace with `public.current_profile_id()` in all six, drop the impossible dual FK on `song_status_history` (keep the `profiles(id)` one), and add one RLS test that seeds through the real trigger (without forcing `id`).

### 2. Two competing student-status RPCs — the surviving old one bypasses the state machine

`set_assignment_status` (`20260718090500`) was superseded by `student_update_assignment_status` (`20260719000001`), which added the transition state machine. But the old function was **never dropped and is still granted to `authenticated`**. It validates ownership (correctly, via `current_profile_id()`) but accepts _any_ target status — a student with curl can jump their assignment to `cancelled`, reset `completed` → `not_started`, etc., bypassing ASG-3 entirely. The app doesn't call it (verified: only `student_update_assignment_status`, `student_toggle_checklist_item`, `student_complete_chord_drill` are used).

**Fix**: `DROP FUNCTION public.set_assignment_status(uuid, public.assignment_status)` — and fold its correct identity check into the survivor (pairs with finding 1).

### 3. The chain is neither self-contained nor drift-complete

- **Fresh replay fails**: `20260718210000` (needs `practice_sessions`, `student_repertoire`), `20260719000000` (`notification_preferences`), `20260723130000` (`user_preferences`), `20260723150000` (`is_child_of_parent`, `student_repertoire`) all reference objects **no active migration creates** — they exist only via the baseline dump.
- **Live stacks have objects no active file describes**: `invite_email` (actively selected/written by `app/api/users/[id]/route.ts:78`), `is_shadow`, `ck_shadow_user_id`, `parent_id`/`is_parent` helpers — all archive/baseline-era.
- **Storage migrations hard-fail** where the `storage` schema doesn't exist (StudentDevelopment) — their own comments admit they were hand-skipped, which means `migration up` can't replay the chain linearly on that stack.

**Fix**: generate a squashed `0000000000_baseline.sql` from the current dev stack so `supabase db reset` reproduces reality, and wrap storage DDL in `DO $$ ... IF to_regclass('storage.buckets') IS NOT NULL` guards. This is the single biggest structural win — right now no environment can be rebuilt from the folder that is nominally the source of truth.

### 4. `handle_new_user` lost the shadow-claim flow

The baseline version matched shadow profiles by `invite_email` and linked `user_id` on signup. The rebuild's `create or replace` (`20260718090100`) replaced it with a plain insert + `on conflict (user_id) do nothing`. A shadow student who signs up now gets a **fresh empty profile**, orphaning the lessons/assignments attached to their shadow profile — while the intake UI still writes `invite_email`. The rebuild doc defers this to Phase 2 (`transfer_shadow_profile`), but the intake surface already shipped, so the gap is live.

---

## Medium

5. **`skill_level` has two sources of truth** — onboarding writes `user_preferences.skill_level` (`app/actions/onboarding.ts:40`), the intake form writes `profiles.skill_level`; the teacher detail view reads the former (`lib/services/student-detail-queries.ts:147`), the users API reads the latter. Pick one home (profiles is the natural one) and migrate.
6. **Schedule as free text** — `profiles.lesson_day text ('Thu')`, `lesson_time text ('4:00 PM')` can't be sorted, validated, or ever used for conflict detection/reminders. Store `smallint` day-of-week + `time`. Also `skill_level`'s CHECK re-lists the existing `difficulty_level` enum's values.
7. **`overdue` is stored but nothing sets it** — no cron/trigger in the DB flips assignments to `overdue`; it's derivable state (`due_date < now()`). Either compute at read time or add the job — otherwise the state machine's `overdue` branch is dead and UI/DB can disagree.
8. **Missing `SET search_path`** on both SECURITY DEFINER functions in `20260718210000` (`fn_aggregate_practice_to_repertoire`, `reverse_song_progress_from_practice`) — violates the chain's own stated convention (foundation header) and is exactly what the Supabase advisor flags.
9. **Practice aggregation silently drops data** — `fn_aggregate_practice_to_repertoire` only UPDATEs an existing repertoire row; a session for a song not in the student's repertoire vanishes from aggregates. Consider an upsert or document the invariant.
10. **RLS per-row function calls** — policies use bare `public.current_profile_id()` / `public.is_admin()`; SECURITY DEFINER functions aren't inlined, so they run per row. Wrapping as `(select public.current_profile_id())` makes them InitPlans (Supabase's own recommendation). Mechanical, free win across every policy.

## Low (hygiene)

- **Redundant indexes**: `ix_lesson_songs_lesson` (covered by `unique(lesson_id, song_id)`), `idx_teacher_settings_profile_id` (covered by the `unique` constraint), `idx_profiles_student_status` (2-value enum, near-zero selectivity).
- **Idempotency gaps**: avatars bucket policies lack `DROP POLICY IF EXISTS` (song-covers does it right); the enum-casing renames (`20260719000007`) aren't re-runnable.
- `assignment_history.changed_by` has no FK and `change_type` no CHECK; it stores auth ids while sibling tables store profile ids (ties into finding 1).
- `song_status_history.previous_status`/`new_status` are `text`, not `lesson_song_status` — drift-prone (mirrors the baseline deliberately).
- `user_preferences_teacher_read` policy omits `TO authenticated` (applies to all roles — harmless, inconsistent).
- `teacher_settings` could use `profile_id` as its PK (pure 1:1 table).
- Lessons list views would prefer a `(teacher_id, scheduled_at)` composite over the bare partial index — immaterial at current scale.
- `student_status` defaults to `'archived'` — new signups/intakes start archived; only pre-existing students were rescued by the backfill. If the intake form doesn't explicitly set `'active'`, new students are invisible in active-roster filters.

---

## Suggested order of attack

1. **Findings 1 + 2** — one small migration (fix six comparisons, drop one function); directly affects correctness/security for the next real signup.
2. **Finding 3** — squashed baseline; makes everything else verifiable (`supabase db reset` reproduces reality).
3. **Finding 4** — restore shadow-claim linking (or the Phase-2 `transfer_shadow_profile` path) before the intake flow acquires real users.
4. Medium/low items fold naturally into blueprint gaps (ASG/IDA/PRA domains).

## Open verification items (pre-requisites for the 1+2 fix migration)

- Value space of `song_status_history.student_id` on live stacks (written by `fn_record_progress_history` from `student_repertoire.student_id` — confirm which FK that column carries in the baseline).
- Value space of `user_preferences.user_id` (rebuild doc says `→ profiles cascade`; onboarding upserts it with the caller's id — confirm which).
- How the app reads `assignment_history.changed_by` (whether repointing it to profile ids breaks the timeline UI).
- Whether the RLS integration suite actually runs in CI (`describeIfRls` skips without `RLS_TEST_SUPABASE_URL`) — if skipped, the `seedTwoTeachers` id-forcing is moot but the coverage gap is real.
