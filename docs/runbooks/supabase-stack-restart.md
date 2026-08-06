---
created: 2026-07-31
updated: 2026-08-06
---

# Restarting a self-hosted Supabase stack (uwh)

Read this **before** running `supabase stop` / `supabase start` against
`StudentProduction`. Four things about these stacks are not obvious and all
four have already caused incidents.

## 1. Restarting silently breaks every auth email

The CLI derives each container's environment from `config.toml`. That file has
no knob for `GOTRUE_MAILER_URLPATHS_*`, so the CLI always points them at the
stack's **local** API address:

```
GOTRUE_MAILER_URLPATHS_INVITE=http://127.0.0.1:54321/auth/v1/verify
```

Those are absolute URLs and GoTrue uses them verbatim as the base of every link
it emails. Production is only reachable from outside through the Cloudflare
tunnel, so every invite, password reset and confirmation goes out pointing at
`127.0.0.1` — which, for the recipient, is their own phone.

**Nothing errors.** The API returns 200, the mail is delivered, the link inside
is dead. There is no log line and no alert; you find out when a student tells
you.

> Setting `API_EXTERNAL_URL` alone does **not** fix it — the `URLPATHS` values
> take precedence. This cost an extra debugging round on 2026-07-31.

### Repair

```bash
ssh uwh
python3 ~/ops/restore-gotrue-mail-urls.py prod --check   # report only
python3 ~/ops/restore-gotrue-mail-urls.py prod           # repair
```

Source of truth is `scripts/ops/restore-gotrue-mail-urls.py` in this repo; the
copy on `uwh` lives at `~/ops/`. It reads the running container's environment,
overrides the URL vars and recreates the container — secrets never leave the
host.

`dev` is optional: its mail lands in the stack's own inbox where a localhost
link is fine. Only repair dev if something off-host must follow a dev link.

### Verify

```bash
ssh uwh 'docker exec supabase_auth_StudentProduction env | grep MAILER_URLPATHS'
```

All four must show `https://db.strummy.online/auth/v1/verify`.

To confirm end to end without handling tokens, trigger a reset to a `+alias` you
control and search Gmail for the hostname — a body search tells you which host
the link uses without ever reading the token:

```
to:p.romanczuk+testteacher@gmail.com "db.strummy.online" newer_than:1h
```

## 2. Restarting also silently breaks Google sign-in

Same root cause as section 1, different var. `config.toml` has no knob for
`[auth.external.google].redirect_uri` either, so the CLI defaults
`GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI` to the stack's local API address:

```
GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=http://127.0.0.1:54321/auth/v1/callback
```

