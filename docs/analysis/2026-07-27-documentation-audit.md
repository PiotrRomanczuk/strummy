# Documentation Audit — what's missing, and a concrete roadmap

**Date**: 2026-07-27 · **D0 executed same day — see the correction below**
**Author**: Claude (mechanical checks against the codebase, not a reading impression)
**Scope**: `docs/app-blueprint/**`, root docs, and the generated dashboard, cross-checked against
source, git history and a live Jest run.

---

## TL;DR

The blueprint's **structure** is genuinely good — all ten domain docs carry the full section
skeleton, zero internal links are broken, and the gap-ID system produces briefs an agent can
execute. The problem is not organisation, it is **truth decay in three specific places**:

1. **Ten shipped features are still documented as open work.** Verified against code. The
   blueprint's own rule says "when a gap ships, delete its brief"; that rule stopped being
   applied around 2026-07-19. A fresh agent reading `05-chords-theory.md` today would start
   building the skills hub that shipped on 2026-07-22.
2. **The reference layer has holes where it claims coverage.** `API_REFERENCE.md` is advertised
   as the route reference but is actually an API-key/external-API/widget guide: **105 of 124
   routes and 105 of 105 server actions are undocumented**. 40 env vars used in code are absent
   from `.env.example`. Fifty PL/pgSQL functions — several of them the security boundary — have
   no reference at all.
3. **The decision record has lapsed.** Three ADRs, none since 2026-05-17. Every major decision
   since (DB re-baseline, single design system, cron dispatcher, demo-writes, self-host
   migration) lives only in vault grill notes, i.e. outside the repo.

There _is_ a roadmap and it is well-formed, but it currently sequences work that is blocked on
hardware and people, while the work that actually blocks progress — a red coverage gate that
makes CI impossible — appears nowhere in it. Section 3 proposes a concrete replacement.

---

## 0. Correction, and what D0 actually found

D0 (§3.2) was executed on 2026-07-27. Running it corrected two things in this document:

- **The phantom-brief count was 10; it is actually 26 of 38.** §2.1 spot-checked a dozen gaps
  and generalised. Probing all 38 found that 26 briefs described shipped work — 68% of the gap
  system, not a quarter of it.
- **AIA-2 and ADM-3 were wrongly listed as still open.** Both had shipped; my probes were too
  narrow (`is_helpful` is written through `submitAIFeedback` in `ChatBubble`, and the debug page
  reaches `components/debug` via `DebugDashboardClient` rather than importing it directly). The
  lesson is the obvious one: a grep for a symbol in one file is not a test for whether a feature
  exists.

D0 also surfaced something this audit missed entirely: **ASG-1 is not stale, it is reversed.**
The brief recorded a 2026-07-18 decision to cut the assignment-template stubs and leave the
schema dormant. The stubs were cut on 2026-07-19 — and templates were then built for real on
2026-07-20. A doc claiming a decision that the codebase has since overturned is worse than a
stale one, because it reads as current policy. It is now recorded as a reversal, with the reason
the decision did not hold: the schema and actions already existed, so rebuilding cost hours.

Everything else below stands as written.

## 1. What is solid (don't touch)

| Check                                            | Result                                          |
| ------------------------------------------------ | ----------------------------------------------- |
| Domain docs with the full 8-section skeleton     | **10 / 10**                                     |
| Broken internal links across the blueprint       | **0**                                           |
| Gap IDs defined in a domain doc                  | 38, all with agent-executable briefs            |
| Every baseline table assigned to exactly one doc | yes (62 tables → 10 docs)                       |
| Component + route inventory                      | 324 + 70, generated from source (2026-07-26)    |
| Archival separation                              | dated `analysis/` + `manual-tests/` kept intact |

The precedence rule — blueprint owns _what/how_, vault owns _when_, baseline SQL owns _DDL_ — is
the right call and is respected everywhere I checked.

---

## 2. What is missing or wrong

### 2.1 Phantom work: ten shipped gaps still briefed as open — **highest severity**

