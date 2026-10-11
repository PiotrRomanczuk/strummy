# How bugs get fixed, how features get built, and whether CI/CD helps

**Date**: 2026-10-11
**Scope**: Strummy — git/PR history since 2026-07-01 (origin/main), all five GitHub workflows, branch protection, local hooks, every process document (CLAUDE.md, .claude/rules, .claude/agents, CONTRIBUTING, blueprint, tests/README)
**Method**: three read-only agents — pipeline mechanics (+ `gh run`/`gh pr` data), history mining, documented-rule vs. reality — synthesised here. Numbers are from origin/main as of today.

## TL;DR

- **Bugs are found after shipping, not before.** Of 12 sampled fix PRs, 4 came from production/user reports, 3 from the nightly E2E issue, 2 from screenshots while assertions were green, 1 from a live booking, 2 were self-inflicted. Once found, fixes are good: 9/12 add a regression test, all are small root-cause PRs. But a third of fix effort (34 of ~110 fix commits) goes into repairing the test/CI harness itself.
- **Features ship as very large AI-session batches** (17% of PRs > 1000 lines; #843 = 32,510 lines / 100 files), with unit tests, rarely a blueprint gap ID, then wait on a release train that stalls for weeks.
- **CI on the PR side helps.** One ~9-min hosted gate (lint, tsc, structure ratchet, Jest + coverage, integration, build) plus RLS and DB-types-drift on the self-hosted runner catch real classes of bugs. The migration triangle (types-drift / db-parity / migrations-replay) is the best thing in the pipeline.
- **CD currently hinders.** The release train squash-merges main → production, so the merge base never advances and every release PR eventually goes DIRTY. Production went **27 days** (09-09 → 10-11, 43 PRs) with every check green and nobody notified. It is wedged again today (#849, conflict in `sign-out.spec.ts`). `production` has no branch protection.
- **Most PRs run no E2E** (label or risky-path gated; skipped = pass). The nightly stops each device leg at the first failure (iPhone SE: 31 run / 374 skipped), blocks nothing, and now runs during working hours.
- **The local hooks have been dead since the repo was renamed** (`core.hooksPath` → `guitar-crm/.husky`, which does not exist). Docs still say they run.
- **~1,650 lines of process spec load every session; about half of it is decoration or contradicts itself** (four deployment-model eras live at once, 70/50/100 coverage, 50 vs 80 LOC, three version-bump stories).

## 1. How bugs actually get fixed

| Signal | Count (12-PR sample) | Example |
| --- | --- | --- |
| Production / user report | 4 | #687 auth email (3rd fix of the same area), #707 Google OAuth 500, #671 UG import, #711 "0 courses" |
| Nightly E2E issue | 3 | #848 (#847), #776 (#747), #724 |
| Screenshot / adjacent E2E while assertions were green | 2 | #746, #730 |
| Live test booking + Vercel logs | 1 | #647 |
| Self-inflicted by process | 2 | #658 (auto-merge fired before the last push), #708 (delete button lost in the v1/v2 cleanup) |

- **Fix quality is good**: 9/12 add or change an automated test; 4/12 add a manual-test HTML; PRs are small and narrate the root cause.
- **Red-first TDD is unverifiable**: 1–3 commits per PR, squashed.
- **Recurrence**: auth email fixed three times (#521 → #613 → #687); nightly pipeline repaired 7× in 6 weeks (#758, #761, #773, #791, #799, #807, #831). Fix scopes since July: `e2e` 20, `db` 15, `auth` 13, `songs` 8, `ci` 8, `test` 6.
- **Review is absent**: 198 human PRs, median open→merge **14 minutes**, 64% under an hour. Auto-merge on green is the only gate. 0 PRs use `closes #N`.
- **Bugs are found by auditing**: 29 PR bodies cite an audit; `docs/analysis` has 19 files, 14 doc paths contain "audit". Today's two audits found 9 product bugs and 20+ vacuous tests the suite had been green over.

## 2. How features actually get built

- **Size**: median PR 301 lines / 5 files; mean 3,389 / 27. 34 PRs (17%) > 1,000 lines. #843 32,510 lines; #772 6,823; #700 folded a 5-PR stack into one merge.
- **Tests**: feature PRs do ship unit tests (13–18 test files on the big ones); #654 AIA-3 shipped with 0.
- **Blueprint linkage is weak**: gap IDs in ~6 PRs (SKL-1/2/3, AIA-1/3, CAL-3). Roadmap last updated 08-15 and carries 20 status markers despite the "no statuses" rule. Maturity vocabulary in the blueprint: 49 unbuilt, 32 nav-hidden, 7 built-unmounted — features regularly exist before they are reachable (#728 SKL-1 only added the entry point to a component that already existed).
- **Release notes don't describe what shipped**: the train's release PR body is a PR list; v0.174.0's GitHub Release is one auto-generated line for a 47-commit, UI-wide release.
- **Throughput collapsed**: 457 commits Jul–Aug vs 74 Sep–Oct (mostly dependabot). 48 of the last 80 merged PRs are dependabot.
- **Churn is in process, not product**: top-25 churned files include CLAUDE.md (24×), ci.yml (26×), e2e.yml (22×), locale files (53–57×); only two app source files (`app/dashboard/page.tsx`, `proxy.ts`, both > 200 LOC).

## 3. CI/CD: what runs, what blocks

| Stage | What | Blocking? | Health |
| --- | --- | --- | --- |
| pre-commit / pre-push | `npm run quality` (tsc + lint + full Jest + coverage), then lint + tsc again | — | **dead** (hooksPath points at a deleted directory) |
| ci.yml `quality-gates` (ubuntu) | lint (errors only), tsc, `check:structure --strict`, full Jest + coverage thresholds, integration, `next build` ×3 | required | 7–11 min; 14 ✓ / 3 ✗ / 5 cancelled of last 23 |
| ci.yml knip / gitleaks / Lighthouse+axe | advisory / not required / continue-on-error | no | knip `--no-exit-code` since 08-05; Lighthouse rebuilds the app for noise |
| e2e.yml (self-hosted uwh) | Desktop Chrome E2E (label or risky-path only, `maxFailures=1`), RLS, DB-types-drift, db-parity, migrations-replay, bruno (creds missing) | E2E/RLS/types required; parity/replay train-only | 14 ✓ / 2 ✗ / 10 cancelled of 28; E2E skipped on most PRs |
| auto-merge.yml | arms `--auto --squash` on PR open | — | works (dependabot excluded) |
| Vercel | main → staging (preview, SSO, **prod DB**); production → strummy.online | — | train checks build status only, no HTTP smoke |
| release-train.yml (every 2 h) | gate on 7 check names + Vercel; open/merge main→production `--squash`; cut tag | — | **wedged**: 68 failed / 90 green runs 09-15 → 10-10; #806 27 days; #849 conflicting now |
| nightly-e2e.yml | 4 device legs, serial, one issue | no | 11/15 green; fail-fast truncates legs; cron drifted to 07:15 UTC |
| Branch protection | main: 4 required checks, strict, no review, `enforce_admins=false`; **production: none** | — | 9 direct commits on main since 08-01 |

### Where bugs get through
1. **Squash releases wedge the train** → production weeks behind with everything green. Critical, recurring, still `--squash` at `release-train.sh:221`.
2. **Silence**: train failures and "red main, not releasing" go only to the step summary. The 09-22 diagnosis comment on #806 sat 13 days.
3. **No protection on `production`**; anyone can push.
4. **UI-only PRs run zero E2E** before main; post-merge push E2E runs only for human merges; nightly is advisory and truncated.
5. **Dependabot bumps skip all self-hosted checks** (23 of the last 30 PRs).
6. **No post-deploy smoke** of staging or strummy.online; crons run against prod.
7. gitleaks, db-parity, migrations-replay are train-only, so a failure silently parks the release instead of failing the PR.

### Where it costs time without catching bugs
- Triple work in the docs' intended flow (pre-commit full suite → pre-push → CI); in practice the hooks are dead, so it is CI only — fine, but the docs mislead.
- bruno builds + starts the app on every PR and can never fail (creds missing).
- Lighthouse does a second full build per PR, always advisory, scores known to be noise.
- knip wallpaper since 08-05.
- Nightly in working hours queues PR E2E behind a 30-min serial run.
- Comment drift: ci.yml says push-triggered runs are "close to dead" (26/30 merges are human); README says RLS ~20 s (measured 0.5–1.2 min); scripts/ci/README still mentions Cypress.

## 4. Documented process vs reality

| Rule | Enforced by | Verdict |
| --- | --- | --- |
| Migration file for every DB change | replay + drift + parity (required) | **FOLLOWED** |
| Required CI gates (lint/tsc/structure/Jest/integration/build), RLS | branch protection | **FOLLOWED** |
| No `any` | eslint error (30 sites, 21 disables) | FOLLOWED |
| Conventional commits | nothing (192/215 comply) | FOLLOWED by habit |
| Auto-merge arming | auto-merge.yml | FOLLOWED |
| Never commit to main | protection, `enforce_admins=false` | PARTIAL (9 direct commits) |
| Blueprint gap IDs on features | nothing | PARTIAL |
| Manual-test HTML before commit | nothing | PARTIAL (Jul 25, Aug 24, **Sep 0**, Oct 3) |
| Structure ratchet "never grows" | CI | PARTIAL (178 baseline entries; #843 added 4 via `--update-baseline`) |
| TDD red-first | nothing | unverifiable |
| ≤5 branches / ≤7 days / ≤3 worktrees | nothing | **DECORATION** (76 remote, 71 unmerged, oldest 70 d; 6 worktrees) |
| tasks/todo.md + lessons.md | nothing | DECORATION (June content) |
| Vault WIP/Done per task | nothing | DECORATION (`last_commit: 2026-08-02`, `version_production: 0.163.0` vs v0.174.0) |
| "Check staging went green" | nothing | DECORATION (27-day stall) |
| Size limits 200/150/50 "(Enforced)" | eslint warn, 80 not 50 | DECORATION / CONTRADICTED (28 components + 10 hooks over) |
| E2E ≤10 per feature | nothing | DECORATION (teacher/ 127 tests) |
| 70% coverage | jest thresholds | CONTRADICTED (branches 70, functions 55, lines/statements 50, per-file 100% locks) |
| PR body = release notes | cut-release.sh | CONTRADICTED (train writes a PR list; v0.174.0 = one line) |
| Version bump by branch prefix | — | CONTRADICTED (prefix vs default-minor vs non-existent `version-bump.yml`) |
| Roadmap has no statuses | nothing | CONTRADICTED (20 status markers) |
| lint/typecheck/test before push | hooks | dead; CI-only |

**Stale deployment models still in the tree** ("main is production"): CONTRIBUTING.md:44,108; `.claude/agents/git-workflow.md:165-167`; `pr-manager.md:173`; CHANGELOG.md; ci.yml:181; auto-merge.yml comment; PR template line 1. `deployment-ops.md` deploys on `master` to `marszal-arts.vercel.app` (another project). `.github/copilot-instructions.md` says "DO NOT USE proxy.ts" — the live file. `ENGINEERING.md` describes an 11-job `ci-cd.yml` that does not exist. Dead Copilot-era docs: 6,771 lines.

**Spec weight**: ~1,650 lines always loaded (global + project CLAUDE.md + rules), 3,737 lines of agents and 7,075 of skills on demand.

## 5. Verdict

**Bug fixing**: reactive but disciplined. The suite rarely catches a regression on the change that introduces it; bugs surface from users, nightly triage or audits, then get fixed well. The leading cause of repeat work is the harness itself.

**Features**: fast, large, AI-batch, loosely tied to the plan. Tests come along; reachability (nav-hidden / built-unmounted) and release notes do not.

**CI**: helps on PRs. **CD**: hinders — an automation that looks finished, fails structurally, and tells no one. Combined with dead hooks and a spec that contradicts itself, a newcomer (human or agent) is told to rely on gates that do not fire and to trust docs that describe three previous pipelines.

## 6. What to change, in order

1. **Unwedge releases**: `release-train.sh:221` `--squash` → `--merge` (or fast-forward `production`); resolve #849 once. One line; ends the 27-day class of outage.
2. **Make failure loud**: a `release-blocked` issue (same helper as the nightly) whenever the train is non-green for > 1 run or main is red.
3. **Protect `production`** (train via an allow-listed token); make gitleaks, db-parity and migrations-replay required on `main` so failures block the PR, not the release.
4. **Nightly**: `E2E_MAX_FAILURES: '0'`, cron ~22:00 UTC so GitHub's delay still lands before work hours.
5. **E2E on every PR**: a Desktop-Chrome `@smoke` subset (~1 min) so UI-only PRs are not 100% unproven before main; keep the label/risky-path full run.
6. **Post-deploy smoke**: HTTP check of staging and strummy.online after each deploy (the `@prod-safe` set from today's #850 is the ready-made tool).
7. **Fix or delete the hooks**: `git config core.hooksPath .husky` + `prepare` script; pre-commit = lint-staged + `jest --findRelatedTests`; drop pre-push.
8. **Cut dead CI cost**: bruno and Lighthouse behind a label until they can fail a PR; knip either blocks or goes.
9. **One deployment story**: delete the three stale eras from CONTRIBUTING, git-workflow, pr-manager, CHANGELOG, ci.yml comments, PR template; delete the Copilot-era `.github` docs (6.8k lines); fix `deployment-ops.md`. Align the coverage, LOC and version-bump numbers with the config, or change the config.
10. **Shrink the spec to what is enforced**: keep migration, gates, RLS, `any`, conventional commits, auto-merge; demote branch limits, todo/lessons, vault WIP, "check staging" to either an automated check or a deleted line. A rule with no consequence is decoration — the repo's own S-rules say so.
11. **Smaller feature PRs with a gap ID and a release note paragraph** — the train should assemble release notes from PR bodies (`gh pr list --search merged:>last-tag`), not list PR numbers.
12. **Review the vault** (11 versions behind) or stop claiming it is the source of truth.
