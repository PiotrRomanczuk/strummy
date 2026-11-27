---
name: api-health-check
description: Test API endpoints with proper auth and report status, response times, and schema compliance. Use when verifying API health, testing role-based access, debugging endpoint failures, or auditing API security.
---

# API Health Check

## Overview

Discover, test, and validate all API endpoints with proper authentication for each role. Tests response codes, measures latency, validates against Zod schemas, and verifies RLS enforcement across Admin/Teacher/Student roles.

## Usage

When invoked, ask:

1. **Scope** -- "all" (every endpoint), category name (lessons, songs, admin, etc.), or specific path
2. **Action** -- "health" (quick status check), "auth-matrix" (test all roles), "schema" (validate responses), "full" (all checks)
3. **Environment** -- "local" (default: localhost:3000), "preview", or "production"

## Execution Steps

### Step 1: Discover Endpoints

```bash
# Find all route.ts files
find app/api -name "route.ts" -type f | sort

# Parse exported HTTP methods from each file
for f in $(find app/api -name "route.ts"); do
  METHODS=$(grep -oE "export (async )?function (GET|POST|PUT|DELETE|PATCH)" "$f" | grep -oE "GET|POST|PUT|DELETE|PATCH")
  PATH=$(echo "$f" | sed 's|app/api||;s|/route.ts||')
  echo "$PATH: $METHODS"
done
```

### Step 2: Get Auth Tokens

```bash
# Get auth tokens for each role
# Admin
ADMIN_TOKEN=$(curl -s http://localhost:54321/auth/v1/token?grant_type=password \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"p.romanczuk@gmail.com","password":"test123_admin"}' \
  | jq -r '.access_token')

# Teacher
TEACHER_TOKEN=$(curl -s http://localhost:54321/auth/v1/token?grant_type=password \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@example.com","password":"test123_teacher"}' \
  | jq -r '.access_token')

# Student
STUDENT_TOKEN=$(curl -s http://localhost:54321/auth/v1/token?grant_type=password \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"student@example.com","password":"test123_student"}' \
  | jq -r '.access_token')
```

### Step 3: Test Endpoints

For each endpoint + method combination:

```bash
# Test with timing
START=$(date +%s%N)
RESPONSE=$(curl -s -o /tmp/response.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "http://localhost:3000/api/${PATH}")
END=$(date +%s%N)
DURATION=$(( (END - START) / 1000000 ))  # ms

echo "$PATH $METHOD: $RESPONSE (${DURATION}ms)"
```

### Step 4: Auth Matrix

Test each endpoint with all 4 auth states:

| Endpoint                 | Admin | Teacher | Student | Anonymous |
| ------------------------ | ----- | ------- | ------- | --------- |
| GET /api/lessons         | 200   | 200     | 200     | 401       |
| POST /api/admin/users    | 200   | 403     | 403     | 401       |
| GET /api/student/lessons | 200   | 200     | 200     | 401       |

Flag unexpected access patterns:

- Student accessing admin endpoints (should be 403)
- Anonymous accessing protected endpoints (should be 401)
- 500 errors (server issues)

### Step 5: Schema Validation

For endpoints with Zod schemas in `/schemas/`:

```bash
# Find matching schema
SCHEMA_FILE=$(find schemas -name "*.ts" | xargs grep -l "endpoint_name")

# Validate response structure matches schema
# Parse response JSON and check required fields
```

## API Categories

| Category      | Base Path                        | Endpoints                                | Auth Required    |
| ------------- | -------------------------------- | ---------------------------------------- | ---------------- |
| Admin         | `/api/admin/`                    | users, lessons, drive-sync, drive-videos | Admin only       |
| Lessons       | `/api/lessons/`                  | CRUD, bulk, search, export, stats        | All roles        |
| Songs         | `/api/song/`                     | CRUD, favorites, videos, stats, export   | All roles        |
| Assignments   | `/api/assignments/`              | CRUD                                     | Teacher, Student |
| Spotify       | `/api/spotify/`                  | sync, search, matches, features          | Admin, Teacher   |
| Drive         | `/api/drive/`                    | files, upload, stream                    | Admin, Teacher   |
| Notifications | `/api/notifications/`            | dashboard, unsubscribe                   | All roles        |
| Stats         | `/api/stats/`, `/api/dashboard/` | weekly, dashboard, performance           | All roles        |
| Cohorts       | `/api/cohorts/`                  | analytics                                | Admin, Teacher   |
| Exports       | `/api/exports/`                  | student data                             | Admin, Teacher   |
| Cron          | `/api/cron/`                     | 12 scheduled jobs                        | CRON_SECRET      |
| Auth          | `/api/auth/`, `/api/oauth2/`     | Google OAuth                             | Public           |
| External      | `/api/external/`                 | database status, songs                   | API key          |

## Output Format

```markdown
# API Health Check Report

**Environment**: localhost:3000 | **Date**: {timestamp}
**Endpoints tested**: {count} | **Methods tested**: {count}

## Summary

| Status              | Count | Percentage |
| ------------------- | ----- | ---------- |
| Healthy (2xx)       | 85    | 77%        |
| Auth Required (401) | 15    | 14%        |
| Forbidden (403)     | 8     | 7%         |
| Errors (5xx)        | 2     | 2%         |

## Performance

| Metric                | Value                                    |
| --------------------- | ---------------------------------------- |
| Average response time | 145ms                                    |
| Slowest endpoint      | GET /api/lessons/stats/advanced (890ms)  |
| Fastest endpoint      | GET /api/external/database/status (12ms) |
| Endpoints > 500ms     | 3                                        |

## Auth Matrix Issues

- GET /api/admin/users: Student gets 200 (expected 403)
- POST /api/lessons: Anonymous gets 200 (expected 401)

## Failing Endpoints

| Endpoint             | Method | Status | Error                   |
| -------------------- | ------ | ------ | ----------------------- |
| /api/cron/dispatcher | GET    | 500    | Missing CRON_SECRET     |
| /api/spotify/sync    | POST   | 503    | Spotify API unavailable |

## Schema Compliance

| Endpoint         | Schema       | Valid | Issues                |
| ---------------- | ------------ | ----- | --------------------- |
| GET /api/lessons | LessonSchema | Yes   | --                    |
| GET /api/song    | SongSchema   | No    | Missing 'level' field |
```

## Curl Command Generation

For any failing endpoint, output the curl command for manual testing:

```bash
curl -v \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "http://localhost:3000/api/lessons?limit=10"
```

## Performance Thresholds

| Rating   | Response Time |
| -------- | ------------- |
| Fast     | < 100ms       |
| Normal   | 100-500ms     |
| Slow     | 500ms-2s      |
| Critical | > 2s          |

## Error Handling

- **Dev server not running**: prompt to start with `npm run dev`
- **Auth token expired**: re-authenticate
- **Endpoint timeout**: report with 408 status, suggest checking server logs
- **Schema not found**: skip validation, note in report

## Examples

**Input**: "Run a health check on all API endpoints"

**Input**: "Test the auth matrix for lesson endpoints"

**Input**: "Check if any endpoints are accessible without auth"

**Input**: "Validate API responses against Zod schemas"

## Key Files

- API routes: `app/api/**/route.ts`
- Zod schemas: `schemas/`
- Auth config: `lib/supabase/`, `lib/auth/`
- Dev credentials: documented in CLAUDE.md
