---
created: 2026-11-15
updated: 2026-11-15
---

# StrummyTest — anonymised copy of production

The `test` branch runs against `StrummyTest`, a Supabase stack on uwh holding an
anonymised copy of production (`.claude/rules/branch-safety.md`). This folder
holds the anonymisation; the stack itself and its weekly refresh are set up on
uwh (planner vault, Strummy note).

| File                     | What                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `anonymize.rules.json`   | Every column of every public table, classified and grouped by action.                                                                                        |
| `anonymize.ts`           | Turns the rules into SQL; `unclassified()` finds columns without a rule.                                                                                     |
| `anonymize-auth.sql`     | `auth` schema: test addresses, the shared test password, one email identity per user, no sessions/tokens; then the verification that aborts the transaction. |
| `build-anonymize-sql.ts` | `npm run -s test-stack:anonymize-sql > anonymize.sql`                                                                                                        |
| `anonymize.unit.test.ts` | Fails when a column in `database.types.ts` has no rule, or a rule names a column that is gone.                                                               |
| `e2e-accounts.sql`       | After the anonymisation: dev's four E2E role logins (`admin`/`teacher`/`student`/`parent@dev.local`, same roles and fields), with the shared test password.  |
| `e2e-env.sh`             | Writes the `.env.local` of an E2E run against StrummyTest — every Supabase name points at the test stack, no production value survives.                      |

## Actions

| Action                                            | Becomes                                                                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `keep`                                            | unchanged — ids, timestamps, statuses, numbers, song data                                                                |
| `null`                                            | `NULL` (phones, avatar URLs, payment links, transcript share links)                                                      |
| `text`                                            | Lorem ipsum of the same length; `NULL` stays `NULL`                                                                      |
| `json`                                            | `'{}'::jsonb` (history snapshots, audit changes, AI inputs)                                                              |
| `name`, `first_name`, `last_name`, `name_profile` | `Osoba 1A2B`, `Uczeń 1A2B`, … — stable per row                                                                           |
| `email_profile`                                   | `u-<md5(user_id)>@test.strummy.invalid` — the same address `auth.users` gets, so sign-in and shadow claims still line up |
| `email_invite`, `email_parent`                    | `i-…` / `parent-…@test.strummy.invalid`                                                                                  |
| `truncate` (table)                                | all rows deleted — credentials, OAuth tokens, logs, leads, the notification queue, inFakt client ids                     |

`.invalid` is a reserved TLD: nothing sent from the test stack can reach a person.

## Adding a column

A migration that adds a column turns `anonymize.unit.test.ts` red. Add the column to
its table in `anonymize.rules.json` under the right action. When unsure,
choose `text` / `null` — the copy is for testing behaviour, not for reading data.

## The stack (uwh)

`stack/` is deployed to `~/strummy-test/` on uwh: `supabase/config.toml` (ports 573xx; no Studio,
no postgres-meta — Kong serves `/pg/*` without an API key), `stack-init-secrets.sh` (JWT secret,
opaque keys, own ES256 signing key, shared test password — mode 600, never printed),
`stack-start.sh` (Supabase CLI 2.122, images pinned to production's versions, key table redacted
from the output). Secrets in Bitwarden: `strummy-test-keys`, `strummy-test-signing-key`,
`strummy-test-users`.

## Refresh

`refresh.sh --source prod-backup|dev`, run on uwh from a checkout of the `test` branch:
dump → API (Kong) closed → wipe → `auth` data → `public` + `strummy_ops` (grants and default
privileges included) → `auth` triggers → pending migrations (`migrate-db.sh test apply`) →
anonymisation → E2E role accounts + the demo studio
(`emit-demo-sql.ts`, the SQL production's demo was built with) → API open. Any failure wipes the restored data and leaves the API closed.
`--source prod-backup` refuses to run until port 57322 is limited to the LAN
(`docker-user-rules.service`).

Between refreshes, a push to `test` migrates StrummyTest (`deploy-db.yml` → `migrate-db.sh test
apply`) and replays the `test` branch's migrations to prove the schema matches. The refresh and
that deploy take the same lock (`~/strummy-test/.lock`), so a deploy never migrates a
half-restored copy and a refresh never starts under a running deploy.

Checked 2026-11-15 with `--source dev`: 70 s end to end; an anonymised student account signs in
with the test password (ES256 token), RLS shows it 2 profiles and its 12 lessons, a wrong password
gets 400, `trigger_handle_new_user` is back on `auth.users`. The anonymisation alone was checked
earlier on a scratch copy of the dev database (485 190 audit rows, 0 real addresses left).

## E2E on test

`.github/workflows/e2e-test.yml` runs every spec, nightly at 02:47 UTC and on dispatch, on the
code of the `test` branch against StrummyTest, and posts the result as the commit status
**E2E on StrummyTest** on the `test` commit — which is the head of a test → main PR. The suite
runs unchanged; only the env differs (`e2e-env.sh`): dev's role logins exist on the copy with
the test password (`TEST_*_PASSWORD`), app mail goes to the stack's Mailpit (57324/57325), and
`tests/e2e/test-stack/` (`@copy`) signs in as the copy's own busiest teacher, student and
parent. The global teardown never deletes `@test.strummy.invalid` accounts
(`tests/helpers/cleanup.ts`).

By hand on uwh (a checkout of `test`, Node 22):

```bash
bash scripts/test-stack/e2e-env.sh .env.local
CI=true E2E_PORT=3500 E2E_DB_CONTAINER=supabase_db_StrummyTest SMTP_PORT=57325 E2E_MAX_FAILURES=0 \
  bash scripts/e2e-remote/remote-runner.sh
```
