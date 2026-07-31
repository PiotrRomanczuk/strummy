# E2E Tests Location

Cypress end-to-end tests live in `cypress/e2e/`.

Current specs:

- `cypress/e2e/smoke.cy.ts` — Loads the home page and checks for key text.

Run commands:

```bash
npm run e2e       # headless
npm run e2e:open  # interactive
npm run e2e:db    # with Supabase + Next.js started by scripts/development/dev-server.sh
```

Notes:

- Configure baseUrl via `CYPRESS_BASE_URL` (defaults to http://localhost:3000).
- Add more specs under `cypress/e2e/` and keep selectors resilient to UI changes.
