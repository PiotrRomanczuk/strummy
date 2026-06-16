---
created: 2026-06-16
updated: 2026-06-16
---

# Strummy — External Integrations

Technical reference for how Strummy connects to external services (Google Calendar, Spotify). For remaining build work on Google Calendar (mount UI, conflict UI, polling cron, recurring events, disconnect, webhook hardening) see [`MASTER_SPEC.md` §2.7](./MASTER_SPEC.md). For system-level structure see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Google Calendar

Bidirectional sync between Strummy lessons and a teacher's Google Calendar: lesson CRUD pushes to Google, Google events import as lessons, and webhooks pull real-time changes back. Strummy is the source of truth; conflicts resolve last-write-wins with manual fallback.

### Connection & OAuth

| Aspect                | Detail                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Flow                  | OAuth2 with offline access (refresh tokens)                                                                        |
| Scope                 | `calendar` (full access — read, create, update, delete events; manage webhooks). Upgraded from `calendar.readonly` |
| Token storage         | `user_integrations` table, server-side, RLS-isolated per user                                                      |
| Token refresh         | Automatic via offline refresh token in `getGoogleClient()`                                                         |
| Reconnect requirement | Users on the old `calendar.readonly` scope must reconnect to grant write/webhook permissions                       |
| Connection scope      | Per-user, not per-device — tokens work everywhere once connected                                                   |

**Core library** (`lib/google.ts`):

| Function                                       | Purpose                                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| `getGoogleOAuth2Client()`                      | Initialize OAuth2 client                                                                |
| `getGoogleAuthUrl()`                           | Generate OAuth consent URL                                                              |
| `getGoogleClient(userId)`                      | Authenticated client for a user (handles refresh)                                       |
| `getCalendarEventsInRange(userId, start, end)` | Fetch events by date range (calendar `primary`, `singleEvents: true`, ordered by start) |
| `createGoogleCalendarEvent()`                  | Create event                                                                            |
| `updateGoogleCalendarEvent()`                  | Update event                                                                            |
| `deleteGoogleCalendarEvent()`                  | Delete event                                                                            |
| `watchCalendar()`                              | Open webhook subscription                                                               |
| `stopCalendarWatch()`                          | Close webhook subscription                                                              |

### Outbound sync (Strummy → Google)

Lesson lifecycle hooks live in `lib/services/calendar-lesson-sync.ts` and are invoked from the lesson API handlers (`app/api/lessons/route.ts` + `handlers.ts`).

| Trigger       | Handler                 | Sync function          | Effect                                                   |
| ------------- | ----------------------- | ---------------------- | -------------------------------------------------------- |
| Create lesson | `createLessonHandler()` | `syncLessonCreation()` | Creates Google event, stores `google_event_id` on lesson |
| Update lesson | `updateLessonHandler()` | `syncLessonUpdate()`   | Updates linked event (if `google_event_id` exists)       |
| Delete lesson | `deleteLessonHandler()` | `syncLessonDeletion()` | Deletes linked event, then removes lesson                |

- `hasGoogleIntegration()` gates every sync — no-op if the teacher hasn't connected Google.
- Sync is **non-blocking**: failures log errors but never fail the lesson operation. Lessons remain manageable if Google is down.
- Student email is required to add the student as an event attendee; a missing email logs a warning and skips attendee assignment.

### Historical bulk import (Google → Strummy)

Lets teachers backfill existing calendar events as lessons, matching students by email or creating shadow profiles for unknown attendees.

**Flow** (`syncGoogleEventsForUser()`): for each fetched event →

1. Dedupe by `google_event_id` (unique column on `lessons`)
2. `detectConflict()` / `resolveConflict()` if a linked lesson already exists
3. Match student by attendee email
4. Create shadow student if no match
5. Insert lesson with `google_event_id`, `status: SCHEDULED`

**Student matching** (`lib/services/import-utils.ts`):