GoTrue sends this verbatim as the `redirect_uri` param on the Google OAuth
`authorize` request. Google redirects the user's browser straight back to it
after they approve access — so on production, the browser tries to load
`127.0.0.1:54321` (the user's own machine) and fails to connect. This is
**not** a client-side/Vercel env issue — `NEXT_PUBLIC_SUPABASE_URL` is
irrelevant here; the bad value lives entirely in the auth container's env and
is never seen by the Next.js bundle.

Discovered 2026-08-03: a restart reverted this var and broke Google sign-in on
`strummy.online` with no error anywhere — GoTrue returns its normal
`authorize` 302, only the destination is wrong.

### Repair

Same script as section 1 — `restore-gotrue-mail-urls.py` now overrides
`GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI` too (fixed 2026-08-03; older copies of
this script only cover the mailer vars, so always sync `~/ops/` from the repo
before relying on `--check`).

```bash
ssh uwh
python3 ~/ops/restore-gotrue-mail-urls.py prod --check   # report only
python3 ~/ops/restore-gotrue-mail-urls.py prod           # repair
```

### Verify

```bash
ssh uwh 'docker exec supabase_auth_StudentProduction env | grep GOOGLE_REDIRECT_URI'
```

Must show `https://db.strummy.online/auth/v1/callback`. Then do
a real Google sign-in attempt on `strummy.online` and confirm it completes.

Apple's redirect URI (`GOTRUE_EXTERNAL_APPLE_REDIRECT_URI`) has the identical
gap in `config.toml` but is left unrepaired deliberately — the Apple provider
is `enabled = false`, so nothing depends on it. If Apple sign-in is ever
enabled, add its redirect URI to the overrides dict in the same script.

## 3. Custom email templates break the send itself

This one is worse than sections 1-2, because it does not produce a bad link —
it produces **no email at all**, plus a visible error to the user.

`config.toml` _can_ express email templates, via `content_path`. The trap is
what the CLI does with that path: it rewrites each one to a Kong URL and sets

```
GOTRUE_MAILER_TEMPLATES_CONFIRMATION=http://supabase_kong_StudentProduction:8088/email/confirmation.html
```

Kong serves nothing there — no `/email` route in `kong.yml`, no mounted template
files (`docker inspect ... --format '{{json .Mounts}}'` returns `[]`). Every
fetch 404s, and GoTrue treats a failed template fetch as a **failed send**: the
API returns an error and the user sees _"Error sending confirmation email"_.

All five mail types share the fault — confirmation, invite, recovery,
magic_link, email_change. So sign-up, password reset and student invites are all
dead simultaneously.

Found on 2026-08-06 by running the E2E suite against `strummy.online`; the
`config.toml` comment had described it as a "local dev quirk" since June without
anyone realising production had it too.

### Repair

Templates now live in `public/email/` and are served by the app itself at
`https://strummy.online/email/<name>.html`. `content_path` was removed from
`config.toml` so the CLI stops re-introducing the Kong URLs, and the repair
script owns these vars like it owns the URLPATHS:

```bash
ssh uwh
python3 ~/ops/restore-gotrue-mail-urls.py prod --check   # report only
python3 ~/ops/restore-gotrue-mail-urls.py prod           # repair
```

If the branded templates are ever unreachable (e.g. not deployed yet), restore
sending immediately with GoTrue's own plain bodies:

```bash
python3 ~/ops/restore-gotrue-mail-urls.py prod --drop-templates
```

### Verify

```bash
ssh uwh 'docker exec supabase_auth_StudentProduction env | grep MAILER_TEMPLATES'
ssh uwh 'docker logs supabase_auth_StudentProduction --since 5m 2>&1 | grep templatemailer'
```

The second command must print nothing. Then complete a real sign-up on
`strummy.online` with a `+alias` address and confirm the mail arrives — the
container env looking right is not proof the send works.

## 4. You cannot recreate a single container

The obvious shortcut does **not** work:

```bash
docker rm -f supabase_auth_StudentProduction
supabase start     # ← does NOT bring it back
```

`supabase start` sees the stack as already running and skips the missing
container, leaving auth down with no obvious way forward. Either do a full
`supabase stop && supabase start`, or recreate the container explicitly with
`docker run` (which is what the repair script does).

This was discovered by rehearsing on the dev stack first — worth doing for any
container-level surgery on these stacks.

## Restart checklist

1. Note that a full stop/start takes Postgres down too — staging and production
   share this database, so the site is down for the duration (~1 min).
2. `supabase stop && supabase start` in `/home/piotr/strummy-production`.
   - The CLI is at `~/.local/share/supabase`; the wrapper in `~/.local/bin` fails
     unless that directory is on `PATH`.
3. **Run the repair script** (sections 1-3) — always, on prod. One script fixes
   the mailer URL paths, the template URLs and the Google redirect URI.
4. Verify:
   - `docker ps` — all containers up, auth healthy
   - `curl -s -o /dev/null -w '%{http_code}' https://strummy.online/sign-in` → 200
   - `curl -s -o /dev/null -w '%{http_code}' https://db.strummy.online/auth/v1/health` → 200
   - row counts unchanged (profiles / lessons / songs)
   - mailer URL paths, `MAILER_TEMPLATES` and `GOOGLE_REDIRECT_URI` are correct
   - `docker logs supabase_auth_StudentProduction | grep templatemailer` is silent
5. Send one real test email to a `+alias` and confirm it ARRIVES and the link
   host is the tunnel — a 200 from the API proves neither.
6. Do one real Google sign-in attempt on `strummy.online` and confirm it
   completes (not just that the container env looks right).

## What is safe to change in config.toml

`config.toml` **is** the right place for things it can express — e.g.
`otp_expiry` (raised to 86400 on 2026-07-31 so invite links survive overnight;
note it also governs password-recovery link lifetime). Those changes survive
restarts. Anything the CLI cannot express needs the repair script, and will
revert every time.
