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
2. **Migrations are immutable once merged.** `migrate-db.sh` stores a sha256 of
   each file's SQL (comments and blank lines excluded — touching a comment is
   fine) and fails on an edited one. A fix is a new file. If an edit is proven
   harmless, a human re-records it: `migrate-db.sh <dev|prod> accept <version>...`.

3. **Expand → contract.** The database migrates _before_ the new code is
   live, so every migration must work with the code that is running now.
   Removing a column/table = two releases: stop using it, then drop it.
4. **Adding is automatic, removing waits for the owner** (owner decision
   2026-10-19: too much is harmless, deleting something needed is not).
   Approval on the `production-db` environment is required for `drop
table|column|type|schema`, `rename`, column type changes, `truncate`,
   `delete from`, `update … set` (rewrites existing rows), any `drop … cascade`
   (takes dependants with it), and any `drop function|view|trigger|policy|
index|constraint|sequence` the same file does not recreate. Drop-then-
   recreate of the same name is the idempotency idiom and passes; DML inside a
   `create function` body is stored code and passes; a `do $$ … $$` block runs
   and is checked. Check a file locally with
   `bash scripts/e2e-remote/migrate-db.sh classify <file>`.
5. **One transaction per file** (unless the file has its own `begin;`/`commit;`),
   `lock_timeout=5s`, `statement_timeout=120s`. Big table rewrites belong in
   their own file so a lock timeout fails only that step.
6. **Shared dev stack.** Applying your branch's migration to dev to run E2E is
   fine; reverting it if the PR is closed is on you.

**Enforced:** `migrate-db.sh` (immutability, destructive gate, ≤10 pending per
run), `deploy-db.yml` (order + approval), Vercel Deployment Check (no alias
before the DB is ready), `db-parity` / `migrations-replay` in `e2e.yml`.
