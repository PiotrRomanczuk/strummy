## Database migrations — from file to production

_2026-10-19. Incident: #901 merged `lesson_transcripts` on 2026-10-14; nobody
applied it to StudentProduction and nothing blocked — `db-parity` was red on
every `main` commit for five days. Analysis: vault
`analysis/2026-10-19-strummy-prod-schema-drift.md`._

**Pipeline** (since 2026-11-15: one database per branch, `branch-safety.md`).
A migration reaches a database when it lands on that database's branch —
`deploy-db.yml` runs on every push to `dev`, `test` and `main`:

| Push to | Database (`migrate-db.sh` target) | Before applying                    | After applying                                                            |
| ------- | --------------------------------- | ---------------------------------- | ------------------------------------------------------------------------- |
| `dev`   | `StrummyDevelopment` (`dev`)      | pg_dump                            | —                                                                         |
| `test`  | `StrummyTest` (`test`)            | waits for a running refresh        | replay of `test`'s migrations == StrummyTest                              |
| `main`  | `StudentProduction` (`prod`)      | pg_dump; destructive files: rule 4 | replay of `main`'s migrations == production → **DB ready for production** |

The last check is the Vercel Deployment Check: the production build is aliased
only after it passes.

`StrummyTest` is an anonymised copy of production, so it is the canary: every
migration runs there before it reaches `main`. Its refresh
(`scripts/test-stack/refresh.sh`) and the deploy share a lock and never overlap.

1. **Never apply to production by hand.** If the workflow failed, fix the file
   in a new migration and let it run again (`gh workflow run deploy-db.yml`,
   `--ref dev|test` for the other databases).
2. **Migrations are immutable once merged.** `migrate-db.sh` stores a sha256 of
   each file's SQL (comments and blank lines excluded — touching a comment is
   fine) and fails on an edited one. A fix is a new file. If an edit is proven
   harmless, a human re-records it: `migrate-db.sh <dev|prod> accept <version>...`.

3. **Expand → contract.** The database migrates _before_ the new code is
   live, so every migration must work with the code that is running now.
   Removing a column/table = two releases: stop using it, then drop it.
4. **Adding is automatic, removing waits for the owner** (owner decision
   2026-10-19: too much is harmless, deleting something needed is not).
   On `dev` and `test` destructive files apply on their own (dev is dumped
   first, test is rebuilt from production's backup anyway); before production,
   approval on the `production-db` environment is required for `drop
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
   `db-parity` on a PR compares the branch database (dev; StrummyTest for a
   PR into `main`) with **production + every migration the branch has and
   `main` does not** — the PR's own and those merged to `dev`/`test` waiting
   for a release — rebuilt in a scratch database. Other open PRs may see it
   red until yours merges — dev is then ahead by a file their branch does
   not have. After a push to `main`, `deploy-db.yml` checks strictly that
   production == `main`'s migrations (2026-10-21 #943/#944, 2026-11-15).

**Enforced:** `migrate-db.sh` (immutability, destructive gate, ≤10 pending per
run), `deploy-db.yml` (order + approval + replay check per branch), Vercel
Deployment Check (no alias before the DB is ready), `db-parity` /
`migrations-replay` / `types-drift` in `e2e.yml` (against the branch database).
