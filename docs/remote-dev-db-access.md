# Remote dev-DB access (Claude Code on the web / cloud containers)

Cloud sessions (Claude Code on the web, CI containers other than the `uwh`
runner) cannot reach the `StudentDevelopment` stack: `192.168.1.75` is LAN-only,
and the containers' outbound traffic goes through a network-policy proxy. This
runbook makes the **dev** stack reachable from those sessions — deliberately
mirroring how production already works (Cloudflare tunnel in front of Kong).

> **Never do any of this for the production stack (port 54321).** Prod already
> has its tunnel; dev gets its own, clearly-dev-named hostname. The RLS test
> harness (`lib/testing/rls/env.ts`) hard-refuses prod-shaped URLs — pick a
> hostname that cannot be mistaken for prod (e.g. `strummy-dev-db.<domain>`).

## Architecture

```
cloud container ── HTTPS ──► Cloudflare edge ──► cloudflared (uwh) ──► Kong :55321 (dev API)
```

Only the **API (Kong)** is exposed — PostgREST/auth with Supabase keys as the
auth layer, same exposure model as the existing prod tunnel. The Postgres port
(55322) is **never** tunneled; raw SQL from remote sessions goes through the
self-hosted runner instead (see "What stays on the runner" below).

## One-time setup on `uwh`

1. Add a dev ingress to the existing `cloudflared` tunnel config
   (`~/.cloudflared/config.yml`), above the catch-all:

   ```yaml
   ingress:
     - hostname: <dev-db-hostname> # e.g. strummy-dev-db.<your-domain>
       service: http://localhost:55321
     # ... existing prod ingress ...
     - service: http_status:404
   ```

2. Route DNS for it and restart the tunnel:

   ```bash
   cloudflared tunnel route dns <tunnel-name> <dev-db-hostname>
   sudo systemctl restart cloudflared
   ```

3. Verify from outside the LAN (401 = Kong answered, auth required — correct):

   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' https://<dev-db-hostname>/rest/v1/
   ```

**Optional hardening — Cloudflare Access service token** in front of the dev
hostname. If enabled, every client must send `CF-Access-Client-Id` /
`CF-Access-Client-Secret` headers; supabase-js supports this via
`createClient(url, key, { global: { headers } })`, and the RLS harness clients
(`lib/testing/rls/clients.ts`) would need that hook added. Skip it initially —
the keys themselves gate the API, exactly as on prod — but it is the right next
step if the dev stack ever holds data you care about.

## Per-environment setup in Claude Code (claude.ai → environment settings)

1. **Network policy**: add `<dev-db-hostname>` to the environment's allowed
   domains. Without this the proxy refuses the connection regardless of DNS.
2. **Environment variables** (encrypted env config — NEVER the repo; it is
   public):

   ```bash
   # RLS/integration suites (preferred, prod-proof — see lib/testing/rls/env.ts)
   RLS_TEST_SUPABASE_URL=https://<dev-db-hostname>
   RLS_TEST_ANON_KEY=<dev sb_publishable_… key>
   RLS_TEST_SERVICE_ROLE_KEY=<dev sb_secret_… key>

   # Optional: lets `npm run dev` / seed scripts hit dev from the container too
   NEXT_PUBLIC_SUPABASE_LOCAL_URL=https://<dev-db-hostname>
   NEXT_PUBLIC_SUPABASE_LOCAL_ANON_KEY=<dev sb_publishable_… key>
   ```

   The real hostname and keys live in `CLAUDE.local.md` on the Mac and in the
   environment config — this file intentionally uses placeholders.

## Verify from a remote session

```bash
curl -s -o /dev/null -w '%{http_code}\n' "$RLS_TEST_SUPABASE_URL/rest/v1/"  # expect 401
npm run test:rls                                                            # full proof
```

If `test:rls` throws "refuses to run against production-shaped URL", the URL
matched the guard list in `lib/testing/rls/env.ts` — you pointed it at prod or
named the dev hostname confusingly. Fix the hostname, not the guard.

## What stays on the self-hosted runner

- Anything needing **psql** (applying migrations to dev:
  `docker exec -i supabase_db_StudentDevelopment psql …` on `uwh`).
- The E2E suite (needs the app + stack co-located for speed and seeding).
- Schema parity checks (`check-db-parity.sh`).

Remote sessions that need those should push a branch and let `e2e.yml`'s jobs
do the work, or leave a follow-up note — see `.claude/rules/workflow.md`
"Remote Sessions".

## Security notes

- The service-role key over a public hostname is **full database access**.
  Acceptable for a seed-data dev stack; unacceptable the moment real student
  data lands there — add Cloudflare Access (above) or tear the tunnel down.
- Rotate the dev keys if they ever appear in a commit, log, or paste. The repo
  is public.
- Keep the tunnel dev-only. The guard list in `lib/testing/rls/env.ts` blocks
  known prod markers; it cannot protect against a prod tunnel you name like dev.
