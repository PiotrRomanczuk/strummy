# Local-server cron trigger (OPTIONAL — not active by default)

_2026-07-23_

A zero-cost way to run Strummy's **scheduled jobs from the home box (`uwh`)** instead
of cloud crons. This is **an option, not the active setup** — the files here are
inert until you deliberately install and enable them.

## Why this exists

`vercel.json` schedules **7 direct crons**, but six jobs only run via the in-process
dispatcher (`app/api/cron/dispatcher/route.ts`) and have **no other trigger**:

- `lesson-reminders`
- `assignment-due-reminders`
- `assignment-overdue-check`
- `process-notification-queue`
- `calendar-sync`
- `admin-monitoring`

There are two ways to run those:

1. **Vercel-only** — collapse `vercel.json` to a single `/api/cron/dispatcher` cron
   (see the `fix/cron-dispatcher-consolidation` branch). One cloud cron, zero GitHub
   Actions minutes.
2. **Local-server (this)** — a systemd user timer on `uwh` curls the six dark
   endpoints directly. Zero cloud quota, no GitHub Actions exposure (the pattern that
   once ran up an Actions-minutes bill), any cadence you like. Best fit once prod is
   self-hosted on the box.

> ⚠️ **Use one, not both.** This local trigger fires **only the six dark jobs** and
> leaves Vercel's 7 direct crons in place — no overlap. Do **not** also merge the
> Vercel dispatcher consolidation while this is active, or the daily suite double-fires
> (duplicate emails).

## Files

| File                                 | Installs to                              | Purpose                                                                                                                                                                                                          |
| ------------------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `strummy-cron.sh`                    | `~/bin/`                                 | Runner. `daily` = 5 daily jobs, `queue` = notification queue. Masks the secret; logs only endpoint + HTTP status to `~/.local/state/strummy-cron.log`. Inert (clean `exit 0`) until a real `CRON_SECRET` is set. |
| `strummy-cron.env.example`           | `~/.config/strummy-cron.env` (chmod 600) | Config template. `CRON_SECRET` is commented out — uncomment + set to activate. The real file lives only on the box, never in git.                                                                                |
| `strummy-cron-daily.{service,timer}` | `~/.config/systemd/user/`                | Daily at 06:00 UTC → reminders, overdue, calendar-sync, admin-monitoring.                                                                                                                                        |
| `strummy-cron-queue.{service,timer}` | `~/.config/systemd/user/`                | Every 30 min → process-notification-queue.                                                                                                                                                                       |

## Activate (on `uwh`)

```bash
install -m 755 strummy-cron.sh ~/bin/strummy-cron.sh
install -m 600 strummy-cron.env.example ~/.config/strummy-cron.env
$EDITOR ~/.config/strummy-cron.env          # set PRODUCTION_URL + uncomment/set CRON_SECRET (= the Vercel CRON_SECRET)
install -m 644 strummy-cron-*.{service,timer} ~/.config/systemd/user/
export XDG_RUNTIME_DIR=/run/user/$(id -u)
systemctl --user daemon-reload
systemctl --user enable --now strummy-cron-daily.timer strummy-cron-queue.timer

# verify (expect 200 OK per endpoint):
systemctl --user start strummy-cron-daily.service
tail ~/.local/state/strummy-cron.log
```

`loginctl enable-linger $USER` must be on so the timers run without an active login
(already set on `uwh` for the backup timers).

## Deactivate

```bash
export XDG_RUNTIME_DIR=/run/user/$(id -u)
systemctl --user disable --now strummy-cron-daily.timer strummy-cron-queue.timer
```

The runner and units can stay installed — with the timers disabled (or `CRON_SECRET`
unset) nothing fires. That's the default "leave it as an option" state.
