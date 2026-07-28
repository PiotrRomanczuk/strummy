---
created: 2026-07-28
---

# E2E suite audit — what was broken, what is left

**Date**: 2026-07-28
**Scope**: full Playwright suite (`Desktop Chrome`) against the `StudentDevelopment`
stack, plus the application bugs it surfaced.
**Result**: 37 failures → 3, and six real application bugs found underneath them.

---

## TL;DR

The suite was mostly describing an app that no longer existed — stale selectors, renamed
columns, accounts that had been deleted. But underneath that noise sat **six genuine
bugs**, five of them the same root cause: code assuming `profiles.id == auth.users.id`
after migration `20260727110000` deliberately decoupled them.

The most serious, [#547](https://github.com/PiotrRomanczuk/strummy/pull/547), meant
**every account created since that migration had no roles at all** — redirected to
`/onboarding` permanently, with every role-gated API rejecting them. It went unnoticed
because every seeded test login predates the migration and therefore still has
`id == user_id`. The whole E2E suite passed over a completely broken signup path.

---

## Part 1 — Issues still blocking 100%

Current state: **251 passed · 3 failed · 43 skipped**. None of the three failures is an
unfixed application bug.

| #   | Issue                                                          | Type                    | Root cause                                                                                                                                                                                                                                 | Fix                                                                                                                                  |
| --- | -------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `auth/sign-up-complete` × 2 — duplicate-email, forgot-password | **Suite self-throttle** | The spec has 39 cases, many submitting the form. One full run writes ~43 `signup` rows to `auth_rate_limits`, so the app answers _"Too many sign-up attempts. Please try again in 60 minutes."_ Both pass the moment the table is cleared. | Clear `auth_rate_limits` for **all** operations in global setup — not just `login` — or point these two cases at a throwaway address |
| 2   | `student/lessons-read` — _view lesson detail @mobile_          | **Contention flake**    | Passes in isolation every time; under a full run fails at a _different_ point each time (the lesson link, then `main`). No sibling deletes its row — every teardown is id-scoped.                                                          | **Not diagnosed.** Re-run with `--workers=1` to confirm contention before choosing a fix                                             |
| 3   | 22 × `onboarding/complete-flow` skipped                        | **Coverage gap**        | Each needs an account that has not completed onboarding; skipped individually with _"Requires fresh user account"_                                                                                                                         | Provision a throwaway signup per test — `cross-role/rls-data-isolation` already does exactly this                                    |
| 4   | 11 × `mobile-responsiveness` + 2 × `fretboard` skipped         | **Config, not a gap**   | `test.skip(!isMobile)`; they only run on the mobile projects and this audit ran `Desktop Chrome`                                                                                                                                           | Run the mobile projects, or accept as intentional                                                                                    |
| 5   | E2E absent from CI                                             | **Process**             | No Playwright job exists; the suite needs the LAN dev stack                                                                                                                                                                                | Decide: keep local-only, or run against an ephemeral stack                                                                           |
| 6   | 1 of 7 device projects exercised                               | **Coverage**            | 7 projects are configured; a full-matrix run would have them fight over shared DB fixtures                                                                                                                                                 | Isolate or serialise per-project data before enabling                                                                                |

### Known suite-design hazards

Worth recording because both cost real debugging time during this audit:

- **The login rate limiter is self-inflicted.** Repeated runs saturate
  `auth_rate_limits`, after which specs fail in `beforeEach` with
  `waitForURL` timeouts that look exactly like application bugs. Clear it between runs.
- **`npm test` does not reproduce the CI gate.** CI runs a separate
  `npm run test:integration` step. Two separate regressions during this work were missed
  locally for precisely this reason.

---

## Part 2 — Application bugs found and fixed

| Area                                   | Bug                                                                                                                                                                                                                                                                                                                         | Impact       | Where |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----- |
| `lib/auth/loadAuthedProfile.ts`        | Resolved the profile with `.eq('id', authUserId)` — matching a **profile id against an auth id**. Since `20260727110000` those differ, so the lookup returned null for every account created after it: no roles, permanent `/onboarding` redirect, every role-gated API rejecting. **699 of 851 linked profiles affected.** | **Critical** | #547  |
| `app/actions/song-form.ts`             | `createSongAction` had **no auth check and no demo guard** — it relied entirely on RLS, which permits a demo teacher to insert. Creating a song was the one mutation a demo account could complete.                                                                                                                         | High         | #549  |
| `app/api/api-keys/*`                   | Neither POST nor DELETE called the demo guard, so a demo teacher could mint a real long-lived credential.                                                                                                                                                                                                                   | High         | #549  |
| `app/api/drive/files`                  | Missing demo guard, **and** the same auth-id/profile-id confusion — its staff-role check 403'd every teacher and admin created after the migration.                                                                                                                                                                         | High         | #549  |
| `app/api/song/[id]/videos`             | No demo guard: a demo teacher passed the role check, then failed body validation, answering 400 to a caller who should never have reached it.                                                                                                                                                                               | Medium       | #549  |
| `app/api/song`, `app/api/lessons/[id]` | A malformed id returned **500 with the raw Postgres error text** (`invalid input syntax for type uuid`) instead of 400 — wrong error class, and a needless leak of schema internals.                                                                                                                                        | Medium       | #545  |
| `useAIConversation` / `useAIChat`      | Conversation-creation failure discarded the reason and returned silently. A blocked demo account clicked send and **watched nothing happen** — no message, no toast.                                                                                                                                                        | Medium       | #549  |
| `scripts/.../seed-demo.ts`             | Broken by the same id bug: upserted a profile keyed on the auth id, which collided with the trigger-created row on `profiles_email_key`. The seeder died on its first user.                                                                                                                                                 | Medium       | #548  |

### Still carrying the same root cause

The auth-id/profile-id confusion was fixed at the central seam and in `drive/files`, but
the same comparison remains elsewhere and should be swept:

| File                              | Note                                                                     |
| --------------------------------- | ------------------------------------------------------------------------ |
| `lib/ai/auth.ts:50`               | `.eq('id', user.id)` where `user` comes from `auth.getUser()` — same bug |
| `lib/hooks/useAuth.ts:54`         | Same, client-side                                                        |
| `lib/auth/with-auth.ts:53`        | Takes a `userId` param; provenance needs tracing per caller              |
| `lib/supabase/server-utils.ts:60` | `getOrCreateProfile(userId)`, same question                              |

### Related: raw driver messages returned to clients

`{ error: error.message }` still appears in roughly ten routes — `spotify/*`,
`admin/drive-videos`, `content/*`, `repertoire/bulk`, and the `lessons` collection and
search routes. `mapSupabaseError()` in `lib/api/errors.ts` already exists for this and
documents the rule; those routes simply do not use it.

---

## Part 3 — Test-side defects worth remembering

Not app bugs, but each was hiding one or would have gone red later.

| Defect                                                                                                                                                                                                                                                                                          | Why it matters                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `settings/api-keys` **asserted a vulnerability** — that a student _could_ mint an API key. The app deliberately closed that hole; the test would have failed forever _because the app got safer_. Now asserts the section is absent **and** the route returns 403.                              | A test can encode the bug                                    |
| Three specs matched only `/good (morning\|afternoon\|evening)/`. `greetingFor()` returns five strings, including `"Still here"`/`"Still up"` before 05:00 and `"Late night"` after 22:00 — so they passed by day and failed by night. Found at 22:00.                                           | Latent nightly failure                                       |
| `dashboard/sidebar` had **six** stale assertions across three roles: reveals (`skills`, `fretboard`, `calendar`, `repertoire`, AI) and a relabel (`My Songs` → `Song Library`). Rewritten to derive from `sidebar.helpers`, plus explicit cross-role guards a config-derived test cannot catch. | Drifts every time nav changes                                |
| `song-external-links` looked for `getByRole('link', { name: /YouTube/ })`, but each row renders the service name in a `<span>` and a separate anchor reading `"Open →"`. It could never have passed.                                                                                            | Also an a11y smell: four identical `"Open →"` links per page |
| `workflows` raced its own redirect — `toHaveURL(/\/dashboard\/songs/)` matches instantly because `/dashboard/songs/new` contains that path.                                                                                                                                                     | Read an id of `"new"`                                        |
| `backfill-at-risk` ignored `getAtRiskStudents`' `limit = 5`; the roster already had five never-practised students outranking the seeded one.                                                                                                                                                    | Fixture, not app                                             |
| `sign-up`, `users-management`, `access-control`, `student-onboarding` all pinned `@example.com` addresses and hard-coded UUIDs that stopped existing when accounts moved to `@dev.local`.                                                                                                       | Silent rot                                                   |

---

## References

- Per-spec inventory with user types: [`docs/2026-07-28-e2e-tested-journeys.md`](../2026-07-28-e2e-tested-journeys.md)
- Curated role-oriented catalog: [`docs/app-blueprint/reference/E2E_JOURNEYS.md`](../app-blueprint/reference/E2E_JOURNEYS.md)
- Local run mechanics: [`docs/app-blueprint/reference/TESTING.md`](../app-blueprint/reference/TESTING.md)
