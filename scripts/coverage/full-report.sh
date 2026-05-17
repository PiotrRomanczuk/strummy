#!/usr/bin/env bash
# scripts/coverage/full-report.sh
# Runs test suites and generates a unified coverage + results report.
#
# Usage:
#   bash scripts/coverage/full-report.sh             # unit + integration
#   bash scripts/coverage/full-report.sh --e2e       # + Playwright (Desktop Chrome)
#   bash scripts/coverage/full-report.sh --api       # + Bruno API tests (local env)
#   bash scripts/coverage/full-report.sh --all       # everything
#   bash scripts/coverage/full-report.sh --report-only  # regenerate from existing files
#
# Output: coverage/full-report.md

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

# --- Parse flags ---
RUN_E2E=0; RUN_API=0; REPORT_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --e2e)         RUN_E2E=1 ;;
    --api)         RUN_API=1 ;;
    --all)         RUN_E2E=1; RUN_API=1 ;;
    --report-only) REPORT_ONLY=1 ;;
  esac
done

OUT="coverage"
mkdir -p "$OUT/integration"

UNIT_EXIT=0; INT_EXIT=0; PW_EXIT=0; BRUNO_EXIT=0
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M UTC")
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")

# --- Run suites ---
if [[ "$REPORT_ONLY" -eq 0 ]]; then

  echo ""
  echo "▶ [1/4] Unit tests with coverage..."
  set +e
  npx jest \
    --coverage \
    --json --outputFile="$OUT/unit-results.json" \
    --forceExit
  UNIT_EXIT=$?
  set -e
  [[ $UNIT_EXIT -ne 0 ]] && echo "  ↳ exit $UNIT_EXIT (some unit tests failed)"

  echo ""
  echo "▶ [2/4] Integration tests with coverage..."
  set +e
  npx jest \
    --config jest.config.integration.ts \
    --coverage \
    --coverageDirectory="$OUT/integration" \
    --json --outputFile="$OUT/integration-results.json" \
    --forceExit
  INT_EXIT=$?
  set -e
  [[ $INT_EXIT -ne 0 ]] && echo "  ↳ exit $INT_EXIT (some integration tests failed)"

  if [[ "$RUN_E2E" -eq 1 ]]; then
    echo ""
    echo "▶ [3/4] E2E tests (Playwright — Desktop Chrome)..."
    set +e
    npx playwright test --project="Desktop Chrome"
    PW_EXIT=$?
    set -e
    [[ $PW_EXIT -ne 0 ]] && echo "  ↳ exit $PW_EXIT (some E2E tests failed)"
  fi

  if [[ "$RUN_API" -eq 1 ]]; then
    echo ""
    echo "▶ [4/4] API tests (Bruno — local)..."
    set +e
    bash scripts/ci/run-bruno.sh local
    BRUNO_EXIT=$?
    set -e
    [[ $BRUNO_EXIT -ne 0 ]] && echo "  ↳ exit $BRUNO_EXIT (some Bruno tests failed)"
  fi

fi

# --- Generate markdown report ---
echo ""
echo "▶ Generating report → $OUT/full-report.md"

export UNIT_EXIT INT_EXIT PW_EXIT BRUNO_EXIT RUN_E2E RUN_API BRANCH TIMESTAMP OUT

python3 - <<'PYEOF'
import json, os
from pathlib import Path

root = Path(os.getcwd())
out = root / os.environ.get('OUT', 'coverage')
branch = os.environ.get('BRANCH', 'unknown')
timestamp = os.environ.get('TIMESTAMP', '')
run_e2e = os.environ.get('RUN_E2E', '0') == '1'
run_api = os.environ.get('RUN_API', '0') == '1'
unit_exit = int(os.environ.get('UNIT_EXIT', '0'))
int_exit = int(os.environ.get('INT_EXIT', '0'))
pw_exit = int(os.environ.get('PW_EXIT', '0'))
bruno_exit = int(os.environ.get('BRUNO_EXIT', '0'))

def read_json(p):
    try:
        return json.loads(Path(p).read_text())
    except Exception:
        return None

def ok(code): return '✅' if code == 0 else '❌'
def cov(pct):
    if pct is None: return 'N/A'
    icon = '✅' if pct >= 80 else ('⚠️' if pct >= 60 else '❌')
    return f'{icon} {pct:.1f}%'

# --- Unit test results ---
ur = read_json(out / 'unit-results.json') or {}
unit_total  = ur.get('numTotalTests', '?')
unit_pass   = ur.get('numPassedTests', '?')
unit_fail   = ur.get('numFailedTests', '?')
unit_skip   = ur.get('numPendingTests', '?')
unit_suites = ur.get('numTotalTestSuites', '?')

