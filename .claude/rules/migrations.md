## Database migrations — from file to production

_2026-10-19. Incident: #901 merged `lesson_transcripts` on 2026-10-14; nobody
applied it to StudentProduction and nothing blocked — `db-parity` was red on
every `main` commit for five days. Analysis: vault
`analysis/2026-10-19-strummy-prod-schema-drift.md`._

**Pipeline.** Merge to `main` → `deploy-db.yml` → `migrate-db.sh dev apply`
(canary) → `migrate-db.sh prod apply` (pg_dump first) → `check-db-parity.sh`
→ check **"DB ready for production"** → Vercel aliases the production build.

1. **Never apply to production by hand.** If the workflow failed, fix the file
   in a new migration and let it run again (`gh workflow run deploy-db.yml`).
2. **Migrations are immutable once merged.** `migrate-db.sh` stores a sha256 per
   file and fails on an edited one. A fix is a new file.
3. **Expand → contract.** The database migrates _before_ the new code is
   live, so every migration must work with the code that is running now.
   Removing a column/table = two releases: stop using it, then drop it.
4. **Destructive = approval.** `drop table|column|type|schema`, `rename`,
   column type changes, `truncate`, `delete from` stop at the `production-db`
   environment until the owner approves. Idempotency idioms
   (`drop policy|trigger|constraint|index if exists` before `create`) are not
   destructive and pass.
5. **One transaction per file** (unless the file has its own `begin;`/`commit;`),
   `lock_timeout=5s`, `statement_timeout=120s`. Big table rewrites belong in
   their own file so a lock timeout fails only that step.
6. **Shared dev stack.** Applying your branch's migration to dev to run E2E is
   fine; reverting it if the PR is closed is on you.

**Enforced:** `migrate-db.sh` (immutability, destructive gate, ≤10 pending per
run), `deploy-db.yml` (order + approval), Vercel Deployment Check (no alias
before the DB is ready), `db-parity` / `migrations-replay` in `e2e.yml`.
