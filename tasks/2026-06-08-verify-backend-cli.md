# Verify Backend CLI — Implementation Plan

**Date**: 2026-06-08
**Branch**: `feature/STRUM-verify-backend-cli`
**Linear**: TBD (STRUM-)
**Scope**: One-shot CLI to verify the two backend paths that matter daily — core CRUD with RLS, and shadow→real user conversion.

---

## Why

Backend correctness is fragmented across Bruno (169M fixtures), Jest unit/integration (175 failing + 60+ quarantined), and Playwright. None of it answers "is the daily-driver path healthy?" in one command. This CLI fills that gap for the two flows that pay for the whole product.

## What

Two verbs, runs against local Supabase (port 54321):

```
npx tsx scripts/verify/index.ts crud [students|lessons|songs|assignments|all]
npx tsx scripts/verify/index.ts onboarding [email]

# npm wrappers
npm run verify              # everything
npm run verify:crud
npm run verify:onboarding
```

Output: pretty terminal trace, `[ok]`/`[fail]` per step, summary, exit code 0/1.

## Approved scope (from clarifying questions, 2026-06-08)

- **Core objects**: students, lessons, songs, assignments
- **Onboarding depth**: full flow including Supabase Auth signup
- **Branching**: fresh branch off main (chore commit handled gitignore noise first)
- **Matrix scope**: happy paths + key denies only (~25 assertions, not full Cartesian)
- **Output**: pretty terminal only at v1 (no `--json` yet)

## Architecture

```
scripts/verify/
├── index.ts                 # entry point + arg parsing + dispatch
├── lib/
│   ├── reporter.ts          # [ok]/[fail] trace, summary, exit code
│   ├── assert.ts            # expectAllowed/expectDenied/expectEq
│   └── fixtures.ts          # seed/teardown known dataset via service client
├── crud/
│   ├── runner.ts            # generic role × verb × object walker
│   └── matrix.ts            # the data-only RLS expectation table
└── onboarding.ts            # 9-step shadow → real flow
```

Reuses `lib/testing/rls/clients.ts` directly (`createServiceClient`, `signInAs`). No new infra.

## Tracer-bullet build order

- [ ] **Step 1 — Skeleton**: `index.ts` + `reporter.ts` + `assert.ts`. `verify --help` prints usage, exits 0. No verifiers yet.
- [ ] **Step 2 — Onboarding verifier** (highest-value first):
  - Service client: create shadow profile (`is_shadow=true`, `invite_email=<email>`) + seed 1 lesson + 1 assignment + 1 student_song_progress under shadow_id
  - Capture shadow_id
  - `supabase.auth.signUp({email, password: 'temp123'})` → fires `trigger_handle_new_user`
  - Poll (up to 5s) for new profile where `user_id = auth.users.id`, `is_shadow=false`
  - Assert: shadow profile deleted, FKs migrated on all 20 related tables (use a SELECT count query per table)
  - `signInAs(email, password)` → real RLS-enforced client
  - Run one query (`select * from lessons where student_id = me`) — assert non-empty (RLS works)
  - Cleanup via service client: delete auth user → cascades clear test data
