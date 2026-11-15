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
anonymisation → API open. Any failure wipes the restored data and leaves the API closed.
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
