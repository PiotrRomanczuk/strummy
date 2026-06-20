---
created: 2026-06-19
updated: 2026-06-19
---

# Dataflow — From Calendar Event to the Whole Application

End-to-end trace of how data moves through Strummy, **starting at the creation
of a calendar event**, then cascading into lessons, shadow students, songs,
assignments, notifications, progress, and the shadow→claim reconciliation loop.

Every stage lists its concrete code touchpoint (`file → symbol`). Two invariants
hold throughout:

- **RLS is the boundary** (ADR-0001) — every read/write is row-scoped at the DB.
- **Outbound calendar sync is non-blocking** — lesson CRUD never fails because
  Google is down; sync errors are logged, the lesson persists.

---

## 0. Two ways a calendar event is "created"

```
        ┌─────────────────────────────────────────────────────────────┐
        │                  EVENT CREATION (entry points)                │
        └─────────────────────────────────────────────────────────────┘

  A. IN-APP (outbound)                      B. GOOGLE-SIDE (inbound)
  Teacher creates a lesson in Strummy       Teacher creates an event in Google
        │                                          │
        ▼                                          ▼
  lessons row INSERT                         Google push webhook  ── or ──  polling cron
        │                                          │                          │
        ▼                                          ▼                          ▼
  push event to Google Calendar             /api/webhooks/google-calendar   dispatcher cron
                                                   └──────────┬───────────────┘
                                                              ▼
                                              inbound sync → lessons row INSERT
                                                              (+ shadow student)
```

Both paths converge on a **`lessons` row**, which is the hub the rest of the
application hangs off.

---

## A. In-app path (outbound: lesson → Google)

1. **Create/edit/delete a lesson.**
   `app/api/lessons/handlers/{create,update,delete}.ts` and
   `app/actions/lesson-edit.ts` write the `lessons` row (RLS: teacher owns their
   lessons). Bulk: `app/api/lessons/bulk/route.ts`.

2. **Outbound calendar sync (best-effort, non-blocking).**
   `lib/services/calendar-lesson-sync.ts`:
   - `hasGoogleIntegration(teacherId)` — guard; skip silently if not connected.
   - `syncLessonCreation` → `createGoogleCalendarEvent` (stores the returned
     `google_event_id` on the lesson).
   - `syncLessonUpdate` → `updateGoogleCalendarEvent`.
   - `syncLessonDeletion` → `deleteGoogleCalendarEvent`.
   - All wrapped in `try/catch` → on failure, log and continue (lesson stays).

3. **Google client + token refresh.**
   `lib/google.ts → getGoogleClient(userId)` reads OAuth tokens from
   `user_integrations` (RLS-scoped) and transparently refreshes via
   `refreshTokenIfExpired` (persists the new token). Admin/cron contexts use
   `getGoogleClientAdmin` (service role).

---

## B. Google-side path (inbound: Google → lesson + shadow student)

