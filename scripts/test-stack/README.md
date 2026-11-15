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
| `anonymize.rules.json`   | Every column of every public table, classified. One table per line.                                                                                          |
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
its table's line in `anonymize.rules.json` under the right action. When unsure,
choose `text` / `null` — the copy is for testing behaviour, not for reading data.

## How it runs (refresh, part B — not built yet)

Latest production backup from the NAS → restore into a scratch database inside the
StrummyTest container → apply the `test` branch's pending migrations → run this SQL
with `-v test_password="$(secret strummy-test-users)"` (single transaction, triggers
off, verification at the end) → swap it in. Nothing is exposed before the swap.

Checked 2026-11-15 on a scratch copy of the dev database (308 accounts, 485 190 audit
rows): 34 s, row counts unchanged, 0 real addresses left, claimed profiles still match
their accounts (17/17). Restore warnings about `cron`, `realtime` and `vault` objects
are expected outside the main `postgres` database.
