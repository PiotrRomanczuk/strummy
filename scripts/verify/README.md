---
created: 2026-06-08
updated: 2026-06-08
---

# Backend Correctness CLI

One-shot CLI to verify the two backend paths that matter daily:

1. **CRUD with RLS** — does each role (admin/teacher/student) see/edit/delete only what they should?
2. **Shadow → real user conversion** — does the `handle_new_user` trigger + `transfer_shadow_profile_references` actually migrate all FKs when a shadow student signs up?

Runs against a local Supabase. Exit code `0` (green) / `1` (red). Pretty terminal output, per-step trace.

## Usage

```bash
npm run verify              # show help
npm run verify:onboarding   # full shadow → real flow with seeded fixtures + auth signup
npm run verify:crud         # walk the lessons RLS matrix (more objects soon)

# or directly:
npx tsx scripts/verify/index.ts onboarding test+verify@strummy.app
npx tsx scripts/verify/index.ts crud lessons
```

## Env

The CLI reads (in order of preference):

```
NEXT_PUBLIC_SUPABASE_LOCAL_URL          (default: http://127.0.0.1:54321)
SUPABASE_LOCAL_SERVICE_ROLE_KEY         (required)
NEXT_PUBLIC_SUPABASE_LOCAL_ANON_KEY     (required)
```

**Heads up**: on Piotr's setup the local Supabase actually runs on `uwh` (EliteDesk), not on this Mac. Override URL at invocation:

```bash
# LAN-direct (only works from curl/ping, NOT from Node — see ACCESS.md)
# Use Tailscale instead:
NEXT_PUBLIC_SUPABASE_LOCAL_URL=http://100.86.245.121:54321 npm run verify:onboarding
```

See project `CLAUDE.md` → "Database Connection" for details.

## What each verifier does

### `onboarding <email>`

9-step end-to-end check (see `onboarding.ts`):

1. Look up an existing teacher in the DB
2. Insert a shadow profile with `invite_email = <email>`
3. Seed 3 related rows under the shadow (lesson, assignment, in-app notification)
4. Fire `auth.admin.createUser({ email, password, email_confirm: true })` — this should trigger `handle_new_user`
5. Poll for profile swap (shadow deleted, new profile linked with `is_shadow=false`)
6. Assert lessons FK migrated to the new user_id
7. Assert assignments FK migrated
8. Assert in_app_notifications FK migrated
9. Sign in as the new user via `signInWithPassword`, run an RLS-real query, confirm visibility
10. Cleanup: delete the auth user (cascades), explicitly delete fixture rows

### `crud <object|all>`

Data-driven matrix walker (see `crud/matrix.ts`):

- Seeds: existing admin/teacherA/studentA from demo seeds + ephemeral teacherB/studentB + 2 lessons
- Signs in as each role once (cached client)
- Walks the matrix — for each cell, runs the operation against the right client and asserts `expectAllowed` or `expectDenied`
- Tears down: deletes ephemeral users (cascades) + test lessons

Current matrix coverage:

| Object      | Cells                                           |
| ----------- | ----------------------------------------------- |
| lessons     | 9 (happy paths + key denies across all 3 roles) |
| students    | TBD                                             |
| songs       | TBD                                             |
| assignments | TBD                                             |

Adding a new object means: (1) extend fixtures.ts to seed the relevant rows, (2) define a `<OBJECT>_MATRIX` array in `crud/matrix.ts`, (3) register it in `crud/runner.ts`.

## Architecture

```
scripts/verify/
├── index.ts                     # entry point + arg parsing + dispatch
├── onboarding.ts                # 9-step shadow → real verifier
├── lib/
│   ├── reporter.ts              # [ok]/[fail] trace + summary + exit code
│   ├── assert.ts                # expectAllowed / expectDenied
│   ├── fixtures.ts              # seedCrudFixtures + cleanup
│   └── supabase-clients.ts      # createServiceClient + signInAs (CLI-local copy)
└── crud/
    ├── runner.ts                # generic role × verb walker
    └── matrix.ts                # the data-only RLS expectation table
```

`lib/supabase-clients.ts` is a CLI-local copy of `lib/testing/rls/clients.ts` — needed because the test harness's `env.ts` references Jest's `describe` global at module load (throws when imported outside Jest). When that coupling is split, this file can be deleted.

## What the verifier has caught (2026-06-08, first run)

1. **`handle_new_user` step-ordering bug** — the trigger called `transfer_shadow_profile_references` before inserting the new profile, so FK updates pointed at a non-existent row. Fix in `supabase/migrations/20260608000000_fix_handle_new_user_order.sql`.
2. **uwh schema_migrations drift** — only 1 row in `supabase_migrations.schema_migrations` vs 148 in repo; 7 tables the transfer function expects (`student_skills`, `user_settings`, `user_preferences`, `notification_*`, `audit_log`) are missing on uwh.
3. **Transfer function isn't defensive** — only `student_song_progress` has an `IF EXISTS` guard. Missing tables break the whole shadow→real flow.
4. **`track_lesson_changes` audit trigger can't record DELETE events** — inserts into `lesson_history` with `OLD.id` after the lesson is gone. FK violation. Either defer the FK or move the trigger to `BEFORE DELETE`.

## Not in scope (v1)

- Remote Supabase support (local only)
- `--json` output (terminal only)
- CI integration (manual run)
- Performance budgets
- Mutation testing
- Bruno integration
