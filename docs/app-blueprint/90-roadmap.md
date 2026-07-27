---
created: 2026-07-18
updated: 2026-07-27
---

# Implementation Roadmap

The ordered plan across every open gap in the blueprint. Each item is one line + a pointer to its
agent-executable brief in the owning domain doc. **No statuses here** — the vault
(`projects/Strummy/Strummy.md`) tracks what's in flight and done; when a gap ships, delete its
brief and its row here.

**Ordering principle** (grill-locked 2026-07-18): the self-host launch is the critical path — the
5 real students are the forcing function. v1 = trust pass: only correctness/honesty work ships
before launch; new student-facing features wait for real usage (v1.1). Debt interleaves only
where it de-risks launch.

## Dependency picture

```
T0 coverage gate ───────── SHIPPED 2026-07-27 · CI restored ─────────────┐
   3 core files were below their 100% locks, so `npm run test:ci`        │
   exited 1 and no workflow could be green. Fixed, and                   ▼
   .github/workflows/ci.yml now runs the gates on PRs and main.  regression safety
                                                                         │
T1 launch (92-runbook) ─── gates student #1 ──────────────┐              ▼
   Code-side riders all shipped; what remains is not      ▼         safe to ship
   code — UPS, uptime monitor, cutover, invite the 5. 5 students live
T2 v1 trust fixes ──────── ALL SHIPPED 2026-07-19
T3 v1.1 parking lot ────── gate did not hold — 5 items shipped early (see T3)
T4 debt ────────────────── 3 items remain
T5 parked/backlog ──────── 4 items remain
```

_Shipped 2026-07-27: the coverage gate is green and CI is back — one job (lint → typecheck →
`test:ci` → integration → build) on PRs and pushes to `main`, no schedule, no matrix. With that
cleared, **T1 is the critical path again**, and it is blocked on hardware and on five people's
email addresses rather than on code._

## Tranche 1 — Self-host launch (blocked on hardware + people, not code)

Procedure + hard gates: [92-launch-runbook.md](92-launch-runbook.md). Summary order:

1. P3 remaining: UPS + pull-the-plug test · external uptime monitor
2. P4 cutover: auth `config.toml` → OAuth to Production → Vercel env repoint → smoke →
   RLS cross-role suite vs StrummyProd
3. P5: dry-run throwaway student → invite the 5 real students

**DB-side fixes on the cutover window** (apply to StrummyProd while it has zero users — each
is a migration + test, small).

_Shipped 2026-07-19: PRA-1 (practice aggregate/undo triggers fixed + PRA-1 RLS-real test green
against live dev DB), NOT-1, ASG-3. Tranche 1's remaining scope is now purely the launch
procedure above (P3–P5), not code._

## Tranche 2 — v1 trust fixes (branch work, any time)

Correctness and honesty on surfaces students/teacher already use. No new features.

_Shipped 2026-07-19: IDA-3 (LockedAccountsCard mounted on the admin dashboard), ADM-1
(SystemLogsTable restored at `/dashboard/logs`), CAL-2 (calendar un-hidden from nav — not in
`CORE_LOOP_HIDDEN_ITEMS`), LES-1/LES-2/IDA-5/ASG-1 (stub routes deleted), NOT-2 (inbox/bell
paths unified onto `in-app-notification-service.ts`). Tranche 2 is now empty._

## Tranche 3 — v1.1 parking lot

The original rule (grill 2026-07-18) was: build nothing here before the 5 students have produced
usage data.

**The gate did not hold, and that is worth recording honestly.** Between 2026-07-19 and
2026-07-23 five T3 items shipped while the launch itself had not happened — so "wait for real
usage" was never actually tested as a policy. What made each of them ship was not usage data but
cheapness: in every case the schema, the actions and the RLS already existed, and only a surface
was missing, so the cost of building was hours rather than days.

| ID            | Shipped    | What made it ship early                                                     |
| ------------- | ---------- | --------------------------------------------------------------------------- |
| IDA-4         | 2026-07-19 | Rode along with the Tranche 2 sweep — one query + one card                   |
| CHT-1 / CHT-2 | 2026-07-22 | Skills hub + due-count nudge; SRS already worked cold                        |
| ASG-4         | 2026-07-22 | Assignable chord drills — reused the existing optional-link pattern          |
| PRA-3         | 2026-07-23 | Teacher practice view — arrived inside the health-aware student detail       |

