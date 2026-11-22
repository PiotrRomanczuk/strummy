---
name: e2e-cross-browser
description: Run Playwright E2E tests across all configured browser and device projects with pass/fail matrix reporting. Use when verifying cross-browser compatibility, testing mobile responsiveness, or running full device coverage before a release.
---

# E2E Cross-Browser Testing

## Overview

Run Strummy's Playwright E2E tests across all 7 configured device projects (3 desktop browsers, 2 phones, 2 tablets) with structured reporting. Supports four run modes for different scenarios: quick validation, full coverage, mobile-focused, and desktop-focused. Produces a per-device pass/fail matrix and identifies device-specific failures.

## When to Use

- Before a release to verify cross-browser compatibility
- After CSS/layout changes to catch responsive breakpoint issues
- When investigating a device-specific bug report
- During mobile-first development to verify phone/tablet rendering
- After upgrading Playwright or browser engines
- When CI only runs Desktop Chrome and you need broader coverage locally

## Device Projects

Defined in `playwright.config.ts`:

| #   | Project Name      | Type    | Viewport  | Engine          |
| --- | ----------------- | ------- | --------- | --------------- |
| 1   | Desktop Chrome    | Desktop | 1920x1080 | Chromium        |
| 2   | Desktop Firefox   | Desktop | 1920x1080 | Firefox         |
| 3   | Desktop Safari    | Desktop | 1920x1080 | WebKit          |
| 4   | iPhone 12         | Phone   | 390x844   | WebKit (mobile) |
| 5   | iPhone 15 Pro Max | Phone   | 430x932   | WebKit (mobile) |
| 6   | iPad Pro          | Tablet  | 1024x1366 | WebKit (mobile) |
| 7   | iPad (gen 7)      | Tablet  | 810x1080  | WebKit (mobile) |

## Usage

Invoke by asking Claude to run cross-browser tests:

```
Run cross-browser E2E tests (quick mode)
Run full device coverage E2E tests
Run mobile-only E2E tests
Run E2E tests on iPad Pro only
```

## Implementation

### Phase 1: Environment Check

Verify Playwright browsers are installed and the dev server is reachable.

```bash
# Check installed browsers
npx playwright install --dry-run 2>&1

# If browsers are missing, install them
npx playwright install

# Check dev server (Playwright config auto-starts it, but verify)
curl -s --head http://localhost:3000 > /dev/null 2>&1 \
  && echo "Dev server running" \
  || echo "Dev server will be started by Playwright"
```

Verify test files exist:

```bash
ls tests/e2e/**/*.spec.ts tests/*.spec.ts 2>/dev/null
```

**Current E2E test specs (from `tests/`):**

| Spec File                                        | Category              |
| ------------------------------------------------ | --------------------- |
| `tests/e2e/smoke/critical-path.spec.ts`          | Smoke tests           |
| `tests/e2e/onboarding/complete-flow.spec.ts`     | Onboarding            |
| `tests/e2e/integration/workflows.spec.ts`        | Integration workflows |
| `tests/e2e/mobile/mobile-responsiveness.spec.ts` | Mobile responsive     |
| `tests/e2e/ai/ai-playground.spec.ts`             | AI features           |
| `tests/e2e/ai/assignment-ai.spec.ts`             | AI assignments        |
| `tests/e2e/ai/lesson-notes-ai.spec.ts`           | AI lesson notes       |

---

### Phase 2: Select Run Mode

Four predefined modes plus custom project selection:

**Quick mode** -- fast validation, two key devices:

```bash
npx playwright test --project="Desktop Chrome" --project="iPhone 12"
```

| Projects                  | Use Case                             |
| ------------------------- | ------------------------------------ |
| Desktop Chrome, iPhone 12 | Pre-commit check, fast feedback loop |

**Full mode** -- all 7 devices:

```bash
npx playwright test
```

| Projects       | Use Case                                |
| -------------- | --------------------------------------- |
| All 7 projects | Pre-release verification, full coverage |

**Mobile mode** -- phones and tablets only:

```bash
npx playwright test \
  --project="iPhone 12" \
  --project="iPhone 15 Pro Max" \
  --project="iPad Pro" \
  --project="iPad (gen 7)"
```

| Projects                                             | Use Case                                    |
| ---------------------------------------------------- | ------------------------------------------- |
| iPhone 12, iPhone 15 Pro Max, iPad Pro, iPad (gen 7) | Mobile-first validation, responsive testing |

**Desktop mode** -- all desktop browsers:

```bash
npx playwright test \
  --project="Desktop Chrome" \
  --project="Desktop Firefox" \
  --project="Desktop Safari"
```

