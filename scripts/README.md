---
created: 2025-11-02
updated: 2026-11-13
---

# `scripts/`

The map of every script folder. **`npm run <thing>` is the interface** (`package.json`); a script's own
header is the source of truth for what it does. Rule S7 (`.claude/rules/structure.md`): scripts live in
`scripts/<purpose>/`, nothing loose at this level, no wrappers that only forward.

## Safety first

- **Port 54321/54322 on `uwh` is PRODUCTION** (`StudentProduction`); dev is `55321/55322`
  (`StrummyDevelopment`). On the Mac, `127.0.0.1:54321/54322` is the local stack.
- `database/prod-guard.sh` is sourced by every tool that runs raw `psql` or the Supabase CLI: it refuses
  the production cluster (`local-cutover.sh`, `validate-migrations.sh`) or refuses to run on uwh at all
  (`setup/setup-db.sh`, `database/seeding/local/seed-db.sh`).
- Migrations reach dev and production **only** through `.github/workflows/deploy-db.yml`
  (`.claude/rules/migrations.md`). No script here applies migrations to production.
- Data scripts that write follow the `backfill/` pattern: `--validateOnly | --commit`, and a non-local URL
  needs `--remote`.

## Folders

| Folder         | What                                                                                                          | Entry points                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `ai/`          | Lesson-draft model benchmark (providers, scoring, report)                                                     | `npx tsx scripts/ai/lesson-draft-bench.ts`                                                         |
| `audit/`       | Route inventory, call graph, Bruno collection generator                                                       | `npm run audit:routes`, `audit:callgraph`, `audit:bruno`                                           |
| `backfill/`    | Dated one-off data loads with `--validateOnly / --commit / --remote` (song analyses, analysis sources)        | `npx tsx scripts/backfill/<file>.ts --dir … --validateOnly`                                        |
| `ci/`          | CI helpers — own map in `ci/README.md`                                                                        | `npm run check:structure`, `lighthouse*`, `test:bruno`                                             |
| `cron/`        | Optional uwh systemd timers for the cron endpoints (inactive unless installed)                                | `cron/README.md`                                                                                   |
| `database/`    | Type generation, inspection, rebuild tools, seeding, backup                                                   | see below                                                                                          |
| `development/` | Dev server helper, new-feature branch helper, calendar sync, demo external API client                         | `npm run dev:server`, `new-feature`, `dev:calendar-sync`, `demo:api`                               |
| `docs/`        | Screenshot capture and the walkthrough builder                                                                | `npx tsx scripts/docs/…`                                                                           |
| `drive/`       | Google Drive "Guitar Videos" sync to `song_videos` + diagnostics                                              | `npx tsx scripts/drive/sync-drive-videos.ts`                                                       |
| `e2e-remote/`  | Self-hosted runner jobs: `migrate-db.sh`, DB parity, migrations replay, test-data report                      | called by `e2e.yml` / `deploy-db.yml`                                                              |
| `import/`      | WhatsApp lesson import, create a song from a Spotify URL                                                      | `import/whatsapp/README.md`, `import/send-to-strummy.sh`                                           |
| `ops/`         | uwh operations: dev agent, key rotation, GoTrue mail URLs                                                     | `ops/dev-agent/README.md`                                                                          |
| `preview/`     | Render every e-mail template to HTML for review                                                               | `npx tsx scripts/preview/render-all-emails.ts`                                                     |
| `setup/`       | `.env.local` setup, local Supabase setup (Mac only), Gmail test token                                         | `npm run setup`, `setup:db`                                                                        |
| `testing/`     | AI / e-mail / Spotify smoke scripts, notification senders, security tests, test-data cleanup, API test server | `npm run test:ai`, `test:emails`, `test:spotify`, `test:cleanup`, `test:branch`, `test:api-server` |
| `utils/`       | `log_history.sh`, `report_summary.sh` — sourced by `ci/quality-check.sh`                                      | —                                                                                                  |
| `verify/`      | End-to-end verification CLI against a stack (CRUD, onboarding, e-mail)                                        | `npm run verify*`; `verify/README.md`                                                              |

### `database/`

| Path                                              | What                                                                                            |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `gen-types.sh`                                    | `npm run db:types` / `db:types:check` — `database.types.ts` from the dev schema                 |
| `inspect-db.ts`                                   | `npm run db:inspect`                                                                            |
| `local-cutover.sh`, `validate-migrations.sh`      | From-scratch rebuild tools (`docs/DATABASE_REBUILD.md`); explicit host/port, production refused |
| `prod-guard.sh`                                   | The guards above                                                                                |
| `maintenance/check-db-quality.sh`                 | `npm run db:quality` — read-only consistency checks                                             |
| `maintenance/remove-duplicate-songs.js`           | One-off duplicate-song cleanup                                                                  |
| `seeding/dev/`                                    | Realistic studio data for the dev stack (`seeding/dev/README.md`)                               |
| `seeding/demo/`                                   | Public demo cohort (`npm run seed:demo`, `seed:demo:sql`)                                       |
| `seeding/local/seed-db.sh`                        | `npm run seed` — Mac local stack only                                                           |
| `seeding/seed-songs.ts`, `import-content-plan.ts` | Song library seed, content-plan import                                                          |
| `seeding/test/seed-test-user.ts`                  | `npm run seed:test-user`                                                                        |
| `utils/export-seed-data.ts`                       | Export a stack's data to seed files                                                             |

## Removed on 2026-11-13

About 70 scripts that were unreferenced and either one-off (legacy imports, role migration), probes
with hardcoded keys, Cypress-era test helpers, Windows-only, or dangerous (wiping every user, migrating
production outside `deploy-db.yml`). They are in git history; the audit is in the vault
(`3-Zasoby/analysis/2026-11-13-strummy-audyt-skryptow-ci-agentow.md`).