**Standing decision**: the gate stays for anything that needs *new schema* or that adds a
student-facing surface with no teacher-visible result — that is what it was protecting against.
It does not apply to finishing a surface over machinery that already ships. Achievements and
streaks remain the clearest case of genuinely gated work: no schema exists, and it should not be
designed before real practice history exists to look at.

Still open:

| ID      | What                                                                                | Brief                          |
| ------- | ----------------------------------------------------------------------------------- | ------------------------------ |
| PRA-2   | Tempo ladder (BPM logging already ships; the ladder view is the feature)            | [04](04-practice-progress.md)  |
| THY-1   | Theory LMS activation — blocked on content authoring, not on usage data             | [05](05-chords-theory.md)      |
| SNG-1…4 | Song requests UI · SOTW student card · Spotify match review · song-sections write   | [03](03-songs-repertoire.md)   |
| —       | Achievements / streaks — no schema; design after usage                              | [04](04-practice-progress.md)  |

## Tranche 4 — Debt

| ID / item | What                                                                                                                                  | Where                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Repo      | (T0 and CI restoration shipped 2026-07-27 — see the note below)                                                                       | —                          |
| Repo      | `strummy.app` still parks on Squarespace; `strummy.vercel.app` is canonical everywhere as of 2026-07-26                                | vault                      |
| Cloud     | Decide Cloud project's fate (reconcile or retire) after cutover proves stable                                                          | [92](92-launch-runbook.md) |

_Shipped 2026-07-19: AIA-1 (Ollama fallback model pinned, `ai-agents-e2e` repaired), SNG-5
(`student_song_progress` dropped), IDA-1 (`user_settings` retired), LES-3/CAL-3 (recurring
lesson creation wired + recurring-import dedupe tested against the real DB), Hooks
(`useAIStream`/lesson-form hooks both now under the 150-line rule), and the Lighthouse
audit/Bruno drift audit/Jest quarantine drain parts of "Repo" (quarantine mechanism removed
from `jest.config.ts` entirely)._

## Tranche 5 — Parked / backlog

Marketing tooling and admin niceties; revisit when the need is active, not before.

| ID            | What                                                            | Brief                           |
| ------------- | ---------------------------------------------------------------- | ------------------------------- |
| CNT-2 / CNT-3 | Content scheduling + metrics surfaces                           | [09](09-content-production.md)  |
| CNT-4         | Backfill the real TikTok channel as seed data for the pipeline  | [09](09-content-production.md)  |
| NOT-3         | Admin notification analytics dashboard                          | [07](07-notifications-email.md) |

_Shipped 2026-07-19: CNT-1 (ProductionTab re-enabled), ADM-2/ADM-3 (dead audit_log read
dropped · debug dashboard mounted), AIA-2 (`is_helpful` feedback buttons wired), ASG-2
(assignment_history surfaced as a detail timeline), IDA-2 (avatar storage upload)._

## Cross-cutting — SaaS hygiene (external benchmark, 2026-07-20)

From benchmarking Strummy against a generic Supabase + Next.js SaaS starter
([Razikus/supabase-nextjs-template](https://github.com/Razikus/supabase-nextjs-template)). These
are table-stakes the template bundles that Strummy skipped — **not** grill-locked, so the owner
decides placement against the launch critical path. Full briefs:
[reference/SAAS_HYGIENE_BENCHMARK.md](reference/SAAS_HYGIENE_BENCHMARK.md).

| ID    | What                              | Priority | Brief                                                              |
| ----- | --------------------------------- | -------- | ------------------------------------------------------------------ |
| HYG-1 | MFA (TOTP 2FA) enrollment         | high     | [benchmark](reference/SAAS_HYGIENE_BENCHMARK.md) (→ IDA on pickup) |
| HYG-2 | Legal pages + GDPR cookie consent | high     | [benchmark](reference/SAAS_HYGIENE_BENCHMARK.md) (→ IDA on pickup) |
| HYG-3 | i18n (Polish locale pilot)        | medium   | [benchmark](reference/SAAS_HYGIENE_BENCHMARK.md)                   |
| HYG-4 | Generic file-storage UX           | parked   | [benchmark](reference/SAAS_HYGIENE_BENCHMARK.md)                   |
| HYG-5 | Native mobile (Expo) companion    | backlog  | [benchmark](reference/SAAS_HYGIENE_BENCHMARK.md)                   |

## Open questions (cross-doc index)

Each domain doc keeps its own `## Open questions`; the grill-worthy ones as of 2026-07-18:
student-facing AI ever (08) · `drive_files`/`song_videos` unification (09) ·
streak/achievement design set (04) · `chord_id` orphan risk (05) · ComingSoonCard vs trust pass
(03).