| Projects                                        | Use Case                    |
| ----------------------------------------------- | --------------------------- |
| Desktop Chrome, Desktop Firefox, Desktop Safari | Cross-browser compatibility |

**Custom mode** -- user-specified projects:

```bash
npx playwright test --project="iPad Pro" --project="Desktop Firefox"
```

**Existing npm scripts (from `package.json`):**

These can be used as shortcuts instead of raw `npx playwright test` commands:

```bash
npm run test:pw:iphone12        # iPhone 12 only
npm run test:pw:iphone15        # iPhone 15 Pro Max only
npm run test:pw:ipad            # iPad Pro only
npm run test:pw:desktop         # Desktop Chrome only
npm run test:pw:mobile          # iPhone 12 + iPhone 15 Pro Max
npm run test:pw:tablet          # iPad Pro + iPad (gen 7)
npm run test:pw:devices         # iPhone 12 + iPad Pro + Desktop Chrome
npm run test:pw:all             # All projects
```

---

### Phase 3: Execute Tests

Run the selected projects. Configure based on environment:

**Local execution:**

```bash
npx playwright test \
  --project="<selected-projects>" \
  --reporter=json \
  --output=test-results/cross-browser
```

**Key Playwright config values (from `playwright.config.ts`):**

- Timeout: 30s per test
- Expect timeout: 10s
- Retries: 0 locally, 2 in CI
- Parallel: fully parallel
- Screenshots: only on failure
- Video: retain on failure
- Traces: on first retry
- Web server: auto-starts `npm run dev`

**For long-running full suite, provide progress updates:**

```
Running: Desktop Chrome (project 1/7)...
  12/12 tests passed (34s)

Running: Desktop Firefox (project 2/7)...
  11/12 tests passed, 1 failed (41s)
  FAIL: teacher/songs-crud.spec.ts > should create a song

Running: Desktop Safari (project 3/7)...
```

---

### Phase 4: Build Results Matrix

Parse the JSON reporter output and build a pass/fail matrix.

**Matrix format:**

```
CROSS-BROWSER TEST RESULTS
============================
Date: 2026-02-28
Mode: Full (7 devices)
Specs: 11 test files

                        Chrome  Firefox  Safari  iPhone12  iPhone15  iPadPro  iPad7
                        ------  -------  ------  --------  --------  -------  -----
critical-path            PASS    PASS     PASS    PASS      PASS      PASS    PASS
songs-crud               PASS    PASS     PASS    PASS      PASS      PASS    PASS
complete-flow            PASS    PASS     PASS    PASS      PASS      PASS    PASS
workflows                PASS    FAIL     PASS    PASS      PASS      PASS    PASS
mobile-responsiveness    PASS    PASS     PASS    PASS      PASS      PASS    PASS
ai-playground            PASS    PASS     PASS    FAIL      FAIL      PASS    PASS
assignment-ai            PASS    PASS     PASS    PASS      PASS      PASS    PASS
lesson-notes-ai          PASS    PASS     PASS    PASS      PASS      PASS    PASS
student-learning         PASS    PASS     PASS    PASS      PASS      PASS    PASS
student-full             PASS    PASS     PASS    PASS      PASS      PASS    PASS
teacher-full             PASS    FAIL     PASS    PASS      PASS      PASS    PASS
                        ------  -------  ------  --------  --------  -------  -----
Total                   11/11   9/11    11/11   10/11     10/11     11/11   11/11
Pass Rate               100%    82%     100%     91%       91%      100%    100%
```

**Summary statistics:**

```
SUMMARY
=======
Total test runs:    77 (11 specs x 7 devices)
Passed:             73 (94.8%)
Failed:              4 (5.2%)
Duration:          4m 12s

Device pass rates:
  Desktop Chrome:      100%  (best)
  Desktop Safari:      100%
  iPad Pro:            100%
  iPad (gen 7):        100%
  iPhone 12:            91%
  iPhone 15 Pro Max:    91%
  Desktop Firefox:      82%  (worst)
```

---

### Phase 5: Analyze Failures

For each failing test, provide diagnosis and categorization.

**Failure categories:**

| Category            | Indicators                             | Common Fix                                                |
| ------------------- | -------------------------------------- | --------------------------------------------------------- |
| Viewport/responsive | Fails only on small viewports          | Fix CSS breakpoints, check `md:` / `lg:` Tailwind classes |
| Browser engine      | Fails only on Firefox or WebKit        | Check browser-specific CSS, API compatibility             |
| Touch interaction   | Fails only on mobile devices           | Replace hover-dependent UX with tap-friendly alternatives |
| Timing/flaky        | Fails intermittently across devices    | Add `waitFor`, increase timeouts, use `toBeVisible()`     |
| Auth/session        | Fails on first run, passes on retry    | Check cookie handling across browsers                     |
| Layout shift        | Element not found at expected position | Fix CLS, use stable selectors (`data-testid`)             |

