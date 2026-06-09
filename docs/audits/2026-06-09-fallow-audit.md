# Fallow Codebase Audit — Strummy / guitar-crm

**Date**: 2026-06-09
**Tool**: [fallow](https://github.com/fallow-rs/fallow) v2.90.0
**Branch base**: `main` @ `9efb6f62` (v0.140.0)
**Scope**: full tree static analysis (dead-code, duplication, complexity, hotspots) + 3-file PR audit

---

## TL;DR

| Surface                                  | Result                                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Health score**                         | **37.6 / 100 — Grade F** (formula v2)                                                                  |
| **Audit verdict (current diff vs main)** | **PASS** — no new regressions on 3 changed files                                                       |
| **Total files analyzed**                 | 2,159 source (272k LOC)                                                                                |
| **Dead code issues**                     | **2,449** (944 unused files, 1,252 unused exports, 232 unused types)                                   |
| **Duplication**                          | **19.2%** of LOC (51,582 dup lines, 961 clone groups)                                                  |
| **Functions over threshold**             | **1,131 / 15,508** (289 critical)                                                                      |
| **Circular dependencies**                | 1 (logger ↔ supabase init cycle)                                                                       |
| **Unused dependencies**                  | 6 (`@nivo/core`, `@tanstack/react-virtual`, `serialize-javascript`, `vaul`, `@usebruno/cli`, `shadcn`) |

The audit gate passes. The repo-wide score is grim, dominated by **dead code (43.7% unused files)**, **duplicated test scaffolding**, and an **abandoned `components/v2/` redesign** that hasn't been deleted.

> Reports live in `.claude/worktrees/fallow-audit/fallow-*.json` (audit, health, dupes, dead-code).

---

## Health Score Breakdown

`37.6 / 100 — F`. Penalties (formula v2):

| Penalty                         | Cost | Why                                                                   |
| ------------------------------- | ---- | --------------------------------------------------------------------- |
| Maintainability                 | -15  | `83.5` avg, but 14.6% of files score low                              |
| Duplication                     | -10  | 19.2% duplicated tokens                                               |
| Unit size                       | -10  | 17.9% of functions are high/very-high risk LOC                        |
| Hotspots                        | -9.1 | Top-20 churn × complexity files                                       |
| Dead files                      | -8.7 | 944 / 2,159 files unreachable                                         |
| Dead exports                    | -6.6 | 1,484 / 4,526 exports unreferenced                                    |
| Unused deps                     | -1.4 | 6 unused packages                                                     |
| Coupling                        | -1.3 | 2.5% of files high fan-in                                             |
| Circular deps                   | -0.3 | 1 cycle                                                               |
| **Complexity (cyclomatic/p90)** | 0    | Most functions stay under threshold individually; size is the problem |

### Vital signs

```
dead_file_pct        43.7%   ← roughly 1 in 2 source files is never imported
dead_export_pct      32.8%   ← 1 in 3 exports is dead
avg_cyclomatic       2.1
p90_cyclomatic       4
maintainability_avg  83.5
duplication_pct      19.2%
unit_size_profile    68.2 low / 13.9 med / 9.9 high / 8.0 very-high
functions_over_60_loc_per_k  80   ← 80 long functions per 1k functions
circular_deps        1
```

The dead-file percentage is the loudest signal. Fallow flags entire directories as orphaned. See [Bucket 1](#bucket-1-dead-codeunused-files).

---

## Bucket 1 — Dead code / unused files

**944 unused files** (43.7% of source tree). Grouped by top-level directory:

|   Count | Directory                                        | Likely meaning                                                     |
| ------: | ------------------------------------------------ | ------------------------------------------------------------------ |
| **268** | `components/v2/`                                 | Abandoned v2 redesign — never wired up                             |
|     125 | `components/songs/`                              | Old song UI variants left behind during refactors                  |
|     115 | `components/dashboard/`                          | Multiple dashboard generations co-exist                            |
|      76 | `components/lessons/`                            | Same pattern — legacy variants                                     |
|      39 | `components/users/`                              |                                                                    |
|      25 | `scripts/database/`                              | One-shot migration scripts, expected                               |
|      23 | `components/settings/`                           |                                                                    |
|      19 | `components/fretboard/`                          |                                                                    |
|      17 | `components/ui/`                                 | shadcn components not yet adopted (expected from `npx shadcn add`) |
|      16 | `components/assignments/`                        |                                                                    |
|      13 | `app/dashboard/`                                 | Page-level orphans                                                 |
|   11–10 | `components/{debug,student,home,profile,shared}` |                                                                    |

**Recommended action**: triage in two passes.

1. **Mass-deletion candidates** (high confidence):
   - ~~`components/v2/`~~ — **NOT SAFE.** v2 is a live UI variant gated by the `strummy-ui-version=v2` cookie. `app/layout.tsx`, `app/onboarding/page.tsx`, `components/layout/AppShell.tsx`, and `components/settings/SettingsPageClient.tsx` all import from `components/v2/`. The 268 "unused" files are internal v2 variants (e.g. abandoned `.Desktop.tsx` / `.Mobile.tsx` siblings) that even v2 itself doesn't reach. Cleaning v2 requires a separate, careful pass — see [Followup A](#followup-a-prune-inside-v2).
   - `tests/helpers/helpers/` — appears to be an accidental nested copy of `tests/helpers/` (see [Bucket 4](#bucket-4-duplication)).
   - Two parallel test trees: `__tests__/api/lessons/*` vs `app/api/lessons/*.test.ts` (see Bucket 4). Pick one location.

2. **Annotate, don't delete**:
   - `scripts/database/` is one-shot migration runners — add a `fallow-ignore-file` comment or extend `entry` in `.fallowrc.json` (none exists yet — see [Bucket 7](#bucket-7-fallow-config-recommendation)).
   - `components/ui/` shadcn primitives are pre-installed for future use; either delete unused ones or list `components/ui/**` as a deliberate exception.

---

## Bucket 2 — Unused exports (1,252 issues)

Top offenders are barrel files (`index.ts`) re-exporting everything the module ships:

| Count | File                              | Note                                                        |
| ----: | --------------------------------- | ----------------------------------------------------------- |
|    29 | `lib/ai/index.ts`                 | Barrel — likely intentional library surface; mark `@public` |
|    28 | `schemas/CommonSchema.ts`         | Many Zod helpers exported unused                            |
|    23 | `lib/music-theory/index.ts`       | Barrel                                                      |
|    22 | `lib/constants.ts`                | Constants left over from removed features                   |
|    21 | `components/lessons/index.ts`     | Barrel                                                      |
|    15 | `lib/ai/registry/index.ts`        | Barrel                                                      |
|    13 | `app/dashboard/theory/actions.ts` | Server actions with no callers                              |
|    12 | `components/profile/index.ts`     | Barrel                                                      |
|    12 | `components/shared/index.ts`      | Barrel                                                      |
|    12 | `lib/database/connection.ts`      | Old dual-DB plumbing                                        |
|    12 | `lib/services/user.service.ts`    |                                                             |

**Pattern**: barrel re-exports inflate the count without representing real dead code. Two fixes:

- Add `"ignoreExportsUsedInFile": true` in `.fallowrc.json` (knip parity).
- Mark library entry points with JSDoc `/** @public */` so fallow keeps them quiet.

The non-barrel ones (`lib/constants.ts`, `lib/database/connection.ts`, `app/dashboard/theory/actions.ts`) are the real signal — likely safe to delete after a quick grep.

---

## Bucket 3 — Large production functions (top 25, tests excluded)

These are functions / React components above ~250 LOC. Above the project's stated **200 LOC component limit** in `CLAUDE.md`.

|   # | LOC | Location                                                          | Symbol                        |
| --: | --: | ----------------------------------------------------------------- | ----------------------------- |
|   1 | 325 | `app/api/spotify/sync/stream/route.ts:10`                         | `POST`                        |
|   2 | 323 | `components/songs/list/SyncSpotifyButton.tsx:32`                  | `SyncSpotifyButton`           |
|   3 | 320 | `components/onboarding/OnboardingForm.tsx:60`                     | `OnboardingForm`              |
|   4 | 317 | `components/navigation/AppSidebar.tsx:50`                         | `AppSidebar`                  |
|   5 | 308 | `components/design-preview/student/StudentHero.tsx:11`            | `StudentHero`                 |
|   6 | 304 | `components/logs/SystemLogs.tsx:189`                              | `SystemLogs`                  |
|   7 | 303 | `components/dashboard/admin/EmailDraftGenerator.tsx:34`           | `EmailDraftGenerator`         |
|   8 | 302 | `components/dashboard/admin/AgentMonitoringDashboard.tsx:40`      | `AgentMonitoringDashboard`    |
|   9 | 301 | `components/design-preview/student/StudentDashboardMobile.tsx:22` | `StudentDashboardMobile`      |
|  10 | 298 | `components/songs/student/StudentSongDetailPageClient.tsx:227`    | `StudentSongDetailPageClient` |
|  11 | 292 | `components/songs/form/Fields.tsx:30`                             | `SongFormFields`              |
|  12 | 289 | `components/dashboard/admin/SpotifyMatchesClient.tsx:196`         | `SpotifyMatchesClient`        |
|  13 | 285 | `app/(auth)/sign-up/page.tsx:15`                                  | `SignUpPage`                  |
|  14 | 282 | `components/design-preview/teacher/TeacherDashboardMobile.tsx:5`  | `TeacherDashboardMobile`      |
|  15 | 279 | `components/settings/ApiKeyManager.tsx:19`                        | `ApiKeyManager`               |
|  16 | 272 | `hooks/useAIStream.ts:80`                                         | `useAIStream`                 |
|  17 | 271 | `components/users/details/UserDetail.tsx:69`                      | `UserDetail`                  |
|  18 | 269 | `app/(auth)/sign-in/page.tsx:19`                                  | `SignInPage`                  |
|  19 | 269 | `app/actions/teacher/dashboard.ts:122`                            | `getTeacherDashboardData`     |
|  20 | 267 | `app/api/spotify/sync/stream/route.ts:55`                         | `start` (inner fn of POST)    |
|  21 | 265 | `app/api/calendar-sync/route.ts:16`                               | `GET`                         |
|  22 | 262 | `components/design-preview/teacher/TeacherDaySpine.tsx:19`        | `TeacherDaySpine`             |
|  23 | 261 | `lib/services/notification-service.ts:62`                         | `sendNotification`            |
|  24 | 260 | `components/songs/form/Content.tsx:46`                            | `SongFormContent`             |
|  25 | 257 | `components/landing/Landing.FretboardScreenshot.tsx:28`           | `LandingFretboardScreenshot`  |

**Where to start**: the four `design-preview/` files are also unused (see Bucket 1) — they may delete themselves. After that, `SyncSpotifyButton`, `OnboardingForm`, `AppSidebar`, and `SystemLogs` are real components carrying weight; classic split-into-sub-components candidates.

---

## Bucket 4 — Duplication (19.2% of LOC)

961 clone groups, 2,291 instances, **51,582 duplicated lines**. Sorted by impact (token_count × instances):

|   # | Tokens | Lines | Instances | What                                                                                                  |
| --: | -----: | ----: | --------: | ----------------------------------------------------------------------------------------------------- |
|   1 |  6,263 | 1,931 |         2 | **`database.types.ts` (root)** ↔ `types/database.types.generated.ts` — pick one                       |
|   2 |  3,476 |   997 |         2 | Same database.types twins, earlier lines                                                              |
|   3 |  2,094 |   408 |         2 | **`__tests__/api/lessons/route.test.ts` ↔ `app/api/lessons/route.test.ts`**                           |
|   4 |  1,954 |   445 |         2 | **`tests/helpers/cleanup.ts` ↔ `tests/helpers/helpers/cleanup.ts`** (nested dup)                      |
|   5 |  1,291 |   368 |         3 | `database.types.ts` ↔ `types/database.types.generated.ts` ↔ `types/database.types.ts` (triplet!)      |
|   6 |  1,913 |   395 |         2 | `__tests__/api/lessons/[id]/route.test.ts` ↔ `app/api/lessons/[id]/route.test.ts`                     |
|   7 |  1,884 |   381 |         2 | `__tests__/api/lessons/bulk/route.test.ts` ↔ `app/api/lessons/bulk/route.test.ts`                     |
|   8 |  1,884 |   375 |         2 | `__tests__/api/song/handlers.test.ts` ↔ `app/api/song/handlers.test.ts`                               |
|   9 |  1,747 |   294 |         2 | `__tests__/api/lessons/search/route.test.ts` ↔ `app/api/lessons/search/route.test.ts`                 |
|  10 |  1,715 |   312 |         2 | `__tests__/components/auth/SignInForm.test.tsx` ↔ `components/auth/SignInForm.test.tsx`               |
|  11 |  1,518 |   278 |         2 | `__tests__/components/auth/ResetPasswordForm.test.tsx` ↔ `components/auth/ResetPasswordForm.test.tsx` |
|  12 |     54 |    14 |    **49** | Boilerplate page header repeated across 49 admin pages                                                |

**Two systemic causes**:

1. **Parallel test trees.** Many test files live both under `__tests__/<area>/...` AND co-located as `app/<area>/...test.ts(x)`. Almost certainly the result of an incomplete migration. Pick one convention and delete the other — this alone will erase ~6,000+ duplicated lines.
2. **Triple-copy of generated DB types.** `database.types.ts` (root), `types/database.types.ts`, and `types/database.types.generated.ts` all carry the Supabase schema. Choose one canonical path (likely `types/database.types.generated.ts`) and delete the rest.
3. **`tests/helpers/helpers/cleanup.ts`** — almost certainly a copy/paste accident. The nested `helpers/helpers/` directory shouldn't exist.

Together, fixing 1–3 should drop duplication from 19% to roughly 5%.

---

## Bucket 5 — Duplicate exports (10 conflicts)

Same symbol exported from two modules — confusing for IDE imports and risky during refactors.

| Symbol                  | A                                                    | B                                            |
| ----------------------- | ---------------------------------------------------- | -------------------------------------------- |
| `CHROMATIC_NOTES`       | `lib/music-theory/chromatic.ts:5`                    | `lib/music-theory/notes.ts:1`                |
| `CreateRepertoireInput` | `schemas/StudentRepertoireSchema.ts:64`              | `types/StudentRepertoire.ts:48`              |
| `UpdateRepertoireInput` | `schemas/StudentRepertoireSchema.ts:65`              | `types/StudentRepertoire.ts:59`              |
| `DatabaseType`          | `lib/database/connection.ts:19`                      | `lib/database/middleware.ts:24`              |
| `HOME_ITEM`             | `components/dashboard/Sidebar/sidebar.helpers.ts:23` | `components/navigation/menuConfig.ts:36`     |
| `LessonEmailData`       | `lib/email/send-lesson-email.ts:6`                   | `lib/email/templates/lesson-recap.ts:18`     |
| `LessonReminderData`    | `lib/email/templates/lesson-reminder.ts:16`          | `types/notifications.ts:160`                 |
| `Song`                  | `components/songs/types/index.ts:7`                  | `schemas/SongSchema.ts:173`                  |
| `Table`                 | `components/assignments/list/Table.tsx:108`          | `components/ui/table.tsx:108`                |
| `resolveConflict`       | `app/actions/calendar-conflicts.ts:67`               | `lib/services/sync-conflict-resolver.ts:123` |

Schemas vs `/types/` collisions (Song, CreateRepertoireInput, etc.) suggest the Zod inferred type and a hand-rolled type both exist. Standard fix: `export type X = z.infer<typeof XSchema>` from the schema only, delete the `/types/` twin.

---

## Bucket 6 — Architecture

- **Circular dependency** (1, 5-file cycle):

  ```
  lib/logger.ts
    → lib/supabase/config.ts
    → lib/supabase/admin.ts
    → lib/logger/supabase-destination.ts
    → lib/logger/pino-backend.ts
    → lib/logger.ts
  ```

  Initialization-order risk. Standard fix: extract the bare minimum supabase config (env-only, no logging) into a leaf module that both `lib/logger/*` and `lib/supabase/*` can depend on without cycling back.

- **Boundary violations**: 0 (no enforced boundaries configured; could add `boundaries.preset` in fallow config).

- **Unresolved import**: `__tests__/components/users/UserFormFields.test.tsx` imports `@/components/users/UserFormFields` which no longer exists. The test is stale.

- **Unlisted dependencies** (imported but not declared in `package.json`):
  - `@jest/globals` — used in 5 history/database test files
  - `@testing-library/cypress` — `cypress/support/e2e.ts`
  - `cypress` — `cypress.config.ts`

  Cypress files are leftovers (Playwright is the documented E2E tool). Either remove the cypress directory or list the deps.

- **Unused production dependencies** (4):
  - `@nivo/core`, `@tanstack/react-virtual`, `serialize-javascript`, `vaul`
- **Unused devDependencies** (2):
  - `@usebruno/cli`, `shadcn`

  Bruno is an API client; `shadcn` is normally a one-shot `npx` — not needed in deps. Safe to drop both.

---

## Bucket 7 — Refactor targets (fallow's own ranking, top 10)

Priority-weighted by complexity × churn × effort:

|   # | Priority | Effort   | File                                                                        |
| --: | -------: | -------- | --------------------------------------------------------------------------- |
|   1 |     55.9 | **high** | `components/songs/form/helpers.ts`                                          |
|   2 |     42.4 | medium   | `components/v2/songs/SongForm.tsx` (also dead)                              |
|   3 |     41.7 | medium   | `app/dashboard/theory/actions.ts`                                           |
|   4 |     39.6 | medium   | `components/songs/production/hooks/useContentPosts.ts`                      |
|   5 |     39.0 | medium   | `components/songs/production/hooks/useHashtagSets.ts`                       |
|   6 |     38.8 | medium   | `components/songs/list/Table.SongRow.tsx`                                   |
|   7 |     38.1 | medium   | `components/settings/NotificationPreferences/useNotificationPreferences.ts` |
|   8 |     37.9 | medium   | `components/dashboard/admin/drive-videos/useDriveVideos.ts`                 |
|   9 |     37.4 | medium   | `components/dashboard/cohorts/cohort.helpers.ts`                            |
|  10 |     36.2 | medium   | `components/users/details/repertoire.helpers.ts`                            |

`components/songs/form/helpers.ts` is fallow's #1 pick. Worth pulling up next time you touch song forms.

### Hotspots (churn × complexity, last 6 months)

Top files combining high commit frequency with high complexity density:

```
 1. app/dashboard/page.tsx                                    (23 commits, +478/-317)
 2. app/api/users/route.ts
 3. components/dashboard/student/StudentDashboardClient.tsx
 4. components/layout/AppShell.tsx
 5. components/songs/form/helpers.ts                          ← also #1 refactor target
 6. components/songs/list/Table.tsx
 7. components/songs/form/Content.tsx                         ← 260 LOC
 8. app/dashboard/actions.ts
 9. app/actions/teacher/dashboard.ts                          ← 269 LOC
10. app/actions/ai.ts
```

`app/dashboard/page.tsx` and `app/actions/teacher/dashboard.ts` are touched constantly — every regression that lands there ships to every user. Worth a targeted refactor pass.

---

## Recommended action plan

### Phase 1 — Mass deletion (1–2 hours, very high signal/effort)

1. ~~Delete `components/v2/`~~ — **NOT SAFE**, v2 is the live cookie-toggled UI. See [Followup A](#followup-a-prune-inside-v2) for the right way to prune it.
2. Delete `tests/helpers/helpers/` (nested duplicate).
3. Pick one home for tests (`__tests__/` OR co-located `*.test.ts(x)`) and delete the other side. Look at the migrations 2 weeks ago in git log to see which side is newer.
4. Pick one canonical `database.types*.ts` and delete the other two.
5. Delete stale test: `__tests__/components/users/UserFormFields.test.tsx`.
6. Drop unused deps: `npm uninstall @nivo/core @tanstack/react-virtual serialize-javascript vaul @usebruno/cli shadcn`. (Sanity-check `vaul` first — it's the shadcn drawer primitive; might be used via dynamic import).

Expected impact (revised, without v2 deletion): health score F → D-, dead-file pct from 43.7% to ~30%, duplication from 19% to ~5%.

### Followup B — Consolidate `database.types*.ts` properly

Skipped from Phase 1 because the three files have **different sizes** (96KB/72KB/89KB) — they were generated from different snapshots of the Supabase schema and may have non-overlapping tables. Safe path:

1. Regenerate a fresh `types/database.types.ts` from the current schema:
   ```bash
   npx supabase gen types typescript --local > types/database.types.ts
   # or via the Supabase MCP: mcp__supabase__generate_typescript_types
   ```
2. Delete `database.types.ts` (root) and `types/database.types.generated.ts`.
3. Replace 28 `@/database.types` and 1 `@/types/database.types.generated` imports with `@/types/database.types`.

`lib/supabase.ts` already re-exports from `@/types/database.types` — that's the canonical re-export point; downstream code should import from `@/lib/supabase` ideally, not the types file directly.

### Followup A — Prune inside `components/v2/`

`components/v2/` is live but bloated: fallow flags 268 files as unreachable even from v2's own entry points. To clean safely:

1. List v2's true entry points (files imported from outside v2):
   - `app/dashboard/songs/loading.tsx` → `SongListPageSkeleton`
   - `app/onboarding/page.tsx` → `OnboardingV2`, `OnboardingV2Boundary`, `OnboardingStitch`
   - `components/layout/AppShell.tsx` → `AppShellV2`
   - `components/settings/SettingsPageClient.tsx` → `UIVersionToggle`
2. Re-run `fallow dead-code --production` with those entry points pinned in `.fallowrc.json` (`entry: [...]`).
3. For each remaining unused file under v2, delete in small batches (e.g. one feature area at a time) with `npm run lint && npm test` between commits.

Likely high-value targets within v2: dual `.Desktop.tsx` / `.Mobile.tsx` pairs where only one is wired up, and `.Skeleton.*` files that nothing renders.

### Phase 2 — Resolve duplicate exports (1 hour)

Walk the 10 duplicate exports (Bucket 5). Standard pattern: keep the `z.infer` in the schema, delete the parallel `/types/` definition. `Song`, `CreateRepertoireInput`, `UpdateRepertoireInput`, `LessonReminderData`, `LessonEmailData` all match this shape.

### Phase 3 — Break the logger cycle (30 min)

Extract a `lib/supabase/env.ts` with just env reads. `lib/supabase/config.ts` and `lib/logger/*` both consume it instead of each other.

### Phase 4 — Add `.fallowrc.json` so future audits are calibrated

Currently fallow runs zero-config. Add:

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/fallow-rs/fallow/main/schema.json",
  "entry": ["scripts/**/*.ts", "supabase/functions/**/*.ts"],
  "ignorePatterns": ["components/ui/**", "**/*.generated.ts"],
  "ignoreDependencies": [],
  "ignoreExportsUsedInFile": true,
  "boundaries": { "preset": "feature-sliced" },
  "rules": {
    "unused-files": "error",
    "unused-exports": "warn",
    "unused-types": "warn",
    "circular-dependencies": "error",
  },
}
```

Then wire `fallow audit` into the existing `npm run lint && npm test` chain via `.husky/` or a new GitHub Action step.

### Phase 5 — Split the >250 LOC components (ongoing)

Use Bucket 3 as the worklist. The 4 `design-preview/` entries delete themselves in Phase 1; the rest are real refactors. Target one per PR with proper test coverage.

---

## Artifacts

- `fallow-audit.json` — PR audit (gate result)
- `fallow-health.json` — score, hotspots, targets, large_functions
- `fallow-dead-code.json` — dead-code findings (full tree)
- `fallow-dupes.json` — clone groups

All live in `.claude/worktrees/fallow-audit/` on branch `chore/STRUM-fallow-audit`.

## How to re-run

```bash
cd .claude/worktrees/fallow-audit   # or wherever fallow is installed
./node_modules/.bin/fallow audit --format json > fallow-audit.json
./node_modules/.bin/fallow health --score --hotspots --targets --top 20 --format json > fallow-health.json
./node_modules/.bin/fallow dupes --format json > fallow-dupes.json
./node_modules/.bin/fallow dead-code --format json > fallow-dead-code.json
```

For an interactive run: drop `--format json` and read the colored output.
