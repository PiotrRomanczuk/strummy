---
created: 2026-07-18
updated: 2026-08-15
---

# Application Overview

## Thesis

Strummy is a **student management system for guitar teachers** — a single-teacher CRM/LMS run by
its owner for his own studio. The teacher schedules lessons, curates a song catalog, assigns
repertoire and homework; students log in to see their lessons, songs, assignments, and log
practice. Around that core sit an AI assistant, a notification engine, Google Calendar sync,
Spotify enrichment, a theory-course LMS, and a video/social content pipeline.

**Current strategic frame** (decided 2026-06-22, reaffirmed in grill 2026-07-18): a **trust pass,
not a feature pass**. The immediate goal is onboarding 5 real students onto a clean self-hosted
production stack (`StrummyProd` on uwh). The student-facing surface must be honest — no
placeholder features — and the working core loop must be reliable. New student-facing features
(gamification, tempo ladder, SRS review) are **v1.1, built after real usage**.

## Roles & access model

Three roles enforced via Supabase RLS: **Admin**, **Teacher**, **Student**, plus a **Parent**
flag whose family portal shipped 2026-07-23 (read-only view of one linked child). The owner is currently the only teacher, and admin
and teacher views coincide in practice. Students never see each other's data — proven by the RLS
cross-read E2E (`tests/e2e/cross-role/rls-data-isolation.spec.ts`). **Shadow students** are
teacher-created profiles without auth accounts, linkable later via invite
(`claim_shadow_profile` / `transfer_shadow_profile_references`).

CRUD rule of thumb (per-domain detail lives in each domain doc): **Admin/Teacher** — full CRUD
on all rows of every domain table. **Student** — reads/writes only own rows; teaching artifacts
(songs, lessons, assignments) are read-only, with a few explicit self-service writes: advance
own assignment status, log practice (immutable; same-day delete = undo), repertoire
self-rating/notes, song requests, own profile/settings/notification preferences.

Full RBAC/RLS mechanics: `docs/app-blueprint/reference/ARCHITECTURE.md`.

## The core loop

```
Teacher schedules lesson ──▶ attaches songs ──▶ teaches ──▶ marks statuses, assigns homework
        ▲                                                            │
        │                                                            ▼
Student practices ◀── sees repertoire + assignments ◀── gets notified (email + in-app)
        │
        └── logs practice sessions ──▶ progress visible to teacher
```

Navigation is intentionally scoped to this loop (`CORE_LOOP_HIDDEN_ITEMS` in
`components/navigation/menuConfig.ts`): teachers see Lessons / Songs / Assignments / Students;
students see My Lessons / My Songs / My Assignments. Everything else remains URL-reachable but
nav-hidden until individually proven.

`menuConfig.ts` is a per-feature **"reveal when proven"** ledger — each hidden item carries its own
reason, so surfacing is a per-feature readiness call, never a blanket flip. The graduation rule
(grill 2026-07-22): a student-facing feature leaves `nav-hidden` by **attaching to the
teacher-driven loop** — assignable, with its outcome visible to the teacher — not by floating as
free self-study. The first such graduation was the chord quiz, via assignable drills, revealed
2026-07-22 (see [90-roadmap.md](90-roadmap.md) §Tranche 3 and docs 05/06). Teacher/admin-only tools (content
planner, cohort analytics, Spotify, Drive) are a **separate** surface the student trust-pass never
governed — they mount to staff nav on their own merits.

## UI generation

**There is exactly one UI generation.** The v1/v2/v3 version-switch machinery, 435 dead
components, the design-preview prototype surface, and Cypress were all deleted in July 2026
(commits `fda52ea7`…`8fb45d5d`). Each core domain has a `components/<domain>/` tree its
pages import. Historical UI-plan record: `tasks/design-preview/`.

That surviving generation was prototyped under the name "editorial", and for a while the name
was everywhere — `components/<domain>/editorial/`, a `*Editorial` suffix on ~190 files, the
`.theme-editorial` wrapper and an `ed-*` class prefix. Since it won, the label distinguished
nothing, so it was retired on 2026-07-26: tokens live in `app/design-tokens.css` under
`.theme-strummy`, component classes use the `ui-` prefix, and components sit directly in their
domain tree under their plain name. Two trees that only existed to be superseded went with it —
the pre-rebuild landing (`components/landing/sections/`) and the pre-wizard onboarding.