1. **Trigger.** Two freshness mechanisms (a teacher needs at least one):
   - **Webhook** (real-time): `app/api/webhooks/google-calendar/route.ts`
     - `verifyToken` (env-gated `CALENDAR_WEBHOOK_SKIP_TOKEN`),
       `parseResourceState` (ack `sync`; process `exists`/`not_exists`; ignore others).
     - On a valid change → `fetchAndSyncRecentEvents` (`lib/services/google-calendar-sync.ts`).
   - **Polling** (fallback for teachers without a webhook): the **dispatcher
     cron** `app/api/cron/dispatcher/route.ts` → `sync-calendars-and-update-status`
     step → `syncAllTeacherCalendars`. (The dedicated `/api/cron/calendar-sync`
     route exists for manual runs; it is **not** on a Vercel cron — that exceeded
     the plan's cron limit, so the dispatcher carries the schedule.)

2. **Sync loop.** `lib/services/calendar-sync-service.ts → syncAllTeacherCalendars`
   → `syncTeacherCalendar` per connected teacher:
   - List events via the admin Google client.
   - **Filter** to real lessons: `isGuitarLesson(event)` (`lib/calendar/calendar-utils`).
   - **Deduplicate** by **per-instance** `google_event_id` (recurring events expand
     to N distinct instances; the `lessons.google_event_id` UNIQUE key prevents
     collapse).
   - Resolve the attendee email (excluding the teacher).

3. **Shadow student creation.** For a new attendee:
   `app/dashboard/actions.ts → findOrCreateAuthUser(email)` + `upsertStudentProfile`
   create a **shadow** `profiles` row (`is_shadow=true`, `user_id=null`,
   placeholder email). Logged as `shadow_user_created` (`auth_events`).

4. **Lesson INSERT.** A `lessons` row is created with `teacher_id`, `student_id`
   (the shadow), `scheduled_at`, and `google_event_id`.

---

## C. Downstream cascade (once a `lessons` row exists)

```
 lessons row
   │
   ├── lesson_songs ........ songs worked on (teacher assigns)
   │      └── status change ──► song_status_history (trigger, audit)
   │                          ──► student_song_progress / student_repertoire
   │
   ├── assignments ......... follow-up homework (status lifecycle)
   │
   ├── practice_sessions ... student logs practice (immutable; same-day undo)
   │
   └── DB triggers (033_notification_triggers.sql)
          AFTER UPDATE ON lessons      → cancelled / rescheduled / completed
          AFTER UPDATE ON lesson_songs → song mastery
                 │
                 ▼  INSERT INTO notification_queue
```

1. **Songs & progress.** `lesson_songs` links songs to the lesson; status changes
   fire `song_status_history` (trigger-owned audit) and update
   `student_song_progress` / `student_repertoire` (self-rating by the student).

2. **Assignments.** Created from the lesson (or independently); status lifecycle
   Not Started → In Progress → Completed/Overdue/Cancelled. Students may advance
   their own status only.

3. **Practice.** Students log `practice_sessions` (immutable; same-day delete = undo).

---

## D. Notification pipeline (event → delivery)

1. **Enqueue.** DB triggers (`033_notification_triggers.sql`) insert into
   `notification_queue` on lesson cancel/reschedule/complete + song mastery.
   Cron-driven enqueues: `lesson-reminders`, `assignment-due-reminders`,
   `assignment-overdue-check`, `weekly-digest`, `weekly-insights`.

2. **Process.** `process-notification-queue` cron → `notification-queue-processor.ts`
   pulls due rows, retries with backoff.

3. **Deliverable-email chokepoint (ADR-0002).**
   `lib/email/recipient.ts → getDeliverableEmail({is_shadow, email, invite_email})`
   returns the real address or `null`. On `null` (un-invited shadow / placeholder),
   the send is **skipped and logged** (`notification_log`) — never bounced.

4. **Deliver.** Email (`lib/email/*`) and/or in-app (`in_app_notifications`,
   surfaced at `/dashboard/notifications`). Preferences in
   `notification_preferences` gate each type.

---

## E. Shadow → claim → reconciliation loop

This closes the loop back to the calendar.

1. **Invite.** `app/dashboard/actions.ts → sendUserInvite` sets `invite_email` and
   sends `inviteUserByEmail` (logs `shadow_invite_email_set` / `shadow_invite_sent`).

2. **Claim.** Student signs up / signs in with Google →
   `handle_new_user` trigger (or `POST /api/admin/link-shadow-user`) matches
   `invite_email`/`email` → `transfer_shadow_profile_references()` migrates **all**
   FK references (lessons, assignments, repertoire, practice) onto the real account
   and removes the shadow row.

3. **Audit.** `shadow_link_completed` (metadata `transfer_counts`) / `shadow_link_failed`.

4. **Calendar reconcile.** `lib/services/calendar-reconcile.ts →
reconcileCalendarForStudent(studentId)` swaps the attendee on the student's
   **future** events to the real email via `lib/google.ts → reconcileEventAttendee`
   (per-event isolated; failures dead-letter to `system_logs`). Best-effort: the
   link stays atomic.

5. **Disconnect (teardown).** `app/dashboard/calendar-actions.ts → disconnectGoogle`
   revokes the token, stops the webhook channel, and deletes `user_integrations` +
   `webhook_subscriptions`.

---

## F. Full sequence (happy path, inbound + claim)

```
Google event created
  → webhook /api/webhooks/google-calendar  (or dispatcher cron)
  → syncAllTeacherCalendars → syncTeacherCalendar
      → isGuitarLesson filter → dedupe by google_event_id
      → findOrCreateAuthUser + upsertStudentProfile  (shadow student)
      → INSERT lessons
  → teacher adds lesson_songs / assignments / notes  (in-app)
      → triggers INSERT notification_queue
  → process-notification-queue → getDeliverableEmail
      → un-invited shadow ⇒ skip + notification_log   (no bounce)
  → teacher invites the student (invite_email + inviteUserByEmail)
  → student claims (handle_new_user / link-shadow-user)
      → transfer_shadow_profile_references  (lessons/assignments/repertoire move)
      → shadow_link_completed
      → reconcileCalendarForStudent → reconcileEventAttendee  (future events get real email)
  → notifications now deliver to the real address
```

---

## G. Where it can break (failure modes & guards)

| Stage                       | Risk                           | Guard                                                           |
| --------------------------- | ------------------------------ | --------------------------------------------------------------- |
| Outbound sync               | Google down during lesson CRUD | non-blocking try/catch — lesson persists                        |
| Token expiry mid-session    | silent 401                     | `refreshTokenIfExpired` in `getGoogleClient` (+ admin)          |
| Recurring events            | series collapses to 1 lesson   | per-instance `google_event_id` dedupe                           |
| Webhook spoofing            | unauthorized POST              | token validation + resource-state allow-list                    |
| No webhook enabled          | stale lessons                  | dispatcher polling cron                                         |
| Email to shadow placeholder | bounce                         | `getDeliverableEmail` → skip + `notification_log`               |
| Claim mid-flight            | duplicate profile              | `transfer_shadow_profile_references` (match invite_email/email) |
| Reconcile per-event failure | one Google hiccup blocks all   | per-event isolation + `system_logs` dead-letter                 |
| Cron 500s                   | paging                         | crons return 200 + `isMissingTableError` graceful degrade       |

---

## H. Source touchpoints

| Concern                 | File                                                                            |
| ----------------------- | ------------------------------------------------------------------------------- |
| Outbound lesson→Google  | `lib/services/calendar-lesson-sync.ts`                                          |
| Google client + refresh | `lib/google.ts`                                                                 |
| Inbound sync            | `lib/services/calendar-sync-service.ts`, `lib/services/google-calendar-sync.ts` |
| Webhook                 | `app/api/webhooks/google-calendar/route.ts`                                     |
| Polling                 | `app/api/cron/dispatcher/route.ts`, `app/api/cron/calendar-sync/route.ts`       |
| Shadow create/link      | `app/dashboard/actions.ts`, `app/api/admin/link-shadow-user/`                   |
| Reconcile               | `lib/services/calendar-reconcile.ts`                                            |
| Notification triggers   | `supabase/migrations/033_notification_triggers.sql`                             |
| Notification pipeline   | `lib/services/notification-queue-processor.ts`, `lib/email/recipient.ts`        |
| Conflicts               | `app/dashboard/calendar/conflicts/`, `lib/services/sync-conflict-resolver.ts`   |

> Reference layer: [`INTEGRATIONS.md`](./INTEGRATIONS.md) (Calendar/Spotify),
> [`NOTIFICATIONS.md`](./NOTIFICATIONS.md), [`specs/07-calendar.md`](./specs/07-calendar.md),
> [`specs/06-auth-shadow.md`](./specs/06-auth-shadow.md), ADR-0002 (shadow students).
