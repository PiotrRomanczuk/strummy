# Gitleaks history audit

**Date**: 2026-08-05

## What was done

Ran `gitleaks detect --source .` (full 2555-commit history scan, ~169 MB, ~3 min) as part of wiring gitleaks into CI (F2 of the CI/CD rebuild plan). Found 220 findings across three rules: `jwt` (141), `curl-auth-header` (47), `generic-api-key` (32).

## Triage

219 of 220 are false positives:

- The canonical jwt.io example token (`sub: 1234567890, name: "John Doe", iat: 1516239022`) — including one copy baked into a committed `.jest-cache/` transform-cache artifact, which is itself worth noting: build cache should never be committed.
- Supabase's own public `supabase-demo` project tokens, used as documentation/tutorial placeholders (`iss: supabase-demo`) — these are Supabase's own published example credentials, not ours.
- `docs/**/*.md` curl examples using literal `YOUR_API_KEY_HERE` / `ghp_your_token_here` / `gcrm_YOUR_KEY` style placeholders.
- Test-file constants like `process.env.CRON_SECRET = 'test-cron-secret-12345'`.
- `scripts/create-test-user.ts` (still in the tree) embeds a `service_role`-shaped JWT with a fabricated, non-functional signature (`...y5L5y5L5y5L...` — real HMAC-SHA256 output never repeats like this). It looks alarming (service_role bypasses all RLS, `exp: 2034`) but cannot verify against any real project's JWT secret. Left in place this pass — a good candidate for deletion as dead/duplicate code (superseded by `scripts/database/seeding/test/seed-test-user.ts`), but that's a separate cleanup, not a secret leak.

## The one real finding

`bruno-results-local.json` — committed in `84f34059` (2026-05-13), removed in `ee8d893e` ("hygiene sweep", 2026-07-12) which also added `bruno-results-*.json` to `.gitignore`. Contained a real Supabase session JWT: real email (repo owner's), real Google OAuth profile data, `iss: http://127.0.0.1:54321/auth/v1` (bound to a local dev Supabase instance, not prod).

**Assessed as low current risk, not zero historical risk:**

- Token `exp: 2026-05-13T19:49:27Z` — expired ~3 months before this audit. Supabase rejects expired tokens server-side; it cannot authenticate anything today.
- It was live for the ~2 months between commit and removal, exposed in this **public** repo. Exploitability during that window required network reach to the specific local Supabase instance (`127.0.0.1` — i.e., the same machine, or the LAN/tunnel path documented in `infrastructure/`) plus the token still being unexpired.
- The blob remains permanently retrievable from git history (`git log --all`, or any clone) regardless of the file's removal from the tree — this is inherent to git and was not additionally fixed here.

**Decision (2026-08-05, discussed with repo owner)**: leave history as-is rather than rewrite it. The token is already inert (expired), and rewriting history on an actively-shared repo (multiple open branches, a parallel session working in the same checkout at the time of this audit) carries real disruption cost — every open branch and clone would need to be reset. Documented here instead, so a future reader who finds this file in history via `git log` understands the context without re-deriving it.

## Fix

Added `.gitleaks-baseline.json` (committed, `--redact`-generated so no real or placeholder secret substrings are embedded) covering all 220 findings by `Fingerprint` (`commit:file:rule:line`). CI runs `gitleaks detect --baseline-path .gitleaks-baseline.json` — verified locally: 0 findings against the current baseline, so only genuinely new secrets reaching any future commit will surface. Same ratchet pattern as `scripts/ci/.structure-baseline`.

**To regenerate after intentionally accepting a new false positive**: `gitleaks detect --source . --redact --report-path .gitleaks-baseline.json`, review the diff, commit.
