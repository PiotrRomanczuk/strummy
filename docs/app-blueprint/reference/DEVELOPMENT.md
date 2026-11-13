---
created: 2025-12-05
updated: 2026-11-13
---

# Development Guide

## 🛠️ Setup & Installation

1. **Clone the repository**

   ```bash
   git clone <repo-url>
   cd strummy
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Variables**

   Copy `.env.example` to `.env.local` and fill in your Supabase credentials.

   ```bash
   cp .env.example .env.local
   ```

4. **Run Development Server**

   ```bash
   npm run dev
   ```

---

## 🌿 Branching Strategy

We follow a simplified Git flow:

- **`main`**: Production-ready code. Deploys to Production.
- **`develop`**: Integration branch. Deploys to Preview/Staging.
- **Feature Branches**: `feature/feature-name` (branched from `develop`).
- **Bugfix Branches**: `fix/bug-name` (branched from `develop`).

### Workflow

1. Create a feature branch: `git checkout -b feature/my-feature develop`
2. Commit changes.
3. Push and open a Pull Request (PR) to `develop`.
4. CI checks run.
5. Merge to `develop` after approval.

---

## 🧪 Testing

Jest (unit + integration) and Playwright (E2E) — details in `TESTING.md` and `AGENTS.md` §6.

- Unit: `npm test` (watch: `npm run test:watch`, coverage: `npm run test:coverage`); tests sit beside their subject (`X.test.ts`)
- Integration: `npm run test:integration` (`__tests__/**/*.integration.test.ts`)
- RLS against the dev database: `npm run test:rls`
- Core flows (Playwright, dev stack): `npm run test:flows`; full suite: `npx playwright test`

TDD: failing test → implementation → refactor.

---

## 🚀 CI/CD Pipeline

GitHub Actions for CI, Vercel for deployment — map in `.github/workflows/README.md`.

- **`ci.yml`** (every PR to `main`, every push to `main`): lint, typecheck, structure check, unit tests with
  coverage thresholds, integration tests, build.
- **`e2e.yml`** (self-hosted runner on uwh): Core flows on every PR, RLS, DB checks; the full Playwright
  matrix with the `e2e` label or for risky paths.
- **Deployment**: one branch. A PR gets a Vercel preview; merging to `main` deploys to production after
  `deploy-db.yml` applied its migrations. The author never merges — Piotr merges from the home-ops "Dziś" page.

### Database Migrations

Database changes are managed via Supabase migrations.

- **Local**: `supabase migration new <name>`
- **CI/CD**: Migrations are applied automatically via GitHub Actions (if configured) or manually via Supabase CLI/Dashboard before deployment.

---

## 📦 Deployment Checklist

Before merging to `main`:

1. Ensure all tests pass.
2. Verify no linting errors.
3. Check that environment variables are set in Vercel Production.
4. Verify database migrations are applied to the production database.
5. Perform a smoke test on the Preview deployment.

---

## 🤖 AI Agents Workflow

We utilize specialized AI agents to assist in development. These are integrated into our Copilot instructions.

### Available Agents

- **@backend-architect**: Design APIs, DB schemas, and backend logic.
- **@frontend-architect**: UI/UX design, accessibility, and responsiveness.
- **@system-architect**: High-level architecture and scalability.
- **@tech-stack-researcher**: Technology choices and trade-offs.
- **@requirements-analyst**: PRDs and user stories.
- **@refactoring-expert**: Code cleanup and optimization.
- **@performance-engineer**: Performance analysis and tuning.
- **@security-engineer**: Security audits and best practices.
- **@technical-writer**: Documentation and guides.
- **@learning-guide**: Explaining concepts.
- **@deep-research-agent**: Complex research tasks.

### Usage

Invoke them in your Copilot chat:

> "@backend-architect Design the schema for the new 'Songs' table."

## Development Credentials

The dev stack (`StrummyDevelopment`) has three role accounts; their e-mails and passwords are the defaults
in `playwright.config.ts` (`TEST_ADMIN_*`, `TEST_TEACHER_*`, `TEST_STUDENT_*`). They exist only on dev and
the repo is public — never reuse them anywhere else, and there are no test accounts on production.

The Mac's local stack is a copy of dev, so the same accounts work there. Realistic studio data for dev:
`scripts/database/seeding/dev/README.md`. Roles are columns on `profiles` (`is_admin`, `is_teacher`,
`is_student`), not a separate table.
