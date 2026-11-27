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
- `tests/review/*.review.ts` is the review gallery, not a test: it asserts nothing and runs only through `scripts/review/run-review.sh` (`playwright.review.config.ts`). A new main screen goes into `tests/review/review-cast.ts` so the person deciding test → main sees it.

### Writing specs

- Never mock in E2E. Use the dev stack and the seeded role accounts.
- Prefer roles, labels and `data-testid` over CSS structure.
- Seed the data a spec needs in `beforeAll` (admin client) and clean it up in `afterAll`. Never rely on whatever happens to be in the DB.

### Every spec deletes what it creates (enforced)

_2026-11-27. By then the dev stack held 406 sign-in accounts without a profile, 343 API keys and 1 101 leads: each left by a spec whose rows matched none of the cleanup's title and e-mail patterns._

Testing that a row gets created is the point of many specs. Leaving it there is not.

- **The spec that creates a row deletes it**, in `afterEach`/`afterAll`, also when the test fails. This covers rows the app creates on the spec's behalf (a sign-up, an invite, an API key, a lead), not only the ones the spec inserts itself.
- **Delete for real.** A soft delete (`deleted_at`) is still a row. Delete through the admin client (`adminClient()`).
- **Accounts go through `auth.admin.deleteUser`**: the profile and its lessons, assignments and history cascade. Deleting only the profile leaves the sign-in account behind.
- **Delete exactly your own rows**: by the ids you collected, or, for rows made through the UI, by the one unique token (`Date.now()`) the spec puts into every title, name and address it creates. `tests/helpers/purge.ts` has both: `purgeByToken`, `purgeAccountsByToken`, `purgeOwnedSince` (state a role account's actions wrote: chat threads, quiz state). Never delete by a prefix another spec could share.
- **Do not add a pattern to `tests/helpers/cleanup.ts` or `stale-test-data.ts`** to cover a new spec. Those are the net for runs that were killed; they are not a spec's cleanup.
- The same holds for Jest suites that write to the dev stack (`*.rls.test.ts`, `*.integration.test.ts`).

**Enforced:** `tests/helpers/leak-check.ts`, called from `tests/global-teardown.ts`. It lists every row created since the run started that is still there, in every table of `database.types.ts` that has `id` and `created_at` (logs and queues written as a side effect are left out: `DERIVED_TABLES`), plus `auth.users`. The list goes to the job summary. With `E2E_LEAK_CHECK=strict` a non-empty list fails the run: Core flows and the full E2E job in `e2e.yml`, and every leg of the nightly. A local run only reports. The RLS suite (`npm run test:rls`) runs the same check after its own sweep and always fails on a leftover.

The dev stack is shared: a local run during a CI run shows up in that run's list. If the rows listed are not the run's own, re-run the job.