**Per-failure report:**

```
FAILURE ANALYSIS
================

1. workflows.spec.ts > "should filter by date range" [Desktop Firefox]
   Category: Browser engine
   Error: Locator.click: Element is not visible
   Screenshot: test-results/cross-browser/workflows-firefox-failure.png

   Analysis: Firefox renders the date picker dropdown differently.
   The popover positioning overflows the viewport.

   Suggested fix: Add `sideOffset` prop to Radix Popover in
   components/lessons/LessonFilter.tsx

2. ai-playground.spec.ts > "should show AI response" [iPhone 12, iPhone 15]
   Category: Viewport/responsive
   Error: Timeout waiting for element [data-testid="ai-response"]
   Screenshot: test-results/cross-browser/ai-playground-iphone12-failure.png

   Analysis: AI response panel is hidden behind the input
   on small viewports. The response area needs scroll-into-view.

   Suggested fix: Add `scrollIntoViewIfNeeded()` or restructure
   the mobile layout in components/ai/AiPlayground.tsx
```

---

### Phase 6: Screenshots and Artifacts

Collect failure artifacts for debugging.

**Artifacts location (from `playwright.config.ts`):**

```
test-results/
  cross-browser/
    <test-name>-<project>/
      test-failed-1.png        # Screenshot on failure
      video.webm               # Video on failure (retain-on-failure)
      trace.zip                # Trace on first retry
```

**View artifacts:**

```bash
# Open HTML report with all results
npx playwright show-report

# View specific trace
npx playwright show-trace test-results/cross-browser/<test>/trace.zip
```

**Comparison screenshots (for responsive issues):**

When a test passes on desktop but fails on mobile, capture comparison screenshots:

```bash
# Desktop version (passing)
npx playwright test <spec> --project="Desktop Chrome" --update-snapshots

# Mobile version (failing)
npx playwright test <spec> --project="iPhone 12" --update-snapshots
```

---

## Mobile-First Validation Checklist

Since Strummy is a mobile-first app (70%+ tests should cover mobile), flag these common issues:

| Check                      | How to Verify                                  |
| -------------------------- | ---------------------------------------------- |
| Touch targets >= 44px      | Audit clickable elements on iPhone viewport    |
| No horizontal scroll       | Check `overflow-x` on mobile viewports         |
| Readable text without zoom | Font size >= 16px on mobile                    |
| Navigation accessible      | Hamburger menu or bottom nav works             |
| Forms usable on phone      | Input fields not hidden by keyboard            |
| Tables responsive          | Use horizontal scroll or card layout on mobile |
| Modals fit viewport        | Dialog/sheet doesn't overflow on small screens |
| Images sized correctly     | No images wider than viewport                  |

## Key Project Files

| File                       | Role                                          |
| -------------------------- | --------------------------------------------- |
| `playwright.config.ts`     | Device definitions, timeouts, reporter config |
| `tests/e2e/**/*.spec.ts`   | E2E test specifications                       |
| `tests/global-teardown.ts` | Cleanup after test run                        |
| `test-results/`            | Output directory for results and artifacts    |
| `package.json`             | Playwright scripts (`test:pw:*`)              |

## Error Handling

| Situation                    | Action                                                |
| ---------------------------- | ----------------------------------------------------- |
| Browsers not installed       | Run `npx playwright install` and retry                |
| Dev server fails to start    | Check port 3000, run `npm run dev` manually           |
| All tests fail on one device | Likely browser install issue, reinstall that browser  |
| Timeout on all tests         | Check if app has blocking API calls, increase timeout |
| Auth tests fail everywhere   | Verify test credentials in `playwright.config.ts`     |
| Out of disk space (videos)   | Clear `test-results/`, reduce video retention         |
| Flaky test (passes on retry) | Mark as flaky, investigate timing issues              |

## Examples

### Quick pre-commit check

```
Run cross-browser tests in quick mode
```

Runs Desktop Chrome + iPhone 12 only. Fast feedback in under 2 minutes.

### Full release verification

```
Run full cross-browser E2E coverage
```

Runs all 7 devices. Takes 5-10 minutes. Use before tagging a release.

### Investigate a mobile bug

```
Run E2E tests on iPhone 12 only, specifically the teacher songs-crud spec
```

```bash
npx playwright test tests/e2e/teacher/songs-crud.spec.ts --project="iPhone 12"
```

### Compare desktop vs mobile

```
Run the smoke tests on Desktop Chrome and iPhone 12, compare results
```

```bash
npx playwright test tests/e2e/smoke/ --project="Desktop Chrome" --project="iPhone 12"
```
