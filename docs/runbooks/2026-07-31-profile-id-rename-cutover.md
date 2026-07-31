# Cutover: `user_id` → `profile_id` rename (production)

**Date**: 2026-07-31
**Migration**: `supabase/migrations/20260731143000_rename_profile_fk_columns.sql`
**Rollback**: `supabase/migrations/rollback/20260731143000_rename_profile_fk_columns.down.sql`
**Scope**: 14 columns across 14 tables, 10 plpgsql/sql functions, 1 RPC signature

---

## Why there is a window

Nothing in CI applies migrations to production — they are run by hand via `psql`
on `uwh`. The deployed Vercel build and the database schema therefore change at
two different moments, and between those moments one of them is wrong.

This was deliberately chosen (see the PR) over an expand/contract migration,
because expand/contract leaves a dual-column, trigger-synced state whose phase 3
historically never happens. The cost is a short window; the benefit is that the
schema is clean the moment this is done.

**Keep steps 2 and 3 back to back.** The window is however long you take
between them.

---

## Pre-flight

```bash
# 1. Confirm you are on the LAN (prod Postgres is LAN-only)
ipconfig getifaddr en0 | grep -qE "^192\.168\.1\." && echo "ON LAN" || echo "OFF-LAN — stop"

# 2. Back up the 14 affected tables (fast, ~seconds at current data volume)
ssh uwh "docker exec supabase_db_StudentProduction pg_dump -U postgres -d postgres \
  -t public.agent_execution_logs -t public.ai_conversations -t public.ai_generations \
  -t public.ai_usage_stats -t public.in_app_notifications -t public.notification_log \
  -t public.notification_preferences -t public.notification_queue -t public.system_logs \
  -t public.task_management -t public.theoretical_course_access -t public.user_history \
  -t public.user_preferences -t public.user_roles" \
  > ~/backups/pre-profile-id-rename-$(date +%Y%m%d-%H%M).sql

# 3. Confirm the migration is the newest and nothing else is pending
ls supabase/migrations/ | tail -3
```

Pick a low-traffic moment. Crons run on production deployments and the queue
processor touches `notification_queue` — the one table whose RPC signature
changes.

---

## Cutover

### 1. Merge the PR

Merging to `main` deploys to **production** (`strummy.online`). Wait for the
Vercel build to finish but **do not** let it go live before step 2 if you can
help it — in practice the build takes ~90s, which is your prep time.

### 2. Apply the migration

```bash
scp supabase/migrations/20260731143000_rename_profile_fk_columns.sql uwh:/tmp/
ssh uwh "docker exec -i supabase_db_StudentProduction psql -U postgres -d postgres \
  -v ON_ERROR_STOP=1 < /tmp/20260731143000_rename_profile_fk_columns.sql"
```

Expect 14 `NOTICE: renamed …` lines and a final `COMMIT`. The migration ends
with a post-condition guard that raises if any FK to `profiles.id` is still
named `user_id`, or if any function body still references a renamed column — so
a silent partial apply is not possible. Any `ERROR` means the whole thing rolled
back (it is wrapped in a single transaction); nothing is half-done.

### 3. Confirm the new build is live

```bash
vercel ls --json | head -1   # newest deployment should be READY, target=production
curl -sI https://strummy.online | head -1
```

### 4. Smoke (5 minutes, production test accounts)

Sign in as `p.romanczuk+testteacher@gmail.com` (see `CLAUDE.local.md`):

| Surface                    | Expect                                       |
| -------------------------- | -------------------------------------------- |
| Notification bell          | Loads, no error, unread count renders        |
| Settings → Notifications   | Preferences list loads and a toggle persists |
| AI → history               | Existing generations list                    |
| Theory course access panel | Member list renders                          |
| `/dashboard`               | Loads clean, no 500s                         |

Then check the queue processor actually drains:

```bash
ssh uwh "docker exec -i supabase_db_StudentProduction psql -U postgres -d postgres -c \
  \"select status, count(*) from notification_queue group by status;\""
```

`pending` should not be growing unboundedly. The processor calls
`get_pending_notifications`, whose output column changed — if that broke, this
is where it shows.

---

## Rollback

Only if step 4 fails. **Revert the deployment first, then the schema** — the
opposite order breaks the app in the other direction.

```bash
# 1. Roll back Vercel to the previous production deployment
vercel rollback <previous-deployment-url>

# 2. Revert the schema
scp supabase/migrations/rollback/20260731143000_rename_profile_fk_columns.down.sql uwh:/tmp/
ssh uwh "docker exec -i supabase_db_StudentProduction psql -U postgres -d postgres \
  -v ON_ERROR_STOP=1 < /tmp/20260731143000_rename_profile_fk_columns.down.sql"
```

Both directions were exercised on `StudentDevelopment` on 2026-07-31:
forward → rollback → forward, with `npm run test:rls` (107 tests) passing at the
end. No data is moved by either direction — these are metadata-only renames, so
there is nothing to lose and the rollback cannot fail on data.

---

## After

- `npm run db:types:check` in CI gates the generated types; they are already
  committed against the migrated schema, so this passes only once production
  matches. If it fails after the cutover, production did not get the migration.
- Delete nothing from `supabase/migrations/rollback/` — it is the record of how
  this was undone if it ever needs undoing again.
