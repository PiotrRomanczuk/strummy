# Shadow Users — Deep Analysis of the Claim Lifecycle

**Date**: 2026-07-14
**Author**: Claude
**Scope**: End-to-end analysis of the shadow-user workflow — creation, life as a shadow, invite, claim (both paths), post-claim reconciliation — with a coverage audit of the two FK-transfer implementations and ranked findings.
**Related**: [ADR-0002](../adr/2026-05-17-0002-shadow-students-in-the-lesson-system.md), [Spec 06](../specs/06-auth-shadow.md), [2026-07-12 architecture health](./2026-07-12-architecture-health.md)

---

## TL;DR

The shadow-user lifecycle is the product's highest-value flow (ADR-0002: "it is where shadow becomes claimed") and most of its scaffolding is genuinely good — formalized schema invariants, a unified FK-transfer SQL function, an auth-events audit trail, a deliverable-email chokepoint, calendar reconciliation. **But the claim step itself — the single moment the whole feature exists for — is currently broken in both paths for any shadow that has real data:**

1. **CRITICAL — the signup-claim trigger regressed to a partial, wrongly-ordered transfer.** The live `handle_new_user` (from `20260622210000`, which perpetuated the orphan prod migration captured in `20260622121619` / PR #515) transfers only `lessons`, `assignments`, `user_roles` — inline, not via `transfer_shadow_profile_references()` — **and updates FKs to `new.id` before the new profile row exists**, re-introducing the exact FK-violation bug that was diagnosed and fixed on 2026-06-08 (`20260608000000`). For a shadow with any lesson, the trigger throws, the `EXCEPTION WHEN OTHERS` handler swallows it, and the user ends up with **no profile at all** — the "blank account" symptom PR #515 set out to fix.
2. **CRITICAL — even if the order were fixed, the partial transfer cascade-deletes student data.** `student_repertoire`, `practice_sessions`, `student_skills`, `chord_quiz_attempts`, `chord_srs`, `song_requests`, `in_app_notifications`, notification prefs/log/queue, AI history and settings are all `ON DELETE CASCADE` on `profiles(id)`. `DELETE FROM profiles WHERE id = old_profile_id` silently destroys everything the inline transfer didn't move.
3. **HIGH — the admin manual-link endpoint has the same ordering bug, unfixed.** `transfer-shadow-references.ts` runs the RPC transfer **first**, inserts the real profile **second** (`app/api/admin/link-shadow-user/transfer-shadow-references.ts:28,40,58`). Validation guarantees the real user has no profile yet (409 otherwise, `validate-link-request.ts:96`), so the first FK `UPDATE` violates `lessons_student_id_fkey` for any non-empty shadow. The endpoint's unit tests mock Supabase, so this never fires in CI — it is the same "masked when the shadow has no rows" failure mode documented in `20260608000000`.

**Net effect**: a shadow with real history currently cannot be claimed — by signup, by Google OAuth, or by admin link — without silent data loss or a stranded profile-less auth user. Fix plan in §8.

> **Caveat**: this is static analysis of the migration files and app code on `chore/production-hardening`. Production has already diverged from the repo once (that's how the regression happened — orphan migrations applied directly to prod). §9 lists the queries to verify the live state before acting.

---

## 1. What a shadow user is

A **shadow user** is a teacher-created student placeholder: a `profiles` row with `is_shadow = true` and `user_id = NULL` — no `auth.users` entry, no login. It lets the teacher schedule lessons, assign repertoire, and track progress for a student who hasn't signed up yet. When the real student eventually signs up (or is admin-linked), every FK reference must migrate to the real account and the shadow row must disappear, leaving exactly one profile per human.

Two email conventions coexist on shadow rows:

| Convention      | `email` column                  | `invite_email` column                | Created by                                                                     |
| --------------- | ------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| **New flow**    | `shadow_<uuid>@placeholder.com` | real address (or NULL until invited) | `POST /api/users` with empty email (`app/api/users/route.ts:249-268`)          |
| **Legacy flow** | the real address                | NULL                                 | `createShadowStudent()` (`lib/services/import-utils.ts:68`) — all import paths |

Both are matched at claim time (trigger prefers `invite_email`, falls back to `email`), but they behave differently for email deliverability (§6, finding M3).

## 2. Data model & invariants

Formalized in `20260425000000_formalize_shadow_profile_schema.sql`:

- `profiles.id` **no longer FKs to `auth.users`** — shadows have random UUIDs with no auth entry.
- `profiles.user_id` is the nullable link to `auth.users`; unique partial index `uq_profiles_user_id`; for real users `user_id = id`.
- `CHECK ck_shadow_user_id`: `is_shadow = true OR user_id IS NOT NULL` (NOT VALID — legacy rows unverified).
- `profiles.invite_email` — the real address for shadows; unique partial index `uq_profiles_invite_email` (`20260518000001`, guarded by a pre-flight collision check that refuses to build the index until `scripts/backfill/2026-05-shadow-dedup.ts` has consolidated duplicates).
- `is_shadow` itself added in `029_add_is_shadow_to_profiles.sql`; flag first, formalized schema a year later.

Roles live as flags on the profile row (`is_admin/is_teacher/is_student`) plus the legacy `user_roles` table (still FK-CASCADE to profiles and still transferred by the trigger).

## 3. Lifecycle — creation surfaces

Shadow rows are created from **six** call sites (all funnel into two functions):

| Surface                                           | Entry                                                                    | Email convention                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Admin/teacher "add user" without email            | `POST /api/users` (`app/api/users/route.ts:249`)                         | placeholder + optional `invite_email`                                 |
| Add-student server action                         | `app/actions/student-management.ts:20` → `createShadowStudent`           | legacy (real email in `email`)                                        |
| Inline student creation from lesson form          | `app/actions/lesson-edit.helpers.ts:43` (defaults first name to `'New'`) | legacy                                                                |
| CSV/bulk lesson import                            | `app/actions/import-lessons.ts:103`                                      | legacy                                                                |
| Google Calendar bulk import                       | `lib/services/calendar-bulk-import.ts:164`                               | legacy                                                                |
| Google Calendar incremental sync (webhook-driven) | `lib/services/google-calendar-sync.ts:44`                                | legacy — **shadows can be created autonomously by a background sync** |

`shadow_user_created` is an `auth_events` type (per spec 06), and the calendar-sync path can mint shadows with no human in the loop — worth remembering when counting "students" or auditing growth metrics.

## 4. Lifecycle — living as a shadow

- **Visibility**: RLS `profiles_select_teacher` lets teachers see all shadows; students see only themselves. Shadows appear in pickers as "Unclaimed" students.
- **Email**: every student-bound send routes through `getDeliverableEmail()` (`lib/email/recipient.ts:24`): shadow → `invite_email` or `null`; anything matching `shadow_*@placeholder.com` → `null`. Null ⇒ skip + `notification_log` row (`reason='shadow_no_invite_email'`), never a bounce. Wired into `notification-service.ts` and `notification-queue-processor.ts`. This part is solid.
- **Calendar**: lessons for shadows sync to Google Calendar with the placeholder/absent attendee; reconciliation happens post-claim (§5c).

## 5. Lifecycle — invite and claim

### 5a. Invite (teacher action)

`inviteShadowUser(userId, inviteEmail)` (`app/dashboard/actions.ts:92`) persists `invite_email` then dispatches via `sendUserInvite`, which resolves the address as `is_shadow && invite_email ? invite_email : email` and refuses un-invited shadows ("Set an invite email…", `actions.ts:51`). Duplicate-address writes 409 against both `email` and `invite_email` of other rows (PATCH `/api/users`). UI: `InviteShadowButton` / `InlineInviteButton` on `StudentDetailEditorial`. Events: `shadow_invite_email_set`, `shadow_invite_sent` (`20260616020000`). This matches spec 06 §6.1 and looks complete.

### 5b. Claim — the two paths and their shared history

**Path A — automatic, on signup/OAuth**: `handle_new_user` trigger on `auth.users` INSERT. Matches `invite_email = new.email AND is_shadow` first, falls back to `email = new.email`, newest row wins.

**Path B — manual, admin/teacher**: `POST /api/admin/link-shadow-user` — validate (shadow exists & `is_shadow`; real auth user exists; real user has **no** profile) → RPC `transfer_shadow_profile_references(old,new)` → insert new profile → delete shadow → log `shadow_link_completed` with transfer counts → best-effort `reconcileCalendarForStudent`.

**Trigger version history** (the important part):

| Migration                                                    | Transfer mechanism                                | Order                             | Status                            |
| ------------------------------------------------------------ | ------------------------------------------------- | --------------------------------- | --------------------------------- |
| `20260425000002` (rewrite)                                   | unified function                                  | transfer → insert ❌              | FK bug, masked for empty shadows  |
| `20260608000000` (order fix)                                 | unified function                                  | **insert → transfer → delete** ✅ | correct — the high-water mark     |
| `20260622121619` (PR #515, _captured orphan prod migration_) | **inline: lessons, assignments, user_roles only** | update FKs → delete → insert ❌   | regression: partial + wrong order |
| `20260622210000` (PR #517, current)                          | same inline partial                               | same wrong order ❌               | **live definition today**         |

The June 22 orphan migration was written to fix `invite_email` matching but was evidently authored from a pre-April template — it discarded both the unified-function call **and** the corrected ordering. PR #517 then rebuilt name-persistence on top of the regressed body. Nothing later redefines the trigger.

### 5c. Post-claim

- `shadow_link_completed` / `shadow_link_failed` auth events (admin path only — the trigger path logs nothing durable, a spec-06 known follow-up).
- Calendar reconcile swaps future event attendees to the real email (`lib/services/calendar-reconcile.ts`), best-effort with `system_logs` dead-letter — admin path only; the trigger path never enqueues reconcile, so signup-claimed students keep placeholder attendees until something else touches the events.

## 6. Transfer coverage audit

Tables referencing `profiles(id)` vs. what each transfer implementation moves. "Cascade" = rows silently deleted when the shadow row is deleted; "SET NULL" = reference silently nulled.

| Table.column                                                                                                                         | ON DELETE | Trigger (current)              | Unified fn (`20260608000001`)                     |
| ------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------------------------------ | ------------------------------------------------- |
| lessons.student_id / teacher_id                                                                                                      | CASCADE   | ✅                             | ✅                                                |
| assignments.student_id / teacher_id                                                                                                  | CASCADE   | ✅                             | ✅                                                |
| user_roles.user_id                                                                                                                   | CASCADE   | ✅                             | ❌ **cascade-deleted on admin path**              |
| student_repertoire.student_id                                                                                                        | CASCADE   | ❌ **deleted**                 | ✅                                                |
| practice_sessions.student_id (+ stats)                                                                                               | CASCADE   | ❌ **deleted**                 | ✅                                                |
| student_skills.student_id                                                                                                            | CASCADE   | ❌ **deleted**                 | ✅                                                |
| chord_quiz_attempts.student_id                                                                                                       | CASCADE   | ❌ **deleted**                 | ❌ **deleted** (table added 2026-05-10, after fn) |
| chord_srs.student_id                                                                                                                 | CASCADE   | ❌ **deleted**                 | ❌ **deleted** (added 2026-06-19)                 |
| task_management.user_id                                                                                                              | CASCADE   | ❌ **deleted**                 | ❌ **deleted** (never covered)                    |
| song_requests.student_id                                                                                                             | CASCADE   | ❌ **deleted**                 | ✅                                                |
| in_app_notifications.user_id                                                                                                         | CASCADE   | ❌ **deleted**                 | ✅                                                |
| notification_log / queue.recipient_user_id                                                                                           | CASCADE   | ❌ **deleted**                 | ✅                                                |
| notification_preferences.user_id                                                                                                     | CASCADE   | ❌ **deleted**                 | ✅                                                |
| user_settings / user_preferences.user_id                                                                                             | CASCADE   | ❌ **deleted**                 | ✅                                                |
| ai_generations / conversations / usage_stats / agent_execution_logs                                                                  | CASCADE   | ❌ **deleted**                 | ✅                                                |
| theoretical_courses.created_by, course_access.user_id/granted_by                                                                     | CASCADE   | ❌ **deleted**                 | ✅                                                |
| assignment_templates.teacher_id                                                                                                      | CASCADE   | ❌ **deleted**                 | ✅                                                |
| student_repertoire.assigned_by, song_of_the_week.selected_by, audit_log.actor_id, ai_prompt_templates.created_by, profiles.parent_id | SET NULL  | ❌ nulled                      | ✅                                                |
| spotify_matches.reviewed_by, song_requests.reviewed_by                                                                               | (none)    | ❌ blocks delete if referenced | ✅                                                |
| system_logs.user_id                                                                                                                  | SET NULL  | ❌ nulled                      | ❌ nulled (benign)                                |

For a real student the losses that matter most on the trigger path: **repertoire, practice history, skills, chord-trainer progress, song requests, notifications** — i.e. nearly everything the product tracks besides the lesson list. (In practice the FK-order bug means the trigger aborts before deleting anything — the shadow survives and the user gets no profile instead. Two different failure modes, both bad.)

## 7. Findings (ranked)

**C1 — Signup claim is broken for non-empty shadows** (`20260622210000:44-52`). FK updates to `new.id` precede the profile insert → `lessons_student_id_fkey` violation → `EXCEPTION WHEN OTHERS` swallows → auth user created with **no profile row**; shadow untouched. Masked for empty shadows (0-row updates fire no FK check — same masking documented in `20260608000000:16-18`). Affects email signup **and** Google OAuth claim (spec 06 §6.5's collision-hardening rests on this trigger).

**C2 — Even with correct ordering, the inline transfer loses data** (§6 matrix). Any fix that keeps the 3-table inline transfer converts C1's stranded-user failure into silent cascade deletion — arguably worse.

**H1 — Admin link endpoint has the pre-June-8 ordering bug** (`transfer-shadow-references.ts:28→40→58`). Transfer-before-insert, guaranteed by validation to run against a profile-less user. Also non-atomic: three separate calls, so a mid-sequence failure leaves half-moved references with no rollback. Unit tests mock the DB and can't catch either.

**H2 — Unified function has drifted from the schema**: missing `chord_quiz_attempts`, `chord_srs`, `task_management` (all CASCADE), and `user_roles`. No mechanism ties "new table referencing profiles" to "extend the transfer function" — this will keep recurring (see R6).

**M1 — Admin link discards profile attributes**: the new profile insert (`transfer-shadow-references.ts:42-49`) hardcodes `is_student: true` and drops the shadow's `is_teacher/is_admin` flags, `notes`, `phone`, `parent_id`, `created_at`. The trigger path preserves all of these — the two paths disagree about what "the same person" means.

**M2 — Trigger path is unobservable**: no `shadow_link_completed` event, no calendar reconcile enqueued (both exist only on the admin path). A signup-claim leaves no durable trace and stale calendar attendees. (Known spec-06 follow-up, still open.)

**M3 — Legacy shadows are known-but-undeliverable**: import-created shadows carry the real address in `email`, but `getDeliverableEmail` only consults `invite_email` for shadows → returns `null` and skips sends despite knowing the address. No backfill migration (`invite_email = email WHERE is_shadow AND email NOT LIKE 'shadow_%@placeholder.com'`) exists. Defensible as "don't email who never consented," but then the skip-reason should distinguish it; today it's indistinguishable from "no address known."

**M4 — Unconfirmed signup claims a shadow**: the trigger fires on `auth.users` INSERT, before email confirmation. Anyone who signs up with a shadow's (real) email claims its data without proving address ownership. Mitigated by confirmation being required for login, but the transfer has already happened, and the legitimate student later finds their address taken.

**L1 — Trigger's email fallback can grab a non-shadow profile**: the `OR email = new.email` branch doesn't filter on `is_shadow`, so it will transfer-and-recreate a real profile row too. This is intentionally used to survive auth-user deletion (`20260608000003`), but it's an implicit second feature living inside the claim path, undocumented at the call site.

**L2 — Test coverage doesn't touch the failure surface**: `__tests__/shadow-users.test.ts` and `link-shadow-user/route.unit.test.ts` are mocked; the DB-level regression test that spec 06 calls for (`shadow-merge.db.test`, asserting row counts for repertoire/practice after a claim) doesn't exist — `find` shows no `shadow-user-linking.test.ts` anywhere. `scripts/verify/onboarding.ts` (which caught the June 8 bug) exists but isn't in CI.

## 8. Recommended fix plan (ordered)

1. **One new migration restoring the trigger to the June-8 shape while keeping the June-22 improvements**: match by `invite_email` first (from `20260622121619`), persist first/last/full name (from `20260622210000`), and — in the correct order — insert new profile → `transfer_shadow_profile_references(old, new)` → delete shadow. Log claim outcome (see 4).
2. **Extend `transfer_shadow_profile_references`** with `chord_quiz_attempts`, `chord_srs`, `task_management`, `user_roles` (delete-first pattern for any unique constraints).
3. **Collapse the admin path onto one atomic SQL function** — e.g. `claim_shadow_profile(shadow_id, real_user_id, real_email)` doing insert → transfer → delete in a single transaction — and have both the trigger and the API route call it. Fixes H1's ordering and atomicity, and M1's attribute drop (copy the full shadow row's attributes), and removes the two-implementations problem permanently.
4. **Emit `shadow_link_completed` from the DB path** (insert into `auth_events` inside the function, or via a queue row the app processes) and enqueue calendar reconcile for trigger-claims too (spec 06 §6.3 already designed this).
5. **Decide M3 explicitly**: either backfill `invite_email` from legacy real emails, or add a distinct skip reason (`shadow_legacy_email_unconfirmed`). Don't leave it ambiguous.
6. **Regression protection**: a real-DB Jest test (per `reference_local_e2e_runbook`) that seeds a shadow with a lesson + repertoire + practice session, simulates signup (insert into `auth.users` locally), and asserts every table's rows moved and the shadow is gone. Add `scripts/verify/onboarding.ts` to CI or the release checklist. Consider a CI guard that greps new migrations for `REFERENCES profiles` and fails if the transfer function wasn't touched in the same PR.
7. **Guard against future prod/repo drift**: the root cause of C1 was an orphan migration hand-applied to prod. Any hotfix SQL should land in the repo _first_ (or same-day) — worth a line in `deployment-ops.md`.

## 9. Verify live state before acting

Because prod has drifted before, confirm against the remote project (and `uwh` local) before/after fixing:

```sql
-- Which trigger body is actually live?
SELECT pg_get_functiondef('public.handle_new_user'::regproc);

-- Does it call the unified function?
-- (look for 'transfer_shadow_profile_references' in the output)

-- Stranded auth users (C1 symptom): auth user with no profile
SELECT u.id, u.email, u.created_at FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL;

-- Shadows that should have been claimed (invite_email matches a real auth user)
SELECT p.id, p.invite_email FROM public.profiles p
JOIN auth.users u ON u.email = p.invite_email
WHERE p.is_shadow;

-- Current shadow inventory & data-at-risk
SELECT p.id, p.email, p.invite_email,
  (SELECT count(*) FROM lessons l WHERE l.student_id = p.id) AS lessons,
  (SELECT count(*) FROM student_repertoire r WHERE r.student_id = p.id) AS repertoire,
  (SELECT count(*) FROM practice_sessions ps WHERE ps.student_id = p.id) AS practice
FROM profiles p WHERE p.is_shadow;
```

If the stranded-users query returns rows, those are real students whose signup silently failed to claim — they need the admin link path (after H1 is fixed) plus a fresh invite.
