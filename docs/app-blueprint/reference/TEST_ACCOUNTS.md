---
created: 2026-07-30
updated: 2026-07-30
---

# Test Accounts

## Production (`StudentProduction`)

Two dedicated test accounts exist on the **live production database** for
manual/agent QA against real production flows — created 2026-07-30:

| Role    | Email                               | Notes                                                                              |
| ------- | ----------------------------------- | ---------------------------------------------------------------------------------- |
| Teacher | `p.romanczuk+testteacher@gmail.com` | Role assigned successfully via `/dashboard/users/[id]/edit`                        |
| Student | `p.romanczuk+teststudent@gmail.com` | Role assignment currently **fails** — "Invalid request body" (open bug, see below) |

Passwords are **not** in this file (repo is public) — see `CLAUDE.local.md`
(gitignored).

**Rules for agents and humans:**

- These are aliases of the owner's own inbox (`p.romanczuk+alias@gmail.com`),
  same pattern as other one-off test students (e.g. `+michalwojcik`). Do not
  treat them as real student/teacher data, and do not delete them without
  checking with the owner first — they're reused across sessions.
- Never create additional ad-hoc test accounts on `StudentProduction` without
  a clear reason; prefer reusing these two. If more are genuinely needed,
  document them here.
- `StudentProduction` is real user-facing data — mutations through these
  accounts (lessons, songs, practice logs) are real writes. Clean up
  test-only content you create through them when a QA pass is done, unless
  it's being deliberately left as a fixture.

**Known issue:** saving the `Student` role checkbox on `p.romanczuk+teststudent@gmail.com`'s
profile via `/dashboard/users/[id]/edit` returns `Invalid request body` — a
validation/schema mismatch between the expanded student-onboarding form and
the update endpoint. Not yet fixed as of this writing.

## Development (`StudentDevelopment`)

See `CLAUDE.md` → "Dev Credentials (Local Only)" for the Admin/Teacher/Student
role accounts on the local dev stack (credentials in `CLAUDE.local.md`).
