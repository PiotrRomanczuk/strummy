---
created: 2026-11-27
updated: 2026-11-27
---

# strummy-notification-queue

Drains Strummy's e-mail queue every 10 minutes from `uwh` (#1215).

Vercel Hobby allows one cron a day, so the only trigger of
`/api/cron/process-notification-queue` used to be the daily dispatcher
(06:00 UTC, `vercel.json`). A lesson summary "1 hour after the lesson", a
cancellation sent "immediately" and the retries after 1, 5, 30 and 120 minutes
all went out the next morning. This timer makes the same call the dispatcher
makes, with the same `CRON_SECRET` bearer (`lib/auth/cron-auth.ts`).

## Which environment

| Instance | `STRUMMY_BASE_URL`       | Queue drained                               | Installed on uwh |
| -------- | ------------------------ | ------------------------------------------- | ---------------- |
| `prod`   | `https://strummy.online` | `StudentProduction`, through the Vercel app | yes              |
| `dev`    | `http://localhost:3000`  | `StrummyDevelopment`, through `npm run dev` | no — manual test |

Only production needs it: `dev` has no deployment (since 2026-11-22 Vercel
builds `main` and `test` only) and `test` previews get a new URL per push and
sit behind Vercel's deployment protection. For a check on the dev stack run
`trigger.sh dev` by hand against a local `npm run dev` (see the manual test,
`docs/manual-tests/2026-11-27-notification-queue-timer.html`).

The route is merged into `dev` first; production answers with the `backlog`
field only after it reaches `main`. Until then the script logs
`backlog=unreported` and still drains the queue.

## Files

| File                                 | Role                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `trigger.sh <instance>`              | one GET with the bearer from the `.secret` file; exit status is the alarm |
| `read-response.py`                   | turns the JSON answer into one journal line: `ok` / `stale` / `failed`    |
| `strummy-notification-queue.service` | systemd **user** unit, runs `trigger.sh prod`; `OnFailure=` mails         |
| `strummy-notification-queue.timer`   | `*:05/10` — :05, :15 … :55                                                |
| `install.sh [--enable]`              | copies the units, creates the non-secret config, warns about leftovers    |

Configuration lives outside the repo, in `~/.config/strummy/` (mode 700):

- `notification-queue-<instance>.env` — `STRUMMY_BASE_URL=…` (no secret).
- `notification-queue-<instance>.secret` — the `CRON_SECRET` value, one line,
  **mode 600**. `trigger.sh` refuses a file readable by group or others and
  passes the value to curl on stdin, so it is never in `argv`, the journal or
  the log.

The value is production's `CRON_SECRET` from the Vercel project's environment
variables. Its Bitwarden item is **`strummy-prod-cron-secret`**. If that item
does not exist yet, store it first (`secret-put strummy-prod-cron-secret
"uwh ~/.config/strummy/notification-queue-prod.secret + Vercel CRON_SECRET
(prod)"`); if Vercel will not show the value, rotate it: new value in
Bitwarden, the same value in Vercel (Production), redeploy `main`.

## The alarm

The route reports what is still late **after** it drained
(`lib/notifications/queue-backlog.ts`): rows still `pending` more than
60 minutes past `scheduled_for`. Rows scheduled for later are not late.

`trigger.sh` exits 1 when the call fails (HTTP ≠ 200, `success: false`,
unreachable) or `backlog.isStale` is true. The unit then fails and
`OnFailure=unit-failure-mail@%n.service` (why the unit is not a template:
`%n` may not contain a second `@`) — home-ops' notifier on `uwh`
(`ops/elitedesk/notify-failure.sh`), the same one the SEO and PR units use —
mails the last 40 journal lines to the owner.

To mail every 6 hours of an outage rather than every 10 minutes, the script
writes `~/.local/state/strummy-notification-queue/<instance>.alarm` when it
fails and, while that stamp is younger than `ALARM_REPEAT_MINUTES` (360), logs
the problem and exits 0. The first good run deletes the stamp ("recovered").

The daily dispatcher keeps its own `checkQueueBacklog()` (more than 500
pending → admin e-mail); this one is about lateness, not volume.

## Install (on uwh, after the merge reaches `main`)

The service runs the script from `~/strummy-prod-e2e/checkout`, the clone the
prod-audit cycle resets to `origin/main` every 4 hours — like `nightly-e2e`.
Until this directory is in `main` there, the unit skips itself
(`ConditionPathExists`). Unit files are **copied**: a change to them needs
`install.sh` again; a change to `trigger.sh` is live within 4 hours.

1. Wait until `ls ~/strummy-prod-e2e/checkout/scripts/ops/notification-queue/`
   lists these files (or `git -C ~/strummy-prod-e2e/checkout pull` it now).
2. Units and config:

   ```bash
   cd ~/strummy-prod-e2e/checkout/scripts/ops/notification-queue
   ./install.sh
   ```

3. The secret, from the Mac (the value never appears on screen):

   ```bash
   secret strummy-prod-cron-secret | ssh uwh 'umask 077 && cat > ~/.config/strummy/notification-queue-prod.secret'
   ```

4. One run by hand, then the timer:

   ```bash
   ~/strummy-prod-e2e/checkout/scripts/ops/notification-queue/trigger.sh prod; echo "exit=$?"
   ./install.sh --enable
   systemctl --user list-timers strummy-notification-queue.timer
   ```

   Expect `[notification-queue prod] ok sent=… overdue=0` and `exit=0`
   (`backlog=unreported` until the route change is on `main`).

5. Check the alarm reaches the inbox once:
   `systemctl --user start unit-failure-mail@strummy-notification-queue.service.service`
   should send a mail with the unit's journal.

`install.sh` warns when the old `strummy-cron-{queue,daily}.timer` units
(`scripts/cron/`, removed in this change, never part of the active setup) are
installed — disable them, they would drain the same queue a second time and
fire the daily jobs next to the dispatcher.

## Operate

- Status / history: `systemctl --user list-timers strummy-notification-queue.timer`,
  `journalctl --user -u strummy-notification-queue -n 30`.
- Run now: `systemctl --user start strummy-notification-queue.service`.
- Pause: `systemctl --user disable --now strummy-notification-queue.timer`.

## Why :05 and not every 10 minutes from :00

Two drains at the same moment could both pick the same `pending` row:
`get_pending_notifications` locks only for its own statement. The timer never
fires on the hour, so the 06:05 run starts after the dispatcher's 06:00 drain
(`maxDuration` 60 s) has finished. A oneshot unit never overlaps itself.

## Load

144 calls a day to a Vercel function that mostly finds nothing to send; well
inside Hobby's invocation allowance. Each call also retries failed rows and
prunes expired rate-limiter entries, as the dispatcher's drain does.
