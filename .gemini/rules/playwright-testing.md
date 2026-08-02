---
description: Mandatory testing rules — Every new feature must be tested with Playwright E2E tests before completion.
---

## Mandatory E2E Testing (Playwright)

Every time a new feature is implemented, modified, or extended, you **MUST** write and execute Playwright end-to-end (E2E) tests to verify it works as intended from a user's perspective. 

### Rules:
1. **Never complete a feature without E2E coverage**: When implementing a new page, component, or server action, write a corresponding Playwright test in the `tests/` directory (or wherever e2e tests are located in this project).
2. **Run the tests**: You must run `npx playwright test` (or the specific test file you created) and verify that it passes before presenting the feature as "done".
3. **What to test**: 
   - Core user flows (e.g. creating, updating, deleting records).
   - Expected UI states (e.g. loading states, empty states, error messages).
   - **Role-based access (MANDATORY)**: You MUST test the feature from the point of view (POV) of an **Admin**, a **Teacher**, and a **Student**. Ensure each role sees the correct UI, has the right permissions, and cannot access restricted data.

By enforcing this rule, we ensure regressions are caught immediately and the application remains stable.