Each verified by a code probe, not by reading:

| Gap       | Brief still in            | Evidence it shipped                               |
| --------- | ------------------------- | ------------------------------------------------- |
| **IDA-2** | 01-identity-access.md     | `lib/storage/avatar.ts` exists                    |
| **IDA-3** | 01-identity-access.md     | `LockedAccountsCard` mounted                      |
| **PRA-3** | 04-practice-progress.md   | `StudentDetail.PracticeLog.tsx` exists            |
| **CHT-1** | 05-chords-theory.md       | `getChordsDueCount` consumed by the skills hub    |
| **CHT-2** | 05-chords-theory.md       | `app/dashboard/skills/page.tsx` exists            |
| **ASG-2** | 06-assignments.md         | `getAssignmentHistory` in `lib/services`          |
| **ASG-4** | 06-assignments.md         | `chord_drill` in the assignment schema            |
| **NOT-2** | 07-notifications-email.md | `app/actions/in-app-notifications.ts` is the path |
| **CNT-1** | 09-content-production.md  | the `{false &&}` gate is gone                     |
| **ADM-1** | 10-admin-observability.md | `app/dashboard/logs/page.tsx` exists              |

Genuinely still open, correctly documented: **AIA-2** (`is_helpful` has no UI writer) and
**ADM-3** (debug dashboard still a placeholder).

**Why it matters more than it looks**: the whole value of the gap-brief system is that a fresh
agent session can be handed an ID and trust the brief. Ten phantom briefs mean the system can no
longer be trusted without a code check first — which is exactly the cost it existed to remove.

### 2.2 Reference layer: claims coverage it does not have

| Surface                   | Reality                      | Documented                                |
| ------------------------- | ---------------------------- | ----------------------------------------- |
| REST routes               | 124 `route.ts`               | ~19 (external API + widget only)          |
| Server actions            | 105 exported across 47 files | 0 as a reference                          |
| Env vars                  | 71 read in code              | 40 in `.env.example` (40 missing, 9 dead) |
| PL/pgSQL functions / RPCs | 50 in the baseline           | 0 (prose mentions inside domain docs)     |

`API_REFERENCE.md` is a good document that is **misnamed and mis-advertised**. Both `README.md`
("REST API and Server Actions reference") and the blueprint README ("routes, external API") sell
it as something it never was. It should be `EXTERNAL_API.md`, and the real route surface needs a
separate, _generated_ doc.

The RPC gap is the sharpest of these: ADR-0001 makes the database the security boundary, and
several `SECURITY DEFINER` functions (`claim_shadow_profile`,
`student_toggle_checklist_item`, `transfer_shadow_profile_references`) are load-bearing for
authorization. A reader cannot currently find what they do or who may execute them without
reading the baseline dump.

### 2.3 Freshness metadata is not reliable

- **No `created:`/`updated:` frontmatter at all** — violates the project's own dating rule:
  `DEVELOPMENT.md`, `FORMS_SPECIFICATION.md`, `PRODUCTION_REQUIREMENTS.md`, `USER_GUIDES.md`.
- **Predates the July rebuild** (still stamped 2026-06-16): `ARCHITECTURE.md`,
  `API_REFERENCE.md`, `TESTING.md`, `UI_STANDARDS.md`. `ARCHITECTURE.md` in particular is the
  doc newcomers are pointed at first.
- **Edited without bumping `updated:`**: most domain docs, touched 2026-07-26 during the naming
  purge but still claiming 2026-07-18/22. (Self-inflicted in this session.)

### 2.4 Root docs contradict the repository

- `CONTRIBUTING.md` mandates **Linear tickets** ("NEVER start coding without one") and manual
  `npm version` bumps. Neither is the flow; Linear isn't used and versioning was automated then
  parked.
- `CHANGELOG.md` last entry is **0.65.0 (2026-02-09)**; `package.json` is **0.160.0**. Ninety-five
  versions unrecorded.

### 2.5 No operational runbook — the biggest _risk_ gap

