---
description: E2E testing rules — Playwright covers critical user flows and permissions only; everything else is unit-tested.
---

## E2E Testing (Playwright): critical flows only

_Updated 2026-10-10: aligned with the global testing rule (E2E for critical user flows, max 10 per feature, edge cases go to unit tests). The earlier "E2E for every change, from every role" rule had grown the suite to 94 specs and 416 tests per browser project, most of them re-checking copy, layout and empty states that component tests cover faster and more reliably._

### When a change needs E2E

Write or update a Playwright test when a change **adds or alters a critical user flow**:

- signing in as each role, and sign-out;
- creating and editing the core records: lesson, assignment, song, student;
- a student completing an assignment, or logging practice;
- the parent view loading their child's data;
- anything that enforces **permissions**: a role must not see or change another role's data. This is where testing several roles is required. Elsewhere one role is enough.

Everything else belongs in Jest component and unit tests: copy, layout, empty states, single filters, formatting and edge cases. This includes responsive variants, which are in the DOM but hidden by CSS, so use `.filter({ visible: true })` when a spec has to touch them.

### Limits

- **At most 10 E2E tests per feature.** Move the overflow down to unit or integration tests.
- No E2E test for a pure restyle. A visual change is verified with screenshots, recorded in the manual-test report.

### When to run what

- **Before a PR**: the specs for the flows you touched, plus `tests/e2e/smoke/` and the role-login spec, on `--project="Desktop Chrome"`.
- **Full suite** (every spec, every browser and device project): on the self-hosted runner / nightly. Not as a local pre-commit gate.
- **CI fails fast**: the remote run stops after the first test that fails all its retries (`E2E_MAX_FAILURES`, default `1`). Set `E2E_MAX_FAILURES=0` for a complete failure report.
- Specs under `tests/e2e/manual/` and `*.audit.ts` are opt-in, never part of the default run.

### Writing specs

- Never mock in E2E. Use the dev stack and the seeded role accounts.
- Prefer roles, labels and `data-testid` over CSS structure.
- Seed the data a spec needs in `beforeAll` (admin client) and clean it up in `afterAll`. Never rely on whatever happens to be in the DB.
