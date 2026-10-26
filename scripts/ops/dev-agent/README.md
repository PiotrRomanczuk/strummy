---
created: 2026-10-26
updated: 2026-10-26
---

# strummy-dev-agent

Unattended Claude Code pass on `uwh`, once a day (10:00 Europe/Warsaw, after the night's
Nightly E2E). It looks at the scheduled `nightly-e2e.yml` runs and does one of three things:

| Nightly state                                                        | Mode      | What happens                                                      |
| -------------------------------------------------------------------- | --------- | ----------------------------------------------------------------- |
| latest scheduled run **failed**                                      | `triage`  | diagnose; fix the code, or comment the cause on the Nightly issue |
| last **3** scheduled runs green, ≥1 full 4-device run, newest < 30 h | `feature` | implement the first suitable gap from `docs/app-blueprint/90-roadmap.md` |
| anything else, or an agent PR is still open                          | —         | nothing (logged)                                                  |

Red always wins over features: a failing suite is fixed before anything new is built.

## Safety model

`uwh` hosts the production database, so the agent gets **edit and test tools only**
(`run.sh` → `ALLOWED` / `DENIED`). No git push, `gh`, Docker, `psql`, SSH or network. The
wrapper — not the agent — commits, pushes, opens the PR (labels `dev-agent` + `e2e`, so the
full Playwright matrix runs on it) and decides about auto-merge:

- the agent's `result.json` must say `done`, and lint + typecheck + unit tests must pass
  again in the wrapper, or nothing is pushed;
- **auto-merge** only when the PR is ≤ `AUTO_MERGE_MAX_LINES` (200) changed lines **and**
  touches none of `RISKY_PATHS_RE` (`gate.sh`) — migrations are applied to production by
  `deploy-db.yml` on merge, so a migration PR always waits for a human;
- **one agent PR at a time** — the next pass waits until it is merged or closed.

Branch protection still holds every PR to the normal gates (CI + Core flows + the `e2e`
matrix), so auto-merge only fires on green.

## Files

| File                          | Role                                                          |
| ----------------------------- | ------------------------------------------------------------- |
| `run.sh`                      | entry point: gate → context → `claude -p` → `ship_result`     |
| `gate.sh`                     | Nightly streak / red detection, WIP limit, risky paths        |
| `ship.sh`                     | gates, commit, PR, auto-merge decision, attempt archive       |
| `prompts/{feature,triage}.md` | what the agent is told in each mode                           |
| `strummy-dev-agent.{service,timer}` | systemd **user** units                                  |

## On uwh

| Path                                   | What                                                        |
| -------------------------------------- | ----------------------------------------------------------- |
| `~/strummy-dev-agent/checkout/`        | dedicated clone of this repo, reset to `origin/main` per run |
| `~/strummy-dev-agent/history.log`      | one line per decision — start here                          |
| `~/strummy-dev-agent/runs/<ts>-<mode>-<outcome>/` | agent log, `result.json`, gate logs, `changes.patch` |

Install / update (as `piotr`, linger is on):

```bash
git clone https://github.com/PiotrRomanczuk/strummy.git ~/strummy-dev-agent/checkout
ln -sf ~/strummy-dev-agent/checkout/scripts/ops/dev-agent/strummy-dev-agent.{service,timer} ~/.config/systemd/user/
systemctl --user daemon-reload && systemctl --user enable --now strummy-dev-agent.timer
```

Dry run (everything except push/PR): `cd ~/strummy-dev-agent/checkout && DEV_AGENT_DRY_RUN=1 scripts/ops/dev-agent/run.sh`.

Run one pass now: `systemctl --user start strummy-dev-agent.service`, then
`journalctl --user -u strummy-dev-agent -f`. Pause: `systemctl --user disable --now strummy-dev-agent.timer`.

Knobs (set with `systemctl --user edit strummy-dev-agent.service` → `Environment=`):
`GREEN_STREAK` (3), `MAX_AGE_HOURS` (30), `AUTO_MERGE_MAX_LINES` (200),
`DEV_AGENT_BUDGET_USD` (25), `DEV_AGENT_TIMEOUT` (3h).

Needs on the host: `claude` (logged in), `gh` (logged in), `jq`, Node per `.nvmrc`, and the
planner bare repo at `~/git/planner.git` (read-only, for in-flight work).