uc = (read_json(out / 'coverage-summary.json') or {}).get('total', {})
unit_lines = uc.get('lines', {}).get('pct')
unit_stmts = uc.get('statements', {}).get('pct')
unit_funcs = uc.get('functions', {}).get('pct')
unit_brnch = uc.get('branches', {}).get('pct')

# --- Integration test results ---
ir = read_json(out / 'integration-results.json') or {}
int_total  = ir.get('numTotalTests', '?')
int_pass   = ir.get('numPassedTests', '?')
int_fail   = ir.get('numFailedTests', '?')
int_skip   = ir.get('numPendingTests', '?')
int_suites = ir.get('numTotalTestSuites', '?')

ic = (read_json(out / 'integration' / 'coverage-summary.json') or {}).get('total', {})
int_lines = ic.get('lines', {}).get('pct')
int_stmts = ic.get('statements', {}).get('pct')
int_funcs = ic.get('functions', {}).get('pct')
int_brnch = ic.get('branches', {}).get('pct')

# --- Playwright results ---
pw = read_json(root / 'test-results' / 'results.json') or {}
ps = pw.get('stats', {}) if isinstance(pw, dict) else {}
pw_pass  = ps.get('expected', '?')
pw_fail  = ps.get('unexpected', '?')
pw_skip  = ps.get('skipped', '?')
pw_flaky = ps.get('flaky', 0)
pw_total = sum(v for v in [ps.get('expected', 0), ps.get('unexpected', 0), ps.get('skipped', 0)] if isinstance(v, int))
pw_dur   = ps.get('duration', 0)

# --- Bruno results ---
# Bruno JSON is a list of iteration objects: [{iterationIndex, results, summary}, ...]
# Each summary has totalRequests, passedRequests, failedRequests, totalTests, passedTests, failedTests
br_raw = read_json(root / 'bruno-results-local.json')
if isinstance(br_raw, list):
    br_iters = [it for it in br_raw if isinstance(it, dict)]
elif isinstance(br_raw, dict):
    br_iters = [br_raw]
else:
    br_iters = []

def _sum(iters, *keys):
    total = 0
    for it in iters:
        node = it.get('summary', it)
        for k in keys:
            v = node.get(k, 0)
            if isinstance(v, int):
                total += v
                break
    return total

bruno_requests = _sum(br_iters, 'totalRequests')
bruno_req_pass = _sum(br_iters, 'passedRequests')
bruno_req_fail = _sum(br_iters, 'failedRequests')
bruno_tests    = _sum(br_iters, 'totalTests')
bruno_t_pass   = _sum(br_iters, 'passedTests')
bruno_t_fail   = _sum(br_iters, 'failedTests')
bruno_has_data = bool(br_iters)

# --- Overall status ---
all_ok = (unit_exit == 0 and int_exit == 0
          and (pw_exit == 0 or not run_e2e)
          and (bruno_exit == 0 or not run_api))

# --- Build report ---
L = []
def h(t=''): L.append(t); L.append('')
def l(t=''): L.append(t)

l('# Strummy — Full Test Report')
l(f'**Date**: {timestamp}  ')
l(f'**Branch**: `{branch}`  ')
status_icon = '✅' if all_ok else '❌'
status_msg  = 'All suites passed' if all_ok else 'Some failures — see details below'
l(f'**Status**: {status_icon} {status_msg}')
l()
l('---')
h()

# Summary table
h('## Summary')
l('| Suite | Tests | Pass | Fail | Skip | Coverage (lines) |')
l('|-------|------:|-----:|-----:|-----:|:-----------------|')
l(f'| Unit (Jest) | {unit_total} | {unit_pass} | {unit_fail} | {unit_skip} | {cov(unit_lines)} |')
l(f'| Integration (Jest) | {int_total} | {int_pass} | {int_fail} | {int_skip} | {cov(int_lines)} |')
if run_e2e:
    l(f'| E2E — Playwright Desktop Chrome | {pw_total} | {pw_pass} | {pw_fail} | {pw_skip} | N/A |')
else:
    l('| E2E — Playwright | — | — | — | — | not run |')
if run_api and bruno_has_data:
    l(f'| API — Bruno (requests) | {bruno_requests} | {bruno_req_pass} | {bruno_req_fail} | — | N/A |')
    l(f'| API — Bruno (test assertions) | {bruno_tests} | {bruno_t_pass} | {bruno_t_fail} | — | N/A |')
else:
    l('| API — Bruno | — | — | — | — | not run |')
l()
l('> To include E2E and API suites: `bash scripts/coverage/full-report.sh --all`')
l()
l('---')
h()