- [ ] **Step 3 — CRUD runner + lessons matrix**:
  - `fixtures.ts`: seed admin + teacherA + teacherB + studentA (assigned to teacherA) + studentB
  - `matrix.ts` for lessons: rows like `{role: 'teacher', verb: 'update', target: 'own', expect: 'allow'}`
  - `runner.ts`: for each row, signInAs(role) → attempt op → expectAllowed/expectDenied
  - Lessons only at this step: ~7 assertions (student READ own ✓, student READ other ✗, teacher UPDATE own ✓, teacher UPDATE other-teacher's ✗, admin DELETE ✓, student CREATE ✗, teacher CREATE ✓)
- [ ] **Step 4 — Fill remaining matrices**: students (4), songs (7), assignments (7). Target: ~25 total assertions.
- [ ] **Step 5 — Wire npm scripts**: add `verify`, `verify:crud`, `verify:onboarding` to package.json. Brief README section.

Each step is independently demoable. Stopping after Step 2 ships the most valuable verb.

## RLS matrix (data, not code) — v1 happy paths + key denies

| Object      | Role    | Verb   | Target                      | Expect                 |
| ----------- | ------- | ------ | --------------------------- | ---------------------- |
| lessons     | student | READ   | own                         | allow                  |
| lessons     | student | READ   | other                       | deny                   |
| lessons     | teacher | CREATE | —                           | allow                  |
| lessons     | teacher | UPDATE | own                         | allow                  |
| lessons     | teacher | UPDATE | other-teacher's             | deny                   |
| lessons     | admin   | DELETE | any                         | allow                  |
| lessons     | student | CREATE | —                           | deny                   |
| students    | teacher | READ   | assigned                    | allow                  |
| students    | teacher | READ   | not-assigned                | deny                   |
| students    | admin   | UPDATE | any                         | allow                  |
| students    | student | UPDATE | self                        | allow (limited fields) |
| songs       | teacher | CREATE | —                           | allow                  |
| songs       | teacher | READ   | non-deleted                 | allow                  |
| songs       | student | READ   | not-in-own-lesson           | deny                   |
| songs       | student | DELETE | —                           | deny                   |
| songs       | admin   | DELETE | —                           | allow                  |
| songs       | teacher | UPDATE | —                           | allow                  |
| assignments | teacher | CREATE | for-own-student             | allow                  |
| assignments | teacher | CREATE | for-other-teacher's-student | deny                   |
| assignments | student | READ   | own                         | allow                  |
| assignments | student | UPDATE | own.status                  | allow                  |
| assignments | student | UPDATE | other                       | deny                   |
| assignments | admin   | DELETE | any                         | allow                  |
| assignments | teacher | DELETE | own                         | allow                  |
| assignments | teacher | DELETE | other-teacher's             | deny                   |

≈25 assertions. Drives `matrix.ts`.

## Onboarding verifier — 9 steps

1. `[ok]` shadow profile created (id captured)
2. `[ok]` seeded related rows (1 lesson, 1 assignment, 1 song_progress) under shadow_id
3. `[ok]` invite token + email captured (test-mode: skip actual email send)
4. `[ok]` Supabase Auth signup w/ email+password (fires trigger)
5. `[ok]` auth.users row exists, new profile row exists with `user_id=auth.users.id, is_shadow=false`
6. `[ok]` transfer fn migrated 20/20 related tables (count check)
7. `[ok]` shadow profile deleted
8. `[ok]` `signInAs` new user → real RLS query returns the migrated rows
9. `[ok]` cleanup (delete auth user + cascade)

## Files touched

**Created** (new, all small per project SRP rules):

- `scripts/verify/index.ts` (~40 LOC)
- `scripts/verify/lib/reporter.ts` (~80 LOC)
- `scripts/verify/lib/assert.ts` (~30 LOC)
- `scripts/verify/lib/fixtures.ts` (~120 LOC)
- `scripts/verify/crud/runner.ts` (~100 LOC)
- `scripts/verify/crud/matrix.ts` (~80 LOC)
- `scripts/verify/onboarding.ts` (~140 LOC)
- `scripts/verify/README.md`

**Modified**:

- `package.json` (3 new npm scripts)

**Reused** (no changes):

- `lib/testing/rls/clients.ts` (createServiceClient, signInAs)
- `lib/testing/rls/seedTwoTeachers.ts` (fixture inspiration)

## Out of scope (v1)

- Remote Supabase support (local only)
- `--json` output flag
- CI integration (manual run only)
- Performance assertions (latency budgets)
- Mutation testing
- Bruno integration

## Verification before "done"

- `npm run verify` exits 0 against a freshly seeded local Supabase
- All steps print `[ok]`
- Intentionally break one RLS policy in a scratch migration → verifier catches it (exit 1)
- Run lint + typecheck on new files

## Review section (filled after implementation)

_TBD_
