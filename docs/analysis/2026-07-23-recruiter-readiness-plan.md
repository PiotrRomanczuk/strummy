# Recruiter-Readiness Plan — Docs vs. Reality

**Date**: 2026-07-23
**Author**: Claude (2 parallel audit agents + vault/live-site verification, synthesized)
**Scope**: Every doc in the repo cross-checked against code, live site, DNS, and GitHub state. Output: a prioritized plan to make Strummy maximally impressive to recruiters.

---

## TL;DR

The codebase is **stronger than its own documentation claims** — and the README is wrong in both directions. It _undersells_ verified strengths (claims "1,100+ tests" when there are ~3,292 in 281 suites; claims "15+ tables / 50+ RLS policies" when there are 62 tables / 199 policies) while _overselling_ with claims that fail on first click or first interview question:

- The demo link `strummy.app` (used in 5 places) serves a Squarespace **"Coming Soon"** parking page.
- The CI badge advertises an "11-job pipeline" — **all workflows were deleted 2026-07-21**; the Actions tab is empty.
- The README advertises **2FA (TOTP)** — grep confirms zero MFA code exists (it's open gap HYG-1).
- All **7 links in the Documentation table 404** (files moved into `docs/app-blueprint/` on 2026-07-18).
- Screenshots are from **April** — the pre-editorial UI that no longer exists.
- The GitHub repo description says **"Stripe. Paying users since 2024."** — there is no billing integration (landing pricing is labeled "planned") and the claim predates the project.

Strategy: **make every claim true, then make the truth loud.** The order below is by recruiter-visible ROI per hour.

---

## Part A — Findings

### A1. Breaks on first click (P0)

| #   | Defect                                         | Evidence                                                                                                     |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | `strummy.app` → Squarespace "Coming Soon" page | DNS = squarespacedns.com; domain is owned but never pointed at Vercel. README references it 5×; CV links too |
| 2   | README Documentation table: 7/7 dead links     | Files merged into `docs/app-blueprint/reference/` 2026-07-18                                                 |
| 3   | CI/CD badge → empty Actions tab                | All 6 workflows deleted in `3b6bf9d8` (2026-07-21); only `.github/workflows/README.md` remains               |
| 4   | 7 README screenshots show the pre-editorial UI | `public/screenshots/*.png` all dated 2026-04-27; the app was fully redesigned since                          |

### A2. False claims — interview landmines (P0)

A recruiter or interviewer probing any of these hits a contradiction:

| README / repo claim                                                    | Reality                                                                                                                                                                     |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "2FA (TOTP), session activity tracking"                                | No `supabase.auth.mfa.*` usage anywhere; HYG-1 open gap ("the one real security gap")                                                                                       |
| Demo accounts are "read-only… all write operations disabled"           | Opposite: `DEMO_WRITES_ENABLED` gives demo accounts real writes + reseed (shipped `edd62e3a`)                                                                               |
| "11-job GitHub Actions pipeline with automated semantic versioning"    | Zero workflows; version bumps are currently manual                                                                                                                          |
| Deployment table: `main` → Preview/Staging, `production` → strummy.app | `main` deploys straight to production; previews disabled (`vercel.json ignoreCommand`, PR #520); git `production` branch is vestigial, 335 commits behind, HEAD 2026-04-26  |
| "12 Vercel cron endpoints"                                             | 14 cron routes exist, only 7 scheduled in `vercel.json`; 7 unscheduled (incl. `lesson-reminders`, `assignment-due-reminders`, `dispatcher`)                                 |
| Repo description: "Stripe. Paying users since 2024."                   | No billing code; landing pricing self-labels "planned"; project started 2026                                                                                                |
| "Used daily by 20–30 real teachers and students"                       | Blueprint: single-teacher studio, onboarding **5 real students** (P5 unshipped); live data was partly RLS-test debris. Decide one defensible phrasing and use it everywhere |
| "129 SQL migrations"                                                   | 27 files — deliberately squashed to a clean baseline 2026-07-18 (`docs/DATABASE_REBUILD.md`). This is a _better_ story than 129                                             |
| "~254,000 LOC across 6,900+ source files"                              | ~1,301 source `.ts/.tsx` files; ~156k LOC in app/components/lib. 6,900 only reconciles if generated files were counted                                                      |

### A3. Underclaims — free upgrades (P0, same README pass)

Verified numbers to paste (re-verify at edit time):

| Metric   | README says                              | Actual                                                                                                              |
| -------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Tests    | "217 test files, 1,100+ cases"           | **281 unit suites + 16 integration + 17 RLS suites; ~3,292 tests** (per-file 100% coverage locks on ~50 core files) |
| E2E      | (implies little)                         | **54 Playwright specs**, 7 device projects, incl. a cross-role **RLS isolation suite against real PostgREST**       |
| Database | "15+ tables, 50+ RLS policies, 13 enums" | **62 tables, 199 RLS policies, 20 enum types**                                                                      |
| API      | "107 REST endpoints"                     | **124 route files** + 36 server-action files                                                                        |
| Version  | CLAUDE.md says 0.113.0                   | **0.160.0**                                                                                                         |

### A4. Doc rot (P2 — matters to the recruiter who digs, and to interview consistency)

- `CHANGELOG.md` last entry **v0.65.0, 2026-02-09** (current: 0.160.0).
- `CLAUDE.md`: version 0.113.0, "244 suites", "5 journey specs", wrong deployment model, and Supabase stack names that directly contradict `00-overview.md` (StudentDevelopment/StudentProduction vs StudentManager/StrummyProd).
- `CONTRIBUTING.md` mandates Linear tickets + manual `npm version` + manual CHANGELOG — none of which is the actual flow.
- `reference/PRODUCTION_REQUIREMENTS.md` — dead artifact (titled "Guitar CRM", cites deleted `cypress/`), yet still listed as a live reference.
- `reference/TESTING.md` frozen at 2026-06-16 — predates the editorial refactor and DB rebuild.
- `tasks/todo.md` frozen at 2026-06-16 with items independently verified shipped.
- **~400 committed CI log files** in `logs/history/ci/` — visible noise for anyone browsing the tree.
- `claude design - mockups/STATUS.md` says "Batch 02 — incoming: Empty." while **28 untracked HTML bundles** sit in that folder.
- Two parallel standards systems: `.claude/rules/` vs `.github/instructions/` + 11 `.github/agents/` Copilot files, no cross-reference.

### A5. Code-side items a reviewing engineer would notice (P3)

- Coverage gate **currently red** per `93-design-mockup-audit.md` (`assignment-edit.ts` 98.17%, `lessons-queries.ts` 81.97% vs 100% locks).
- **10 local branches** (own rule: max 5) + ~8 stale `origin/dependabot/*` remotes.
- Git `production` branch 335 commits behind main — misleading artifact.
- Duplicate dependency pairs: `recharts` + 4×`@nivo/*`; `exceljs` + `xlsx`; `radix-ui` meta + 18 individual `@radix-ui/*`.
- 10 components breach the repo's own 200-LOC rule (worst: `SongImportForm.tsx` 421); 40 `any` occurrences; 15 "Coming soon" stubs URL-reachable (nav-hidden — acceptable, deliberate).
- **Parent role gets an empty sidebar** — `getMenuGroups()` has no `isParent` branch, yet the parent dashboard shipped this week.

---

## Part B — The Plan

### P0 — Credibility pass (~half a day; do before sending any application)

1. **Point `strummy.app` at Vercel** (~30 min). Domain is owned, parked at Squarespace DNS. Add the domain to the Vercel project, update A/CNAME records at Squarespace. Fallback if anything blocks: replace all 5 README references + repo homepage with `strummy.vercel.app`. _Accept: `https://strummy.app` serves the app._
2. **README truth pass** (one PR, ~2–3 h):
   - Fix the 7 dead Documentation links → `docs/app-blueprint/…` paths; add a line selling the blueprint system itself (it's a differentiator).
   - Delete the 2FA claim (replace with real, verifiable security: RLS as the boundary + 199 policies, account lockout, rate limiting, HMAC webhook auth, RLS isolation E2E suite).
   - Update every metric per table A3 — the true numbers are better.
   - Demo section: keep credentials table, reword to "writes enabled, sample data resets" honestly.
   - Deployment table → `main` auto-deploys to production; drop the preview/staging fiction.
   - Retake 5–7 screenshots in the current editorial UI with freshly reseeded demo data (teacher dashboard, lessons, song detail, assignments, student view, fretboard). Add role captions.
   - Replace the static CI shield with a **real** workflow status badge (after step 3); add a license and a TOC.
   - Pick one defensible user-count phrasing ("in production use in a real teaching studio; built solo, used daily for real lessons") and use it in README + repo description + CV.
3. **Restore minimal CI** (~1 h). ⚠️ Cost guardrail (past $200 bill): **one** workflow only — `pull_request` + `push: [main]`, `concurrency: cancel-in-progress`, **no cron, no matrix**. Jobs: lint → typecheck → unit tests → build. Restore recipe already in `.github/workflows/README.md` — restore selectively, not all six. _Accept: green run on main; README badge reflects it._
4. **Fix GitHub repo description + topics** (5 min). Honest one-liner, e.g. "Production CRM for guitar teachers — Next.js 16, Supabase RLS, AI-assisted teaching workflows. Built solo, in daily real-studio use." Topics: `nextjs`, `supabase`, `typescript`, `saas`, `music-education`, `postgres-rls`.

### P1 — Demo excellence (~2–3 h; the surface recruiters actually touch)

5. **Live click-through** of `/sign-in?demo=true` as teacher and student — this week's merges (parent dashboard, onboarding wizard, dashboard Direction A) have not been demo-verified. Reseed first (demo data rolls stale at week boundaries; last seed 2026-07-19).
6. **Parent nav**: either add an `isParent` branch to `getMenuGroups()` or keep the parent role out of the demo path. An empty sidebar looks broken.
7. **Landing honesty**: replace the fictional logo cloud ("Fretwork", "Hollow Body"…) with a real testimonial from the studio, or drop the section. Fake logos are a credibility risk if recognized.
8. **Mobile spot-check** at 390 px on dashboard/lessons/songs.
9. Optional wow: a 30–60 s GIF of the core loop (schedule lesson → attach song → student view → log practice) at the top of the README.

### P2 — Docs coherence (~3–4 h; one docs-only PR)

10. Sync `CLAUDE.md`: version, test counts, deployment model, resolve the stack-naming conflict with `00-overview.md` (one canonical naming).
11. `CHANGELOG.md`: regenerate from GitHub releases or truncate to "see GitHub Releases" with a link. Rewrite `CONTRIBUTING.md` to the actual flow (branch prefixes, PR = release notes, vault as tracker).
12. Archive/delete: `logs/history/ci/` (~400 files), `reference/PRODUCTION_REQUIREMENTS.md`, stale `tasks/todo.md`; refresh or fold `reference/TESTING.md`.
13. Mockups: commit batch-02 (or gitignore the folder) and fix `STATUS.md` ("Batch 02: Empty" is false); also commit/park the 2 untracked docs at `docs/`.
14. Consolidate standards: keep `.claude/rules/` as canonical; make `.github/copilot-instructions.md` a pointer or delete the parallel `.github/instructions|agents` set.

### P3 — Repo hygiene (~2 h)

15. Branch cleanup to ≤5 locals; delete merged; close/delete stale dependabot remotes.
16. Git `production` branch: fast-forward to main or delete (it is vestigial and reads as "prod abandoned in April").
17. Make the coverage gate green again (2 files under their 100% locks).
18. Optional: dedupe chart/spreadsheet/radix dependency pairs.

### P4 — Amplify (ongoing, alongside applications)

19. Pin the repo on the GitHub profile; refresh the profile README to lead with Strummy + live demo link.
20. Recruiter one-pager (Phase 6 of the 2026-07-19 demo plan — still open): what it is, demo link, 3 suggested flows, GitHub link.
21. Link `strummy.app` + demo entry from the portfolio site and every targeted CV (`job-search/` configs).
22. Re-run Lighthouse (baseline exists: `2026-07-19-lighthouse-audit.md`) and fix the top items.

---

## Risk register

| Risk                                                                                                    | Mitigation                                                                                                              |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Demo DB sits behind a Cloudflare tunnel to a home server — an outage kills the demo mid-interview-cycle | External uptime monitor (already a P3 launch item); finish the StrummyProd cutover; keep a screen recording as fallback |
| GitHub Actions cost blowup (history: $200+)                                                             | One workflow, main+PR only, concurrency-cancel, no schedules                                                            |
| Every merge deploys straight to prod                                                                    | Verify locally against the same DB; merge deliberately; keep the manual-deploy escape hatch                             |
| Numbers drift again after this pass                                                                     | Before each application round, re-verify the README metrics block (5-min check); one source of truth for counts         |

## What NOT to do

- **No new features for recruiters.** The blueprint's "trust pass, not feature pass" framing applies here too — recruiters are impressed by what works flawlessly, not by breadth.
- Don't restore all 6 workflows; don't chase global 100% coverage; don't polish the legacy `cv-output/` variants (per job-search rules).
- Don't renumber/rewrite the blueprint — it's honest and current; the README just needs to catch up to it.