`92-launch-runbook.md` covers the cutover, once. There is nothing for the steady state:
production is down; the Cloudflare tunnel to the home box is dead; restore last night's backup;
roll back a bad deploy; the DB disk filled. Fragments live in `.claude/agents/deployment-ops.md`,
which is agent configuration, not a runbook a human can follow at 23:00.

Given the production database runs on home hardware behind a tunnel, this is the largest
gap between _documented_ and _needed_.

### 2.6 The decision record stopped

Three ADRs, newest **2026-05-17**. Decisions made since, all significant, none recorded as ADRs:

| Decision                                              | Where it lives now            |
| ----------------------------------------------------- | ----------------------------- |
| Squash 173 migrations onto a verified baseline        | vault + `DATABASE_REBUILD.md` |
| One design system; "editorial" name retired           | vault + 00-overview           |
| Cron dispatcher instead of N Vercel schedules         | doc 10 prose                  |
| Demo accounts get real writes (`DEMO_WRITES_ENABLED`) | code comment                  |
| Self-host prod on `StrummyProd`, Vercel keeps the app | vault                         |
| "Reveal when proven" nav policy                       | 00-overview prose             |

These are exactly what ADRs are for: they were contested, they have consequences, and the
reasoning is currently only in a vault note outside the repo.

### 2.7 Testing docs don't know the gate is red

`91-testing-strategy.md` describes the 100% per-file core coverage locks as holding. They don't:
`assignment-edit.ts` 96.0%, `lessons-queries.ts` 84.9%, `lesson-detail-queries.ts` 64.7%.
`npm run test:ci` exits 1 today. The strategy doc also predates the component-level coverage
numbers gathered on 2026-07-26 (67.1% statements; 96 components never executed).

---

## 3. Is there a concrete roadmap? — assessment, then a replacement

### 3.1 Assessment of `90-roadmap.md`

**Good**: five ordered tranches, an explicit ordering principle, a dependency diagram, and each
row points at an executable brief. That is better than most projects manage.

**Where it fails as a working plan right now**:

- **T1 (critical path) is not code.** What remains is buy a UPS, add an uptime monitor, run the
  cutover, invite five students. Nothing in it can be picked up at a keyboard.
- **Its own gate was bypassed.** The diagram says T3 is "BLOCKED on real usage data", yet the
  first T3 slice (CHT-1 + CHT-2 + ASG-4) shipped on 2026-07-22. The roadmap never recorded that,
  so the stated policy and the actual behaviour disagree.
- **It contains ten phantom rows** (§2.1).
- **It omits what actually blocks progress.** The coverage gate is red, so CI cannot be restored,
  so nothing has regression protection. That is the true critical path and it appears nowhere.
- **HYG-1…5 are unsequenced** by design ("not grill-locked"), which in practice means never.

**Verdict**: structurally sound, factually drifted, and pointed at work that is blocked on the
physical world. It needs a truth pass and a second track for code-side work.

### 3.2 Proposed roadmap — sequenced, with acceptance criteria

Ordered so each tranche unblocks the next. Effort is my estimate for an agent session.

#### D0 — Truth repair · ~3h · unblocks everything else

Nothing can be trusted until the docs match the code.

1. Delete the ten shipped briefs (§2.1) and their roadmap rows; add one-line
   `_Shipped YYYY-MM-DD_` notes under the tranche, per the blueprint's own convention.
2. Record in `90-roadmap.md` that the first T3 slice shipped ahead of the usage gate, and either
   restate the gate or drop it.
3. Bump `updated:` on every doc edited since 2026-07-18; add frontmatter to the four docs lacking
   it entirely.
4. Rewrite `CONTRIBUTING.md` to the real flow (branch prefixes → PR body becomes release notes →
   vault tracks state). Truncate `CHANGELOG.md` to a pointer at GitHub Releases.

**Accept**: no gap brief exists for a feature present in `main`; every blueprint doc carries a
`created:`/`updated:` pair; `CONTRIBUTING.md` describes a flow that a new contributor could
actually follow.

