---
name: coverage-boost
description: Identify untested code and generate test stubs for maximum coverage gain. Use when improving test coverage, finding untested critical paths, or generating test scaffolding for files with high churn and low coverage.
---

# Coverage Boost

## Overview

Systematically improve test coverage by identifying high-impact untested files, prioritizing by change frequency, and generating test stubs following project conventions. Targets the files where tests add the most value.

## Usage

When invoked, ask:

1. **Scope** -- "all" (full analysis), "api" (API routes only), "services" (lib/services), "components", or specific path
2. **Action** -- "analyze" (report only), "generate" (create test stubs), "both" (default)
3. **Top N** -- how many files to focus on (default: 10)

## Execution Steps

### Step 1: Gather Coverage Data

```bash
# Run coverage if not recent (check coverage/ directory timestamp)
npm run test:coverage

# Parse coverage summary
cat coverage/coverage-summary.json | jq '.[] | {file: .file, lines: .lines.pct, branches: .branches.pct, functions: .functions.pct}'
```

If `coverage-summary.json` doesn't exist, run `npm run test:coverage` first.

### Step 2: Analyze Git Churn

```bash
# Find most-changed files in last 3 months (non-test files)
git log --format='' --name-only --since='3 months ago' -- '*.ts' '*.tsx' \
  | grep -v '__tests__\|\.test\.\|\.spec\.\|node_modules\|\.next' \
  | sort | uniq -c | sort -rn | head -30
```

### Step 3: Calculate Impact Score

For each file:

```
impact_score = change_frequency × (1 - coverage_percentage / 100)
```

Files with high churn and low coverage get the highest scores.

### Step 4: Categorize Files

| Category   | Path Pattern          | Test Location                                 |
| ---------- | --------------------- | --------------------------------------------- |
| API Routes | `app/api/**/route.ts` | `app/api/**/route.test.ts` (beside the route) |
| Services   | `lib/services/*.ts`   | `lib/services/*.test.ts`                      |
| Hooks      | `hooks/*.ts`          | `hooks/*.test.ts`                             |
| Components | `components/**/*.tsx` | `components/**/*.test.tsx`                    |
| Utils      | `lib/*.ts`            | `lib/*.test.ts`                               |
| AI Agents  | `lib/ai/agents/*.ts`  | `lib/ai/agents/*.test.ts`                     |

### Step 5: Generate Test Stubs

For each high-priority file, generate a test file following project patterns.

## Test Templates

### API Route Test

```typescript
// app/api/{path}/{endpoint}.test.ts — colocated with the route
import { GET, POST } from '@/app/api/{path}/route';
import { NextRequest } from 'next/server';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-id' } }, error: null }),
    },
  })),
}));

describe('{Endpoint Name}', () => {
  describe('GET', () => {
    it('should return 200 with valid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/{path}');
      const response = await GET(request);
      expect(response.status).toBe(200);
    });

    it('should return 401 when unauthenticated', async () => {
      // Override auth mock to return null user
      const request = new NextRequest('http://localhost:3000/api/{path}');
      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });
});
```

### Service Test

```typescript
// lib/services/{service}.test.ts
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock dependencies
jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    })),
  },
}));

describe('{ServiceName}', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('{functionName}', () => {
    it('should handle valid input', async () => {
      // TODO: implement
    });

    it('should handle error case', async () => {
      // TODO: implement
    });
  });
});
```

### Hook Test

```typescript
// hooks/{hookName}.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { {hookName} } from '@/hooks/{hookName}';

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

describe('{hookName}', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => {hookName}());
    expect(result.current).toBeDefined();
  });
});
```

## Output Format

```markdown
# Coverage Boost Report

## Current Coverage

| Metric    | Current | Target | Gap |
| --------- | ------- | ------ | --- |
| Lines     | 40%     | 60%    | 20% |
| Branches  | 30%     | 50%    | 20% |
| Functions | 35%     | 55%    | 20% |

## Top 10 High-Impact Files

| #   | File                                 | Coverage | Churn      | Impact | Category |
| --- | ------------------------------------ | -------- | ---------- | ------ | -------- |
| 1   | lib/services/notification-service.ts | 12%      | 15 changes | 13.2   | Service  |
| 2   | app/api/lessons/route.ts             | 0%       | 12 changes | 12.0   | API      |
| 3   | lib/ai/agents/lesson-notes.ts        | 5%       | 10 changes | 9.5    | AI Agent |
| ... | ...                                  | ...      | ...        | ...    | ...      |

## Test Stubs Generated

- `__tests__/lib/services/notification-service.test.ts` (stub)
- `__tests__/api/lessons/route.test.ts` (stub)
- ...

## Estimated Coverage After Tests

If all stubs are implemented: ~55% lines (+15%)
```

## Coverage Thresholds (from jest.config.ts)

| Metric     | Current Threshold | Recommended Target |
| ---------- | ----------------- | ------------------ |
| Branches   | 30%               | 50%                |
| Functions  | 35%               | 55%                |
| Lines      | 40%               | 60%                |
| Statements | 40%               | 60%                |

## Error Handling

- **No coverage data**: run `npm run test:coverage` first
- **Coverage parse error**: check `coverage/coverage-summary.json` format
- **Git history unavailable**: skip churn analysis, prioritize by coverage alone
- **Test stub generation fails**: output template for manual creation

## Examples

**Input**: "What are the highest-impact files to test?"

**Input**: "Generate test stubs for untested API routes"

**Input**: "Coverage boost for lib/services, top 5"

**Input**: "Analyze coverage gaps in AI agent code"

## Key Files

- Jest config: `jest.config.ts`, `jest.config.integration.ts`
- Test helpers: `lib/testing/integration-helpers.ts`
- Coverage output: `coverage/coverage-summary.json`
- Tests: colocated beside the subject (`X.test.ts`, `X.unit.test.ts`); integration tests in `__tests__/**/*.integration.test.ts`; the remaining `__tests__/` unit dirs are legacy
