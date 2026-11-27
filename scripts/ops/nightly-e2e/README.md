---
created: 2026-11-16
updated: 2026-11-25
---

# strummy-nightly-e2e

Starts `.github/workflows/nightly-e2e.yml` from `uwh`. GitHub's own `schedule:` ran the
crons 5–8 hours late every day, and the daytime runs re-tested a commit that had not
changed; the workflow header has the measurements.

## Which branch

The timers dispatch the workflow on **`dev`** (`NIGHTLY_BRANCH`, default `dev`). The suite
runs against the dev stack (`StrummyDevelopment`), and a migration reaches that database
when it lands on `dev` (`deploy-db.yml`). Testing another branch there means testing code
against a schema it does not have yet: until 2026-11-25 the timers dispatched on `main`,
and `student-intake.spec.ts` failed every night after #1115 moved `profiles.notes` to
`student_private_notes` on dev (#1118). `main` and `test` are covered by `e2e-test.yml`
against `StrummyTest`.

| Timer                               | When (Europe/Warsaw)  | What it starts                                                    |
| ----------------------------------- | --------------------- | ----------------------------------------------------------------- |
| `strummy-nightly-e2e-nightly.timer` | 03:17                 | `kind=nightly`: 4 device projects, writes the `nightly-e2e` issue |
| `strummy-nightly-e2e-daytime.timer` | 09:17 · 15:17 · 21:17 | `kind=daytime`: Desktop Chrome — **only if something changed**    |

## What "changed" means

`trigger.sh` builds a key from the two things a run actually tests:

```
<first 8 of dev's SHA>-<first 8 of sha256(dev public schema)>
```

The key is passed to the workflow and shows in the run's name
(`Nightly E2E · daytime · cd143ef9-1feeb0fa`). A daytime check lists the workflow's recent
runs on `dev` and skips when one already carries the current key — whatever its result.
Nothing is stored on `uwh`.

The schema half is there because dev is a shared stack: a migration applied by hand for a
PR changes what the suite sees without changing `dev`. The dump uses the same
`normalize()` as `db-parity` (`scripts/e2e-remote/schema-dump.lib.sh`).

The nightly run always goes out, even when the key cannot be computed: with the dev stack
down, a red run with a report is the alarm.

## Files

| File                                          | Role                                            |
| --------------------------------------------- | ----------------------------------------------- |
| `trigger.sh`                                  | key → already tested? → `gh workflow run`       |
| `strummy-nightly-e2e@.service`                | systemd **user** template unit, `%i` = run kind |
| `strummy-nightly-e2e-{nightly,daytime}.timer` | the two schedules                               |

## On uwh

The service runs the script from `~/strummy-prod-e2e/checkout` — the prod-audit cycle
resets that clone to `origin/main` every 4 hours and nothing edits it. A change to
`trigger.sh` is therefore live within 4 hours of its merge **into `main`** — merging into
`dev` alone changes nothing on `uwh`. Unit files are **copied**, so
a change to them needs the install step again.

Install / update (as `piotr`, linger is on):

```bash
cd ~/strummy-prod-e2e/checkout/scripts/ops/nightly-e2e
install -m 644 strummy-nightly-e2e@.service strummy-nightly-e2e-*.timer ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now strummy-nightly-e2e-nightly.timer strummy-nightly-e2e-daytime.timer
```

See the decision without starting anything:
`NIGHTLY_TRIGGER_DRY_RUN=1 ~/strummy-prod-e2e/checkout/scripts/ops/nightly-e2e/trigger.sh daytime`.

Start a run now: `systemctl --user start strummy-nightly-e2e@daytime.service`
(or `@nightly`), then `journalctl --user -u 'strummy-nightly-e2e@*' -n 20`.
Pause: `systemctl --user disable --now strummy-nightly-e2e-{nightly,daytime}.timer`.

`gh` on `uwh` is logged in as the owner; the `repo` scope is enough to dispatch.

## Who reads the result

- The `nightly-e2e` issue (nightly runs only) and each run's summary page.
- The dev agent (`scripts/ops/dev-agent/gate.sh`) counts `nightly` and `daytime` runs on
  `dev` (same `NIGHTLY_BRANCH`). Fewer daytime runs means a green streak of 3 now takes up to three nights after a
  red one, where four fixed runs a day used to give it within a day.
