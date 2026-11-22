# `__tests__/`

_updated 2026-11-13_

Legacy location. New unit tests live **beside their subject** (`X.test.ts`, `X.unit.test.ts`) — see
`AGENTS.md` §4 and §6. This directory still holds:

- integration tests (`**/*.integration.test.ts`, run by `npm run test:integration`);
- older unit tests not yet moved next to their code.

Commands: `npm test` (unit), `npm run test:watch`, `npm run test:integration`, `npm run test:all`.
E2E is Playwright under `tests/` (`npm run test:flows`, `npx playwright test`).
