# Production E2E audit — 2026-08-29

Full Playwright suite (351 tests, Desktop Chrome) driven against the live
deployment at `https://strummy.online`, via `/prod-e2e-audit`.

**This document is a work queue.** Each item below is self-contained: what is
wrong, the evidence, how to reproduce it, and what "done" means. Work them one
at a time and tick the box. Read [§0](#0-read-this-first) before picking one up
— the raw run reported 122 failures and **119 of them are not bugs**, and an
agent that starts fixing tests without §0 will waste a day.

|                       |                                                                       |
| --------------------- | --------------------------------------------------------------------- |
| Run                   | `test-results/prod-audit/20260829-211608` (local, gitignored, 1.5 GB) |
| Target                | `https://strummy.online`                                              |
| Suite ran from        | `5323f238` (`feature/auto-release-train`)                             |
| **Production served** | **`5256df50`, deployed 2026-08-27 21:43 UTC**                         |
| Result                | 61 passed · 130 failed · 16 flaky · 144 skipped · cleanup 6/6         |

---

## 0. Read this first

`scripts/triage.mjs` reported **122 reproducible failures** and **0 missing
preconditions**. Both numbers are wrong. Re-triaged:

| Bucket                                    | Count | Action              |
| ----------------------------------------- | ----: | ------------------- |
| A — Withheld service-role key (by design) |    67 | none; not covered   |
| B — No admin account on production        |    31 | none; not covered   |
| C — Spec newer than the deployed build    |    21 | none; ships with W1 |
| D — **Worth investigating**               | **3** | W2, W3              |

Two causes triage does not model:

1. **The audit deliberately withholds the service-role key** (see
   `playwright.prod-capture.config.ts`, `LEAKY_VARS`) and production has no
   admin account. `tests/helpers/seed-ids.ts:adminClient()` therefore builds a
   client with an empty key and every spec using it dies on
   `Error: supabaseKey is required.` By the skill's own rules these are _not
   covered_, not bugs.
2. **Production is older than the specs.** See W1 — this is the finding that
   matters most, and it invalidates bucket C wholesale.

Full per-bucket test lists: `reclassified.md` in the run directory.

---

## W1 — Production is 2 days and 114 files behind `main` — [x] unblocked 2026-08-29

**Priority: highest.** This is the audit's headline finding and the root cause
of 21 of the reported failures.

`strummy.online` serves deployment `dpl_6Q2wtcibkC4n9aG42yeW8JuFziok`, commit
`5256df50` ("Release: the production journey, end to end", #736), deployed
**2026-08-27 21:43 UTC**. `main` is at `f0d5dfe5`.

```
git diff --stat origin/production origin/main
→ 114 files changed, 7491 insertions(+), 4618 deletions(-)
```

`5a57de5d` — "Polish demo studio, a working demo login, and an interest form for
teachers" (#743) — merged to `main` at **21:45, two minutes after that deploy**.
Everything it added has never been served to a user.

**Evidence, taken directly from production:**

| Check                         | Expected                  | Actual  |
| ----------------------------- | ------------------------- | ------- |
| `GET /for-teachers`           | 200                       | **404** |
| `GET /demo`                   | 200                       | **404** |
| Landing page `/sign-up` links | 0 (removed by `5a57de5d`) | **5**   |

Every deployment created since 2026-08-27 has `target: null` — they are all
preview builds. Nothing has been promoted to production in two days.

This is the exact failure mode `.claude/rules/workflow.md` names for the
two-stage gate — "The failure mode this introduced was silence" — and that
`release-train.yml` on PR #759 was written to close. Note the rule file already
describes the release as "automatic since 2026-08-29"; on the evidence above it
is not automatic yet, because #759 has not landed.

**Done when:** production serves a build containing `5a57de5d`; `/for-teachers`
and `/demo` return 200; the landing page no longer links `/sign-up`. Landing
PR #759 (the release train) is the durable fix — a one-off manual release only
resets the clock.

**Do not** file issues for the 21 bucket-C failures. They are one incident, and
they disappear when this ships. For the record they are:
`smoke/for-teachers` (7), `demo/demo-mutation-guards` (6),
`smoke/landing-page` (3), `mobile/list-mobile` (2), `dashboard/sidebar` (1),
`dashboard/topbar` (1), `student-full-journey` (1).

---

## W2 — Avatar upload: no file input on the settings page — [x] done 2026-08-29 (not a bug)

Two tests, both failing on every attempt. The spec dates from 2026-07-19 and is
unchanged since, so unlike bucket C it describes UI the deployed build should
already have.

```
e2e/settings/avatar-upload.spec.ts:17 — a non-image file is rejected with a visible error
  expect(locator).toHaveCount(expected) failed
  Locator: locator('input[type="file"]')   Expected: 1

e2e/settings/avatar-upload.spec.ts:36 — an oversized image is rejected with a visible error
  TimeoutError: locator.setInputFiles: Timeout 20000ms exceeded
  waiting for locator('input[type="file"]')
```

**Investigate:** whether the settings page still renders a file input at all on
production, whether it moved behind a control the spec does not click, or
whether the upload was gated/removed. Check the frames first — they show what
the page actually looked like:

```
test-results/prod-audit/20260829-211608/desktop-chrome/frames/e2e-settings-avatar-upload-*/
```

**Done when:** either the product renders the input the spec expects, or the
spec is corrected to match a deliberate redesign. If the answer turns out to be
"this UI only exists post-`5a57de5d`", reclassify as bucket C and close.

---

## W3 — Teacher full journey never completes navigation — [x] done 2026-08-29 (environmental)

```
e2e/teacher-full-journey.spec.ts:26 — Teacher complete journey @journey @teacher
  TimeoutError: page.waitForURL: Timeout 60000ms exceeded
  waiting for navigation until "domcontentloaded"
```

Spec last changed 2026-08-14, before the deployed build, so this is a real
signal. Note the student equivalent (`student-full-journey.spec.ts`) failed too
but _is_ bucket C, so do not assume one cause for both.

**Done when:** the journey completes against production, or the failing step is
identified as a known product gap and given its own issue.

---

## W4 — `GET /api/api-keys/<id>` returns 405, so cleanup cannot verify deletion — [x] done 2026-08-29

The audit's cleanup phase deletes what the run created, then re-reads the record
and asserts 404. For API keys the read-back gets **405 Method Not Allowed** for
both configured roles, so cleanup correctly refuses to delete what it cannot
verify — and three real keys were left in the production database:

```
59d7221c-e15a-4c5c-9273-e4c15b39b442
fbd59f67-297d-4b64-85cf-00fa67a720bc
36a362b1-71c2-4911-b1a5-2d0f35c70a2e
```

**Two pieces of work:**

1. **Delete those three keys from production by hand.** They are live
   credentials created by a test run. Do this first.
2. Decide whether `GET /api/api-keys/<id>` should exist. A resource with DELETE
   but no GET cannot be safely cleaned up by anything, which is why the audit
   leaves rows behind. If the route is intentionally write-only, teach
   `tests/e2e/prod-cleanup.audit.ts` a per-resource verification strategy
   (e.g. confirm absence via the collection endpoint) instead of a blanket
   read-back.

**Done when:** the three keys are gone from production, and a subsequent audit
either verifies api-key deletion or documents why it cannot.

---

## W5 — `triage.mjs` never populates the precondition bucket — [x] done 2026-08-29

`report.json` from this run has `preconditions: []` while 98 failures are
precondition gaps by the skill's own definition. The bucket exists in the schema
and is rendered in `report.md`'s table, but nothing routes into it, so every
uncoverable spec is reported as a bug worth filing.

**Classify as _missing precondition_, not as a failure:**

- error matches `supabaseKey is required` — the withheld service-role key (67)
- the spec calls `loginAs('admin')` and no admin account exists on the target (31)

`scripts/run.sh` already knows which roles signed in; it prints them in the
preflight. That result needs to reach triage — write it into `run.json` and have
`triage.mjs` read it.

**Done when:** a re-run of this audit reports ~3 reproducible failures and ~98
preconditions, without any change to the product.

---

## W6 — Triage is blind to deployment drift — [x] done 2026-08-29

`report.md` stamps `repo @ 5323f238` and never asks what production actually
serves. A deployment two days behind the specs therefore reads as a wall of
product bugs — 21 of them here.

This is the same class of defect as #758 ("stop a dead app server from being
reported as 89 code failures"): one environmental cause, reported as many code
failures.

**Suggested fix:** at run start, resolve the deployed commit and record it in
`run.json`. Vercel exposes it without auth — the homepage carries a
`data-dpl-id`, and the deployment's `githubCommitSha` is one API call away. Then
in triage, mark any failing spec whose file differs between the deployed tree
and the run's tree as _spec newer than deployment_, and refuse to call a run
green or file issues for that bucket.

Worth keeping in step with `scripts/ci/nightly-e2e-report.mjs`, which has the
same blind spot against the dev stack.

**Done when:** an audit against a stale deployment says so in its verdict line
instead of reporting the drift as failures.

---

## W7 — Prod E2E credentials are not reproducible from the repo — [x] done 2026-08-29

`scripts/run.sh` falls back to `.env.prod` for the Supabase URL and anon key.
**That file does not exist**, and `.env.production.local` ships both of the
values it would need as empty strings:

```
NEXT_PUBLIC_APP_URL=""
NEXT_PUBLIC_SUPABASE_URL=""
```

With neither present the preflight cannot check any account, `--scope auto`
resolves to `public`, and the audit reports a **green run that never logged in**.
That is a silent false negative in a tool whose whole job is to tell the truth
about production.

Unblocked for this run by appending the real values to
`~/.strummy-e2e/.env.prod-e2e` (backup alongside it, mode 600). Both are public
by construction: the anon key ships in the browser bundle, and the URL
(`https://db.strummy.online`) is named in production's own CSP `connect-src`.

**Done when:** either those empty values in `.env.production.local` are filled
in, or `run.sh` fails loudly when it cannot resolve a Supabase URL rather than
silently downgrading scope.

---

## W8 — Decide the coverage policy for the 98 uncoverable specs — [x] decided 2026-08-29

Not a bug — a standing decision that keeps re-surfacing as noise. Against
production, 98 of 351 tests can never pass:

- **67** need the service-role key, withheld on purpose so no audit run can
  bypass RLS or bulk-delete against real student data.
- **31** need an admin account, which production does not have and arguably
  should never have.

Options, roughly in order of preference:

1. Tag them (`@requires-service-role`, `@requires-admin`) and have the prod
   config deselect them. Coverage becomes honest: ~253 selected, and a failure
   means something.
2. Create a production admin account — narrows the gap but puts a privileged
   account on the real stack. Weigh against the 2026-08-06 incident.
3. Leave as-is and rely on W5's classification.

**Done when:** the choice is made and written into
`.claude/skills/prod-e2e-audit/SKILL.md`, so the next audit does not re-litigate it.

---

## Reference — not bugs

**16 flaky** (passed on retry; the code is not what failed): `demo/*` ×3,
`mobile/list-mobile` ×3, `teacher/*` ×6, `student-learning-journey` ×2,
`admin/debug-dashboard`, `mobile/mobile-responsiveness`. Several sit in files
that also appear in bucket C, so re-check them after W1 ships.

**5 unreachable** (no app code ran): `ai/assignment-ai:36`,
`demo/demo-screenshots:43`, `mobile/list-mobile:145`,
`student-learning-journey:107`, `teacher/song-cover:22`.

**144 skipped**, largely the admin-gated specs.

---

## Reproducing this audit

```bash
.claude/skills/prod-e2e-audit/scripts/run.sh --projects "Desktop Chrome" --sweep
```

~25–40 min and ~1.5 GB per device project. It writes to the real production
database and cleans up after itself by id. `--scope public` is the read-only
alternative. `.claude/skills/` is gitignored, so the skill lives only on the
machine it was created on.

Two files this run depends on are still untracked at the repo root and should be
committed if the audit is ever wanted from CI:
`playwright.prod-capture.config.ts` and `tests/e2e/prod-cleanup.audit.ts`.

---

## Resolution — 2026-08-29

All eight items worked. PR #761 carries the code; the host and repo changes are
noted per item. Re-triaging **the same run directory** with the new
`triage.mjs`:

|                       |     Before |              After |
| --------------------- | ---------: | -----------------: |
| Reproducible failures |        122 |              **1** |
| Missing preconditions |          0 |                115 |
| Unreachable (network) |          0 |                 11 |
| Verdict               | `failures` | `stale-deployment` |

The single remaining failure is `avatar-upload.spec.ts:36`, which W2's change
now skips. Nothing about production changed to get from 122 to 1.

### The finding the audit missed: 45 network flaps, one cause

The run contains **45 `ERR_NETWORK_CHANGED`** errors across 11 tests. They were
invisible because `errorLine()` reports the first attempt that carried an error,
and classification ran on that one string — so W3, whose attempt 0 was a slow
login and attempt 1 was a network flap, was written up as a navigation bug.

Root cause, on the audit host itself: the user unit
`student-development.service` runs `supabase start` against
`/home/piotr/strummy-development`, which has **no `config.toml`**. It therefore
falls back to the default DB port **54322 — production's** — collides with
`StudentProduction`, and dies. With `Restart=on-failure` / `RestartSec=15` it
had done this **16,935 times**, creating and destroying a Docker network every
~17 seconds. Chrome reports each one as `ERR_NETWORK_CHANGED`.

The unit had never once succeeded, and the stack it duplicates
(`StudentDevelopment`) has been up and healthy throughout. Stopped and disabled;
NetworkManager events went from ~11 per 17s to zero. **Any Playwright run on
this host before 2026-08-29 was measuring against this.**

### Per item

- **W1** — the release train was never the problem. It evaluated `main` as green
  and releasable, then failed on
  `GitHub Actions is not permitted to create or approve pull requests`. The repo
  had `can_approve_pull_request_reviews: false`; now `true`. The train ships on
  its own 2h cron (`23 */2 * * *`). Nothing was deployed by hand.
- **W2** — **not a bug.** Production runs no `supabase_storage_*` container
  (`/storage/v1/bucket` → 500), so `NEXT_PUBLIC_AVATAR_UPLOAD_ENABLED=false` and
  the file input is deliberately never rendered. The frames show the Settings
  page with the AVATAR _URL_ field and no upload button. Spec now skips on the
  control's absence, after asserting the always-rendered URL field so a broken
  page still fails.
- **W3** — **environmental, not a product gap.** Three attempts, three causes:
  a 60s login hang, `ERR_NETWORK_CHANGED`, then "Error loading songs". The song
  the third attempt created _does_ exist in the production DB
  (`0273638f-…`, created 19:44:40, later soft-deleted by cleanup), and the same
  search returns correctly when queried directly now. See the network-flap
  section above.
- **W4** — three keys deleted (all `Demo Test Key`, owner profile
  `2a80ed32-…` **does not exist**, so nothing could reach them through the app);
  one legitimate key in the table untouched. The route stays write-only: the
  collection endpoint already returns every field an item GET would, so
  `prod-cleanup.audit.ts` gained `verifyVia` instead of the API gaining a second
  surface exposing key metadata.
- **W5** — `supabaseKey is required` now matches `PRECONDITION`. Missing-role
  specs are detected from spec _source_, not error text, because an absent
  account produces a bare `waitForURL` timeout. `run.sh` records
  `rolesAvailable` / `rolesMissing` in `run.json`.
- **W6** — `run.sh` probes this checkout's top-level routes against the target
  with no credential and records `missingRoutes`; `report.md` leads with a STALE
  DEPLOYMENT banner and the verdict becomes `stale-deployment`. Drift-blocked
  specs are attributed via the route probe plus
  `git diff origin/production...HEAD`, consulted only once drift is proven.
- **W7** — `run.sh` now also reads `.env.production.local`, counts only
  **non-empty** values as resolved, and **exits 2** rather than downgrading to
  `--scope public`.
- **W8** — decided: **deselect what cannot pass, derive the list.** Written up in
  `.claude/skills/prod-e2e-audit/SKILL.md` § Coverage policy. Tags were rejected
  — 57 files, four `test.describe` shapes, correct only on the day written.
  Deselection is hook-scoped, so the 8 files using `adminClient` in a single test
  keep their remaining coverage. 197 → 155 selected.

### Note on the buckets in §0

Bucket C is 21 by the audit's hand count; the new automated attribution puts 29
specs in "spec newer than the deployment", because `git diff` against
`origin/production` catches spec files the route probe alone cannot name. Both
are gated on drift being independently proven, and both disappear once W1 ships.
