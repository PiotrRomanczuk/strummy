# Runbook — repairing `db-parity` / `migrations-replay` drift

**Why this file exists.** On 2026-10-18 the PR-fleet babysitter found both checks
red on `main` and had been red since 2026-10-16. Neither is a required check, so
branch protection never blocked anything and nothing surfaced the condition for
two days. What was actually wrong: `20261014150000_lesson_transcripts.sql`
merged to `main` in #901 — which deploys straight to Vercel production — and the
migration was never applied to `StudentProduction`. The transcripts feature had
been shipped to real users against a table that does not exist in their database.

The checks were doing their job perfectly. The gap was that nobody was reading
them. This runbook is the repair half; the reading half now lives in the
babysitter routine's prompt.

## What each check proves

Three checks form a triangle, and each closes a side the other two cannot see
(the reasoning is written out at the top of `scripts/e2e-remote/check-migrations-replay.sh`):

| Check               | Claim                             | Script                                       |
| ------------------- | --------------------------------- | -------------------------------------------- |
| `db-parity`         | prod schema == dev schema         | `scripts/e2e-remote/check-db-parity.sh`        |
| `migrations-replay` | `supabase/migrations` == dev schema | `scripts/e2e-remote/check-migrations-replay.sh` |
| `DB types drift`    | `database.types.ts` == dev schema | `types-drift` job in `.github/workflows/e2e.yml` |

Both repair paths below need `psql` inside the Supabase containers on `uwh`.
**Neither can be done from a Claude Code cloud session** — the stacks live on
`192.168.1.75` (LAN) and a cloud container cannot route there. Probe before
assuming otherwise; absent `RLS_TEST_SUPABASE_URL`, there is no tunnel.

Both jobs are read-only and run on every trusted `push` and `pull_request`, so
re-running is just `gh workflow run e2e.yml --ref main` (or re-running the failed
jobs) once the repair is applied.

---

## `db-parity` red — production is missing something dev has

**Meaning:** a migration landed on `main` (therefore on production *code*) and
was never applied to the production *database*. Code is live against a schema
that does not exist. Severity depends entirely on how the consuming code handles
the error — see "Assess the blast radius" below before deciding how fast to move.

### 1. Read what is actually missing

The job prints the object list and uploads the full diff as the
`schema-parity-diff` artifact (14-day retention). From a Claude Code session the
raw log blob URL returns `403` through the agent proxy — use the GitHub MCP tool
instead of `gh api .../logs`:

```
mcp__github__get_job_logs(owner, repo, run_id=<run>, failed_only=true,
                          return_content=true, tail_lines=75)
```

`tail_lines` matters: the last ~45 lines are artifact upload and git cleanup, and
the object list sits just above them.

### 2. Work out which migration files are missing

Map each reported object to the migration that creates it:

```bash
grep -rln "<object_name>" supabase/migrations/
```

Then confirm against production directly:

```bash
# on uwh
docker exec -i supabase_db_StudentProduction \
  psql -U postgres -d postgres -c "\d public.<table>"
```

### 3. Assess the blast radius before applying anything

Find every consumer of the missing objects and read how each one fails:

```bash
grep -rln "<table_name>" app lib components --include=*.ts --include=*.tsx
```

A read path that logs and returns `null` degrades to an empty feature. A write
path (an API route, a Server Action) returns an error to the user. A query that
merely *selects* a dropped column makes Postgres reject the **entire** query with
`42703`, which is how one stale reference broke a whole feature before
(`.claude/rules/structure.md` S4). Say which case you have; do not assume outage
and do not assume harmless.

### 4. Apply, then verify

```bash
# on uwh — PRODUCTION. Read docs/runbooks/supabase-stack-restart.md first if
# anything tempts you to restart the stack; it will silently break auth email.
docker exec -i supabase_db_StudentProduction \
  psql -U postgres -d postgres < supabase/migrations/<file>.sql
```

The migrations are written idempotently (`create table if not exists`, `create or
replace function`, `drop policy if exists` before `create`), so re-applying one
is safe — that is a project rule, not luck. Then:

```bash
bash scripts/e2e-remote/check-db-parity.sh /tmp/parity.diff && echo PARITY OK
```

Verify the feature itself, not just the check. Exercise the real path in
production (the production test accounts in `CLAUDE.local.md` exist for exactly
this) before calling it done.

---

## `migrations-replay` red — dev has something no migration creates

**Meaning:** someone changed the dev schema by hand through `psql` or Studio and
never filed the migration. The change is in dev, will propagate to prod, and is
reflected in `database.types.ts` — and is simply absent from the repo, so a
fresh database would not have it. This is the exact failure CLAUDE.md's
"Database Changes (MANDATORY)" rule exists to prevent.

### Do not reconstruct the DDL from the object name

The 2026-10-18 instance was two indexes, `ux_ai_workflow_runs_active_per_lesson`
(created by `20260805100000_ai_workflow_runs.sql:30`, on `(lesson_id)` where
`status in ('running','awaiting_review')`) and
`ux_ai_workflow_runs_active_per_lesson_type`, which exists in dev and in no
migration. The name makes the intent obvious and the column list still is not:
guessing the columns or the predicate of a **unique** index means shipping a
different concurrency guarantee than the one running in dev, and the replay
check will stay red while the repo now carries a wrong migration that production
will eventually receive.

Ask the database instead. One command gives the exact definition:

```bash
# on uwh
docker exec -i supabase_db_StudentDevelopment psql -U postgres -d postgres -At \
  -c "select indexdef || ';' from pg_indexes
      where schemaname = 'public' and indexname = '<index_name>'"
```

`pg_get_constraintdef`, `pg_get_functiondef` and `pg_get_triggerdef` do the same
for the other object kinds; `\d+ public.<table>` is the quick human read.

### Then file it, or revert dev

Two legitimate endings, and the choice is a real decision:

- **The hand change was intended** → file it as a migration
  (`YYYYMMDDHHMMSS_short_description.sql`, idempotent DDL) using the definition
  you just dumped. If it replaces an existing index, the migration must `drop
  index if exists` the old one too, or a fresh database ends up with both.
- **The hand change was a mistake** → drop it in dev so dev matches the
  migrations again. The file is the source of truth, not the live database.

Re-run the check locally before pushing — it writes only to its own scratch
database (`strummy_migration_shadow`) and drops it each run:

```bash
bash scripts/e2e-remote/check-migrations-replay.sh /tmp/replay.diff && echo REPLAY OK
```

---

## Why these are not required checks

Deliberately: both need the self-hosted runner next to the stacks, and making
them required would let a runner outage block every merge. The cost of that
choice is that nothing enforces them — so they have to be *read*. That is now
the PR-fleet babysitter's job on every fire, and the finding goes to a
`[schema-drift]` tracking issue plus a push notification rather than into a
transcript nobody opens.