#### D1 — Make the gate green, then turn CI back on · ~1 day · unblocks regression safety

The workflow file is already written and deliberately uncommitted because it would be red on
arrival.

1. Cover the three drifted files back to their 100% locks (`assignment-edit.ts` +4pp,
   `lessons-queries.ts` +15pp, `lesson-detail-queries.ts` +35pp — the last is the real work).
2. Commit the single-job workflow (PR + `main` only, concurrency-cancel, no cron, no matrix).
3. Update `91-testing-strategy.md` with the true numbers, including the component-level split.

**Accept**: `npm run test:ci` exits 0; a green run appears on `main`; the strategy doc's numbers
match a fresh run.

#### D2 — Close the reference holes with _generated_ docs · ~1 day

Hand-written surface references rot; these should be produced from source, like the component
inventory already is.

1. `reference/API_SURFACE.md` — all 124 routes: method, path, auth guard, Zod schema, RLS notes.
   Generate from `app/api/**/route.ts`.
2. `reference/SERVER_ACTIONS.md` — 105 actions: file, signature, guard, what it writes.
3. `reference/ENVIRONMENT.md` — the 71 vars actually read, with the 9 dead ones deleted from
   `.env.example`; fold in what `PRODUCTION_REQUIREMENTS.md` was trying to be, and retire that
   file.
4. `reference/DATABASE_FUNCTIONS.md` — 50 functions, flagging `SECURITY DEFINER` and its grants.
5. Rename `API_REFERENCE.md` → `EXTERNAL_API.md` and fix the two READMEs that mis-advertise it.

**Accept**: every `route.ts`, exported action, `process.env.*` read and baseline function appears
exactly once; each doc names the script that regenerates it.

#### D3 — Operational runbook · ~3h · highest risk-reduction per hour

`94-operations-runbook.md`: prod-down triage, tunnel failure, restore from NAS and from R2,
deploy rollback, disk/backup checks, who-to-call-nothing (it's a solo operation). Pull the real
procedures out of `deployment-ops.md` and the vault's P3 notes so a human can follow them under
pressure.

**Accept**: each scenario has a numbered procedure with the exact commands, and the restore path
has been dry-run at least once.

#### D4 — Backfill the decision record · ~3h

Six ADRs for §2.6, written from the vault grill notes while the reasoning is still recoverable.
Cheap now, impossible in six months.

**Accept**: `adr/` covers every decision that changed the architecture in 2026-06/07; each has
`status: accepted` and links from the domain doc it governs.

#### D5 — Test debt, prioritised by blast radius · ongoing

96 components are never executed. Don't chase the number — order by reach:

1. The 9 reachable-but-untested in `dashboard/` (every user sees these)
2. `users/` (6) and `ai/` (6)
3. `providers/` (5) and `theory/` (5)
4. Leave `v2/` (21) until the onboarding wizard settles

**Accept**: no component that a route can reach sits at 0% coverage.

### 3.3 What I would _not_ do

- **Don't hand-write the API reference.** It will drift within a month. Generate it or skip it.
- **Don't renumber gap IDs** while cleaning up — the blueprint's stability rule is right.
- **Don't retro-edit** `docs/analysis/` or `manual-tests/`. They are dated records; their value is
  that they say what was true then.
- **Don't chase 100% component coverage.** The 96-untested figure includes primitives where a
  test would assert nothing.

---

## 4. One-line summary

The documentation system is well-designed and drifting: fix the ten phantom briefs first (D0),
then unblock CI (D1), then generate the four missing reference docs rather than writing them
(D2) — and write the operations runbook before the home-hosted database makes the case for you.

## References

- Component/route/test inventory: [dashboard.html](../app-blueprint/dashboard.html)
- Blueprint conventions: [app-blueprint/README.md](../app-blueprint/README.md)
- Recruiter-facing doc gaps (overlapping, different audience):
  [2026-07-23-recruiter-readiness-plan.md](2026-07-23-recruiter-readiness-plan.md)
