# CI scripts

_updated 2026-11-13 — the map; each script's header is the source of truth._

| Script                                            | Called by                                               | What it does                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `check-structure.sh`                              | `npm run check:structure`, `ci.yml`                     | Structural drift checks C1–C25 against `.structure-baseline` (`.claude/rules/structure.md`)       |
| `lighthouse-ci.sh`                                | `ci.yml` (`extended-ci` label), `npm run lighthouse:ci` | Lighthouse against a URL with thresholds                                                          |
| `lighthouse-audit.sh`, `lighthouse-prod-audit.sh` | `npm run lighthouse`, `npm run lighthouse:prod`         | Local Lighthouse runs (dev server / production build)                                             |
| `nightly-e2e-report.mjs`, `nightly-e2e-issue.sh`  | `nightly-e2e.yml`                                       | Turn the nightly Playwright reports into one triage report and one reused GitHub issue            |
| `run-bruno.sh`                                    | `e2e.yml` (`extended-ci`), `npm run test:bruno`         | Bruno API collection against an env (`--get-only` never mutates)                                  |
| `quality-check.sh`, `deploy-check.sh`             | `npm run quality`, `npm run deploy:check`               | Older all-in-one local checks; the real gates are `npm run lint && npm run typecheck && npm test` |

The pre-commit hook is `.husky/pre-commit` → `npx lint-staged` (config in `package.json`: eslint, prettier and related Jest tests for staged `.ts/.tsx`; prettier for the rest).