| Status      | Meaning                                     | Import behavior                                                         |
| ----------- | ------------------------------------------- | ----------------------------------------------------------------------- |
| `MATCHED`   | Exactly one student profile with that email | Link to that student                                                    |
| `AMBIGUOUS` | Multiple matching profiles                  | Require manual selection                                                |
| `NONE`      | No match                                    | Create shadow student (needs attendee name) or require manual selection |

**Shadow profiles** — the durable design that lets imported lessons "just appear" when a student later signs up:

- Created via `createShadowStudent()` as a `profiles` row with `user_id: null`, `isStudent: true`, `email` set.
- A DB trigger `link_shadow_profile()` on `auth.users` insert sets `profiles.user_id = NEW.id WHERE email = NEW.email AND user_id IS NULL`.
- `SECURITY DEFINER`, fires on any signup method (email, OAuth) — so all previously-imported lessons immediately surface in the new student's account.
- RLS allows teachers/admins to read all profiles and create student profiles.

**Import surface**: `components/lessons/GoogleEventImporter.tsx` (date-range picker, fetch, per-row match status + student selector, select + import) on `app/dashboard/lessons/import/page.tsx`. Server actions: `app/actions/import-lessons.ts`, `app/actions/student-management.ts`.

### Real-time sync (webhooks)

| Aspect                | Detail                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| Endpoint              | `POST /api/webhooks/google-calendar`                                                                     |
| Validation            | Google headers (`channel_id`, `resource_id`); subscription looked up in `webhook_subscriptions`          |
| Action                | `fetchAndSyncRecentEvents()` → `getCalendarEventsInRange(30 days forward)` → `syncGoogleEventsForUser()` |
| Subscription lifetime | 7-day max (Google limit)                                                                                 |
| URL requirement       | HTTPS (use ngrok in dev); set via `NEXT_PUBLIC_APP_URL`                                                  |

**Auto-renewal** (`lib/services/webhook-renewal.ts`), run by the daily cron:

- `findExpiringWebhooks()` — subscriptions expiring < 24h
- `renewExpiringWebhooks()` — renew (1s delay between requests, exponential backoff via `AI_PROVIDER_RETRY_CONFIG`, sequential to avoid rate limits)
- `cleanupExpiredWebhooks()` — purge expired records

### Conflict model

Detection and resolution in `lib/services/sync-conflict-resolver.ts`.

- **Strategy**: last-write-wins. Simultaneous edits (< `simultaneousThresholdMs`, default 60000ms / 1 min apart) flag for manual review instead.
- **Functions**: `detectConflict()`, `resolveConflict()`, `applyConflictResolution()`, `getPendingConflicts()`, `resolveConflictManually()`, `autoResolveOldConflicts()`.
- **Manual review**: conflict stored in `sync_conflicts`; teacher resolves at `app/dashboard/calendar/conflicts/page.tsx` via `ConflictResolutionPanel.tsx` (side-by-side diff, keep-local / use-remote buttons).
- **Auto-resolution**: conflicts > 7 days old auto-resolve to the local (Strummy) version on the next cron run.

### Cron maintenance

`app/api/cron/renew-webhooks/route.ts`, protected by `CRON_SECRET`, scheduled daily 02:00 UTC in `vercel.json` (`"schedule": "0 2 * * *"`). Per run: renew expiring webhooks, clean up expired ones, auto-resolve conflicts > 7 days.

### Disconnect

`stopCalendarWatch()` closes webhook subscriptions; integration record lives in `user_integrations`. (Full disconnect UX flow tracked in MASTER_SPEC §2.7.)

### Database

