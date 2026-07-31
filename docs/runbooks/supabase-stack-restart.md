---
created: 2026-07-31
updated: 2026-07-31
---

# Restarting a self-hosted Supabase stack (uwh)

Read this **before** running `supabase stop` / `supabase start` against
`StudentProduction`. Two things about these stacks are not obvious and both have
already caused incidents.

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

All four must show `https://strummy-db.marszal-arts.online/auth/v1/verify`.

To confirm end to end without handling tokens, trigger a reset to a `+alias` you
control and search Gmail for the hostname — a body search tells you which host
the link uses without ever reading the token:

```
to:p.romanczuk+testteacher@gmail.com "strummy-db.marszal-arts.online" newer_than:1h
```

## 2. You cannot recreate a single container

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
3. **Run the repair script** (section 1) — always, on prod.
4. Verify:
   - `docker ps` — all containers up, auth healthy
   - `curl -s -o /dev/null -w '%{http_code}' https://strummy.online/sign-in` → 200
   - `curl -s -o /dev/null -w '%{http_code}' https://strummy-db.marszal-arts.online/auth/v1/health` → 200
   - row counts unchanged (profiles / lessons / songs)
   - mailer URL paths point at the tunnel
5. Send one real test email to a `+alias` and confirm the link host.

## What is safe to change in config.toml

`config.toml` **is** the right place for things it can express — e.g.
`otp_expiry` (raised to 86400 on 2026-07-31 so invite links survive overnight;
note it also governs password-recovery link lifetime). Those changes survive
restarts. Anything the CLI cannot express needs the repair script, and will
revert every time.