**Component inventory**: 324 components across 26 domain trees, of which 19 are currently
unreachable from any route. Every one is listed with a description, size, reachability and test
signal in [dashboard.html](dashboard.html) → Components; the 70 page routes are under → Routes.

**Component test reality** (Jest run over `components/**`, 2026-07-26 — note the repo's normal
coverage config scopes to business logic and skips this tree entirely, so these numbers are not
the ones `npm run test:coverage` prints):

| Signal                                     | Count         |
| ------------------------------------------ | ------------- |
| A test file imports the component directly | 56            |
| Executed only indirectly, via another test | 172           |
| Never executed by any test                 | **96**        |
| Statement coverage                         | 67.1% overall |

Coverage is sharply bimodal — 138 components sit at 100% and 97 at 0% — so the 96.7% median is
misleading on its own. The 96 never-executed components are the honest worklist; the weakest
areas are the admin debug panels (8 of 9 untested) and admin widgets (2 of 2).

## Schema truth

The authoritative schema is `supabase/baseline/cloud_schema_2026-06-22.sql` — 62 tables,
20 enums, ~50 functions, 199 RLS policies — **verified against live StrummyProd on 2026-07-18**:
tables/columns/enums identical. Known post-baseline drift (out-of-band, StrummyProd has no
migration-tracking table):

- 4 added functions: `claim_shadow_profile`, `transfer_shadow_profile_references`,
  `ensure_audit_partitions`, `refresh_song_matviews`
- Patched `handle_new_user` body (persists first/last name; migration `20260622210000`)
- Auto-created partition `audit_log_2027_01`

Generated-types gotcha: two TypeScript type files exist — root `database.types.ts`
(auto-generated, current) and `types/database.types.ts` (legacy, drifted). Use the root file;
regenerate with `npx supabase gen types typescript`.

## Production topology (2026-07-18)

| Stack                                 | Where                                | Role                                                                         |
| ------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------- |
| `StudentManager`                      | uwh, ports 543xx, Cloudflare tunnel  | **Live prod today** (dev-conflated — the problem)                            |
| `StrummyProd`                         | uwh, ports 553xx, systemd auto-start | **Migration target** — clean, backed up (NAS + encrypted R2), restore-proven |
| Supabase Cloud `zmlluqqqwrfhygvpfqka` | cloud                                | Divergent side-copy, 0 live users; schema baseline origin; rollback          |
| Vercel `strummy.online`               | cloud                                | Next.js app; **`main` deploys straight to production**, PR previews disabled |

Cutover procedure: [92-launch-runbook.md](92-launch-runbook.md).

## Maturity legend (used in every domain doc)

| Status              | Meaning                                                              |
| ------------------- | -------------------------------------------------------------------- |
| **mounted**         | Route live and reachable in nav                                      |
| **nav-hidden**      | Built and routed, hidden via `CORE_LOOP_HIDDEN_ITEMS`, URL-reachable |
| **built-unmounted** | Component exists, no route imports it                                |
| **unbuilt**         | Schema/back-end exists, no UI                                        |
| **dormant**         | Table exists, superseded or unused by design                         |
| **aspirational**    | No schema — concept only (v1.1)                                      |

## Domain map (62 tables → 10 docs, + 2 tables → doc 11)

See [README.md](README.md#domain-map). Grouping judgment calls: Calendar merges into Lessons
(sync is a lesson side-effect); Practice splits from Repertoire (song-centric CRM vs
student-centric time series); analytics splits between 04 (student stats) and 10 (admin
dashboards); the 14 `audit_log` partitions get one disposition row, not prose.

[11-skills-assessment.md](11-skills-assessment.md) was added 2026-08-15 for `skills` /
`student_skills` — the teacher's curriculum checklist. Those two tables are **not** among the 62
above: they are absent from the cloud snapshot this section calls authoritative while present in
the migrations baseline. That discrepancy is unresolved; see doc 11 § Open questions.
