# CI/CD cost optimization + self-hosted runner incident

**Date**: 2026-08-05
**Branch**: `feature/ai-post-lesson-workflow` (PR #654)
**Trigger**: user noticed GitHub Actions metered usage ($3.44 this month) despite owning a self-hosted runner (`uwh`, HP EliteDesk) specifically to avoid paying GitHub.

## Root cause

`.github/workflows/ci.yml`'s `quality-gates` job (lint/typecheck/tests/build) ran on `runs-on: ubuntu-latest` — a billed GitHub-hosted runner. Every other job in the repo (`e2e`, `db-parity`, `rls`, `types-drift`, `detect` — all in `.github/workflows/e2e.yml`) already ran on the self-hosted EliteDesk runner via `runs-on: [self-hosted, e2e]` or `runs-on: [self-hosted, e2e-light]`. Nobody had migrated `quality-gates` when the self-hosted setup was built out; it stayed on `ubuntu-latest` and quietly billed real minutes on every push.

Confirmed via the Actions usage page (`github.com/settings/billing`): **Actions** was the metered line item.

## Fix: moved `quality-gates` to the self-hosted runner

Changed `.github/workflows/ci.yml`:

- `runs-on: ubuntu-latest` → `runs-on: [self-hosted, e2e-light]`
- Added `defaults.run.working-directory: quality-gates-check` and gave the job its own checkout `path:` (mirrors `rls`'s pattern in `e2e.yml` — a dedicated subdirectory so a concurrent `types-drift`/`detect` run on the same runner can't collide with this job's checkout or `node_modules`)
- Checkout uses `clean: false` — this is a **persistent** box, not an ephemeral hosted runner, so `node_modules`, `.next/cache`, `.eslintcache`, and `tsconfig.tsbuildinfo` all survive on disk between runs for free
- **Removed all three `actions/cache@v4` steps** (node_modules cache, Next.js build cache, eslint/tsc incremental cache) — redundant once the workspace persists locally; those steps existed only to work around `ubuntu-latest`'s ephemeral filesystem
- **Removed `actions/setup-node@v6`** — Node is already installed on `uwh` and used directly by `rls`/`types-drift` with no setup-node step; following the same convention
- Dependency install now uses the same lockfile-hash gate `rls` already uses (`md5sum package-lock.json`, skip `npm ci` if unchanged), instead of `actions/cache`'s hit/miss check

Nothing about the job's actual checks changed — same lint/typecheck/unit/integration/build steps, same env var fallbacks, same PR-vs-main branching logic for coverage.

Why `e2e-light` and not `e2e`: `quality-gates` needs no live database (mock Supabase env vars, `SKIP_DB_TESTS=true` on the test steps) — same profile as `detect`/`types-drift`, which is exactly what `e2e-light` was created for (2026-08-02, per the comment in `e2e.yml`) so read-only/no-DB jobs don't queue behind a 6-minute `e2e` run.

**Known trade-off, not yet resolved**: `quality-gates` (build + full test suite, ~3-5 min) is much heavier than `detect` (~2s) or `types-drift` (~10s), the two other jobs sharing `e2e-light`. On a PR that triggers all three, `detect`/`types-drift` can now queue behind a slow `quality-gates` run on the same physical runner (self-hosted runners execute one job at a time per registered instance). Acceptable for now — a few minutes of added latency vs. real GitHub billing — but if it becomes annoying, the real fix is a **third runner registration** dedicated to `quality-gates`, not a shared label.

## Also fixed while investigating: `ai_workflow_runs` was leaked into `runs-on: ubuntu-latest`'s job by nothing else — the actual regression this PR introduced

Not a cost issue, but discovered in the same CI debugging pass:

1. **Production build broke**: `app/actions/student-skills.ts` has `'use server'`, which may only export async functions. The `SKILL_STATUSES` runtime const array broke `next build` with "A 'use server' file can only export async functions, found object." Fixed by moving `SKILL_STATUSES`/`SkillStatus` to `types/student-skills.ts`.
2. **E2E test broke**: `tests/e2e/cross-role/student-skills.spec.ts` assumed the skills-catalog dropdown's first real option (`index: 1`) was the `E2E Test Skill` fixture. The catalog seed migrations in this same PR grew the catalog from ~1 to 72 real skills, so "first option" landed on an unrelated Chords skill instead. Fixed by selecting the fixture by matched option text/value instead of index.
3. **`db-parity` drift, pre-existing, not caused by this PR**: the check went from 111 diff lines to 67 after this PR's migrations were applied to `StudentProduction` — confirmed via `gh run list --branch main` that `db-parity`/`e2e` have been red on `main` for the last two merges already. Not blocking, not this PR's problem to fix, logged here so it isn't mistaken for a regression later.

## Incident: `gha-runner-light` was hung, not just idle

While chasing "why hasn't CI triggered at all" (zero workflow runs anywhere in the repo for ~20 minutes despite two pushes), discovered both self-hosted runners had dropped their long-poll connection to GitHub around **11:23 UTC** (socket/SSL errors in `_diag/Runner_*.log`), attempted one reconnect at ~11:35-11:36 UTC, and then went silent — no further poll activity for 10+ minutes. `gha-runner-light`'s last successfully completed job was `types-drift` at **11:23:19 UTC**; nothing ran after that until manual intervention.

**This does not self-heal.** The `Runner.Listener` process was still alive (systemd saw it as running, no crash), just stuck — so systemd's `active (running)` state gave no signal anything was wrong.

**Both runners are systemd user services** on `uwh` (found this only after wasting a manual `kill && nohup ./run.sh &` cycle — do not do that again, see below):

```
systemctl --user status github-runner-strummy.service   # label: e2e
systemctl --user status gha-runner-light.service         # label: e2e-light
```

**Correct fix, going forward**: `systemctl --user restart github-runner-strummy.service gha-runner-light.service` on `uwh`. That's it — one command, systemd handles the rest cleanly.

**What NOT to do** (this session's mistake, worth avoiding next time): manually `kill`-ing the `Runner.Listener` PID and relaunching it by hand with `setsid nohup ./run.sh & disown`. Systemd's `Restart=always` (or similar) policy fires the moment the process dies and launches its own fresh `run.sh` — so a manual relaunch races it and produces **duplicate** `run.sh`/`Runner.Listener` process trees for the same runner identity. Had to manually `ps`/`kill` the extras afterward. `systemctl --user restart <unit>` is the only thing that should ever touch these processes.

**Symptom checklist for next time this happens** (zero workflow runs anywhere in the repo, PR checks stuck on old commits):

1. `gh api "repos/PiotrRomanczuk/strummy/actions/runs?head_sha=<sha>"` returning empty is the first signal — but note `gh api`/`gh run list`/`gh pr checks` were all observed returning **stale cached data** for 20+ minutes in this same session even after the runners recovered, so don't fully trust them either; cross-check in the Actions web UI (`github.com/PiotrRomanczuk/strummy/actions`) if the CLI seems frozen.
2. SSH to `uwh`, check `journalctl --user -u github-runner-strummy.service -u gha-runner-light.service -n 30` for a gap in `Running job:` / `Job ... completed` lines, or socket/SSL errors.
3. `systemctl --user restart github-runner-strummy.service gha-runner-light.service` — nothing else.

## Unrelated hazard hit mid-session, worth flagging separately

`uwh`'s sudo password was shared in plaintext in chat to unblock installing a systemd unit earlier in this same session (for the AIA-3/PostgREST JWT fix, a separate piece of work). **Recommend rotating it** (`passwd` on `uwh`) — not yet done as of this doc.

## Status as of this doc

- `ci.yml` change committed (`11498e66`) and pushed to PR #654, not yet confirmed green end-to-end post-runner-fix (CLI status checks were unreliable at time of writing; needs a fresh look once `gh`/browser both agree).
- Both self-hosted runners confirmed `Listening for Jobs` after the restart.
- PR #654 also carries: AIA-3 workflow engine, skills catalog seed (72 entries) + status vocabulary migration + AI context wiring — see PR description for that half of the diff.
