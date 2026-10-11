# E2E Testing with Playwright

This directory contains end-to-end tests using Playwright, organized by feature and role.

## Test Data Cleanup

To prevent test data pollution in the database, we have automatic cleanup mechanisms:

### Automatic Cleanup

**Global Teardown** runs automatically after all Playwright tests complete:

- Deletes all test data across tables: songs, lessons, assignments, assignment templates, users, pending students, AI conversations, orphaned data
- Identifies test data by specific patterns (e.g., "E2E Song", "e2e.student.*@example.com", "E2E Test Artist")
- Runs via `tests/global-teardown.ts`
- Smart deletion order ensures referential integrity (dependent data deleted first)

### Manual Cleanup

Clean up test data on demand:

```bash
npm run test:cleanup
```

This is useful for:

- Cleaning up after interrupted test runs
- Removing leftover test data from failed tests
- Manual database maintenance

### Test Data Patterns

The cleanup system identifies test data using these patterns:

**Songs:**

- Titles: `E2E Song {timestamp}`, `E2E API Test Song {timestamp}`, `Teacher Song {timestamp}`, `E2E Edit Test {timestamp}`, titles ending with `EDITED` or `UPDATED`
- Artists: `E2E Test Artist`, `Teacher Test Artist`, any starting with `E2E Test Artist`

**Lessons:**

- Titles: `E2E Lesson {timestamp}`, `E2E Teacher Lesson {timestamp}`, `Teacher Lesson {timestamp}`, `Test Lesson {timestamp}`
- Notes: `E2E Test lesson notes`

**Assignments:**

- Titles: `E2E Assignment {timestamp}`, `Teacher Assignment {timestamp}`, `Test Assignment {timestamp}`
- Descriptions: Starting with `E2E Test assignment description`

**Assignment Templates:**

- Titles: `E2E Template {timestamp}`, `Teacher Template {timestamp}`, `Test Template {timestamp}`
- Descriptions: Starting with `E2E Test template description`

**Users (Profiles):**

- Emails: `e2e.student.{timestamp}@example.com`, `e2e.teacher.{timestamp}@example.com`, `e2e.admin.{timestamp}@example.com`
- First Names: `E2ETest`, `E2EEdited`, any starting with `E2E`
- **Note**: Deleting users cascades to practice sessions, song progress, and related data

**Pending Students:**

- Emails: `e2e.pending.{timestamp}@example.com`, `test.pending.{timestamp}@example.com`

**AI Conversations:**

- Titles: Starting with `E2E Test Conversation` or `Test AI Conversation`
- **Note**: Deleting conversations cascades to AI messages

For complete pattern documentation, see `2026-02-01-TESTING-CLEANUP.md`

### Adding New Test Patterns

If you create new test data patterns, add them to `tests/helpers/cleanup.ts`:

```typescript
const TEST_PATTERNS = {
  songs: {
    titles: [
      /^YourNewPattern \d+/,
      // ... existing patterns
    ],
  },
};
```

## Running Tests

### All Tests

```bash
npm run playwright:run
```

### By Tag

```bash
npm run test:pw:smoke
npm run test:pw:admin
npm run test:pw:teacher
npm run test:pw:student
npm run test:pw:songs
npm run test:pw:lessons
npm run test:pw:assignments
```

### By Device

```bash
npm run test:pw:iphone12
npm run test:pw:ipad
npm run test:pw:desktop
npm run test:pw:mobile    # All mobile devices
npm run test:pw:tablet    # All tablets
npm run test:pw:devices   # Mix of devices
```

### Interactive Mode

```bash
npm run playwright:open
```

### Debug Mode

```bash
npm run playwright:debug
```

## Running Against Production (deployed target)

_Added 2026-10-11 — background: `docs/audits/2026-10-11-e2e-prod-safety-audit.md`._

```bash
npm run test:pw:prod                                         # every @prod-safe test, desktop + iPhone 12
npm run test:pw:prod -- --project="Desktop Chrome"           # desktop only
E2E_SKIP_AUTH_PREFLIGHT=1 npm run test:pw:prod -- --grep @smoke   # no accounts needed
```

`playwright.prod.config.ts` decides what may run. Nothing typed on the CLI can widen it:

- **Only `@prod-safe` tests run.** The grep sits on each project, so `--grep` narrows but never adds.
- **`testIgnore`** drops specs that change shared or other users' data through the UI (integration, AI, notifications, skills, journeys…).
- **No service-role client.** `adminClient()` throws for the whole run, and on any production DB URL in every run (`tests/helpers/prod-guard.ts`).
- **No global teardown.** Its pattern deletes can match real records.
- **Preflight** signs the role accounts in against the target's own auth endpoint and fails in seconds if they don't work.

Create `.env.e2e-prod.local` (gitignored; loaded with override on top of `.env.local`):

```bash
E2E_TARGET_SUPABASE_URL=https://<prod supabase host>   # see CLAUDE.local.md
E2E_TARGET_SUPABASE_ANON_KEY=<prod anon key>            # public by design
TEST_TEACHER_EMAIL=p.romanczuk+testteacher@gmail.com
TEST_TEACHER_PASSWORD=...
TEST_STUDENT_EMAIL=p.romanczuk+teststudent@gmail.com
TEST_STUDENT_PASSWORD=...
# TEST_ADMIN_EMAIL / _PASSWORD — optional; checked only when set
```

**Tagging a test `@prod-safe`** is a claim that it is read-only, needs no `adminClient()`, logs in only as teacher/student, and leaves nothing behind if it fails halfway. Tag the test, not the describe, when only part of a file qualifies.

## Test Organization

```
tests/
├── e2e/                      # E2E test specs
│   ├── admin/               # Admin role tests
│   ├── teacher/             # Teacher role tests
│   ├── student/             # Student role tests
│   ├── songs/               # Song feature tests
│   ├── lessons/             # Lesson feature tests
│   ├── assignments/         # Assignment feature tests
│   ├── dashboard/           # Dashboard tests
│   ├── integration/         # Cross-feature tests
│   ├── cross-feature/       # Multi-role tests
│   └── smoke/               # Critical path tests
├── fixtures/                # Test fixtures
├── helpers/                 # Test utilities
│   ├── auth.ts             # Authentication helpers
│   ├── cleanup.ts          # Data cleanup utilities
│   └── form.ts             # Form interaction helpers
├── global-teardown.ts      # Global teardown script
└── 2026-03-16-2025-11-02-README.md               # This file
```

## Best Practices

1. **Use unique test data**: Always use timestamps in test data (`${Date.now()}`)
2. **Follow naming patterns**: Use the established test patterns for automatic cleanup
3. **Clean up in tests**: Add `test.afterAll()` hooks for critical cleanup if needed
4. **Tag your tests**: Use `{ tag: ['@admin', '@songs'] }` for easy filtering
5. **Use data-testid**: Prefer `[data-testid="..."]` selectors for stability

## Troubleshooting

### Test data not cleaning up

- Run manual cleanup: `npm run test:cleanup`
- Check if your test data matches the patterns in `cleanup.ts`
- Verify Supabase credentials in `.env.local`

### Global teardown not running

- Check `playwright.config.ts` has `globalTeardown: './tests/global-teardown.ts'`
- Ensure tests complete successfully (teardown only runs on normal exit)

### Database connection issues

- Verify `NEXT_PUBLIC_SUPABASE_LOCAL_URL` in `.env.local`
- Verify `NEXT_PUBLIC_SUPABASE_LOCAL_ANON_KEY` in `.env.local`
- Check that Supabase is running locally