# Unit detail
h('## Unit Tests')
l(f'**Config**: `jest.config.ts` | **Suites**: {unit_suites} | **Status**: {ok(unit_exit)} (exit {unit_exit})')
l()
if uc:
    l('| Metric | Coverage | Advisory Threshold |')
    l('|--------|:---------|:-------------------|')
    l(f'| Statements | {cov(unit_stmts)} | ≥ 40% |')
    l(f'| Branches   | {cov(unit_brnch)} | ≥ 30% |')
    l(f'| Functions  | {cov(unit_funcs)} | ≥ 35% |')
    l(f'| Lines      | {cov(unit_lines)} | ≥ 40% |')
    l()
    l('📂 HTML report: `open coverage/lcov-report/index.html`')
else:
    l('_Coverage data not found. Run `npm run test:coverage:all` to generate._')
l()
l('---')
h()

# Integration detail
h('## Integration Tests')
l(f'**Config**: `jest.config.integration.ts` | **Suites**: {int_suites} | **Status**: {ok(int_exit)} (exit {int_exit})')
l()
if ic:
    l('| Metric | Coverage |')
    l('|--------|:---------|')
    l(f'| Statements | {cov(int_stmts)} |')
    l(f'| Branches   | {cov(int_brnch)} |')
    l(f'| Functions  | {cov(int_funcs)} |')
    l(f'| Lines      | {cov(int_lines)} |')
    l()
    l('📂 HTML report: `open coverage/integration/lcov-report/index.html`')
else:
    l('_Coverage data not found. Run `npm run test:coverage:all` to generate._')
l()
l('---')
h()

# E2E detail
h('## E2E Tests — Playwright')
if run_e2e:
    l(f'**Project**: Desktop Chrome | **Status**: {ok(pw_exit)} (exit {pw_exit})')
    l()
    if ps:
        l('| Metric | Count |')
        l('|--------|------:|')
        l(f'| Total   | {pw_total} |')
        l(f'| Passed  | {pw_pass} |')
        l(f'| Failed  | {pw_fail} |')
        l(f'| Skipped | {pw_skip} |')
        if pw_flaky:
            l(f'| Flaky   | {pw_flaky} |')
        if isinstance(pw_dur, (int, float)) and pw_dur:
            l(f'| Duration | {pw_dur/1000:.1f}s |')
        l()
        l('📂 Full report: `npx playwright show-report`')
        l('📄 JSON: `test-results/results.json`')
    else:
        l('_No Playwright results found (`test-results/results.json` missing)._')
else:
    l('_Not run. Pass `--e2e` or `--all` to include._')
    l()
    l('```bash')
    l('bash scripts/coverage/full-report.sh --e2e')
    l('```')
l()
l('---')
h()

# Bruno detail
h('## API Tests — Bruno')
if run_api:
    l(f'**Env**: local | **Status**: {ok(bruno_exit)} (exit {bruno_exit})')
    l()
    if bruno_has_data:
        l('| Metric | Count |')
        l('|--------|------:|')
        l(f'| Requests total   | {bruno_requests} |')
        l(f'| Requests passed  | {bruno_req_pass} |')
        l(f'| Requests failed  | {bruno_req_fail} |')
        l(f'| Assertions total | {bruno_tests} |')
        l(f'| Assertions passed | {bruno_t_pass} |')
        l(f'| Assertions failed | {bruno_t_fail} |')
        l()
        l('📄 Raw results: `bruno-results-local.json`')
    else:
        l('_No Bruno results found (`bruno-results-local.json` missing)._')
else:
    l('_Not run. Pass `--api` or `--all` to include._')
    l()
    l('```bash')
    l('bash scripts/coverage/full-report.sh --api')
    l('```')
l()
l('---')
h()

# How to run
h('## Running Tests')
l('```bash')
l('# Unit + Integration (no external services needed)')
l('npm run test:coverage:all')
l()
l('# Include E2E (requires dev server on :3000)')
l('bash scripts/coverage/full-report.sh --e2e')
l()
l('# Include Bruno API tests (requires Supabase + dev server)')
l('bash scripts/coverage/full-report.sh --api')
l()
l('# Everything')
l('bash scripts/coverage/full-report.sh --all')
l()
l('# Regenerate this report from existing result files (no tests re-run)')
l('npm run test:report')
l('```')

report_path = out / 'full-report.md'
report_path.write_text('\n'.join(L) + '\n')
print(f'  ↳ Written: {report_path}')
PYEOF

echo ""
echo "✅ Done."
[[ -f "coverage/lcov-report/index.html" ]]             && echo "   Unit HTML:        open coverage/lcov-report/index.html"
[[ -f "coverage/integration/lcov-report/index.html" ]] && echo "   Integration HTML: open coverage/integration/lcov-report/index.html"
echo "   Full report:      open coverage/full-report.md"