| Table                   | Role                                                                                                                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lessons`               | `google_event_id TEXT UNIQUE` (indexed) links lesson ↔ event                                                                                                                                   |
| `profiles`              | `user_id: null` for shadow students; auto-linked on signup                                                                                                                                     |
| `user_integrations`     | OAuth tokens per `(user_id, provider)`; has `expires_at`                                                                                                                                       |
| `webhook_subscriptions` | Active webhooks (`provider = 'google_calendar'`, `expiration`)                                                                                                                                 |
| `sync_conflicts`        | Pending conflicts: `lesson_id`, `google_event_id`, `conflict_data` (JSONB), `status` (pending/resolved/ignored), `resolution` (use_local/use_remote). Migration `024_table_sync_conflicts.sql` |

### Configuration

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/oauth2/callback   # HTTPS in prod
NEXT_PUBLIC_APP_URL=http://localhost:3000                       # HTTPS for webhooks
CRON_SECRET=...                                                 # random hex
```

Google Cloud Console: OAuth2 credentials, authorized redirect URI `https://<domain>/api/oauth2/callback`, JS origin `https://<domain>`.

### Security

- RLS isolates tokens and conflicts per user; only teachers/admins mutate lessons; teachers see only their own conflicts.
- Cron endpoint gated by `CRON_SECRET`; webhook endpoint validates Google headers.
- Student emails used only as event attendees; no sensitive data in event descriptions. Sanitize event summary/description before storing.

### Performance

| Operation                   | Cost                  |
| --------------------------- | --------------------- |
| Lesson create/update/delete | +50–200ms (sync)      |
| Webhook renewal             | ~2–5s per webhook     |
| Conflict detection          | <10ms (pure function) |

---

## Spotify

Used to enrich songs with Spotify metadata via search + match approval. The integration centers on `lib/spotify.ts` (resilient API client) with admin/teacher-gated match approval endpoints.

### API usage & resilience

`lib/spotify.ts` wraps all Spotify Web API calls with production-grade error handling:

| Concern            | Behavior                                                                |
| ------------------ | ----------------------------------------------------------------------- |
| Timeouts           | 30s default per request, AbortController-based                          |
| Retries            | Exponential backoff 1s → 32s, up to 3 attempts (5xx errors)             |
| Rate limits (429)  | Parse `Retry-After` header (default 60s if absent), auto-retry up to 3× |
| Token expiry (401) | Invalidate token cache, fetch fresh token, single retry                 |
| Circuit breaker    | Opens after 5 consecutive failures, auto-resets after 60s               |
| Errors             | Custom `SpotifyApiError` with status codes + extracted Spotify message  |

**Helpers**: `isRateLimitError(error)`, `getRetryAfter(error)`, `resetCircuitBreaker()`, `clearTokenCache()`.

### Caching

- In-memory token cache reduces auth round-trips; invalidated automatically on 401.
- Track-data caching (e.g. Redis) is a future optimization, not yet implemented.

### Song matching

Search-and-link flow with confidence-based routing for batch sync:

| Confidence | Action                                     |
| ---------- | ------------------------------------------ |
| ≥ 85%      | Auto-apply match                           |
| 20–84%     | Pending review (queued for admin approval) |
| < 20%      | Skip                                       |

**Match approval/rejection** (`app/api/spotify/matches/approve/route.ts`, `.../reject/route.ts`): authenticated (401), role-gated to admin/teacher (403), validated input (400), 404 on missing match. Approval updates song data and records the reviewer.

### Configuration & deployment notes

- Configure Spotify client credentials; redirect URIs must be HTTPS (except loopback).
- Apply for **Extended Quota Mode** if serving multiple users.
- Monitor usage via the Spotify Developer Dashboard; wire rate-limit alerting + error tracking (Sentry).

---

## Future integrations

Forward-looking ideas mentioned across sources (not committed work):

- **Google Calendar**: recurring/RRULE events, multi-calendar selection, field-level conflict merging with audit log/undo, offline sync queue, sync analytics dashboard, student-invitation emails for shadow students. (Tracked in MASTER_SPEC §2.7.)
- **Spotify**: Redis track caching, batch track APIs, `snapshot_id` playlist versioning, request queuing with priority, metrics/monitoring hooks, user-facing rate-limit/retry UI.
