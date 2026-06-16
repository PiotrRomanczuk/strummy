---
created: 2026-06-16
updated: 2026-06-16
---

# Strummy — Notifications & Email

Living reference for Strummy's notification system: channels, queue/retry model, tables, preference checks, unsubscribe, the deliverable-email chokepoint, and cron jobs.

Cross-ref: [`docs/MASTER_SPEC.md`](./MASTER_SPEC.md) §2.8 (notifications), §2.6.2 (deliverable-email chokepoint).

---

## ⚠️ Restoration in progress

The notification tables (`notification_log`, `notification_queue`, `notification_preferences`, `in_app_notifications`, plus the `delivery_channel` column and triggers) are **currently MISSING from production** due to schema drift. They are being **restored** by applying the bucket-A migrations in **MASTER_SPEC Phase 0.1** (see MASTER_SPEC §0.1 and §2.8).

**Until those migrations land, sends fail silently** — triggers/queue inserts have no target table, so no email or in-app notification is delivered and nothing is logged. Treat everything below as the _intended design_, which comes back online once bucket-A is applied. Verify the tables exist before relying on any send path.

---

## Channels

Two delivery channels, routed per notification type via a `delivery_channel` preference (`email | in_app | both`).

| Channel    | Transport                                      | Latency               | Default for                       |
| ---------- | ---------------------------------------------- | --------------------- | --------------------------------- |
| **email**  | SMTP (Gmail / nodemailer), queued + retried    | minutes (15-min cron) | `student_welcome`, `lesson_recap` |
| **in_app** | `in_app_notifications` row + Supabase Realtime | <1s (realtime push)   | all 16 other types                |

- Routing logic lives in `lib/services/notification-service.ts` (`getDeliveryChannel()`, `getDefaultDeliveryChannel()`).
- `sendNotification()` creates an in-app row when channel is `in_app` or `both`, and queues/sends email when channel is `email` or `both`.
- 16 of 18 types are in-app only; only `student_welcome` and `lesson_recap` remain email-only. This minimizes email fatigue while keeping welcome/recap as durable email records.

---

## Queue & Retry Model (email)

Email is asynchronous: triggers/actions enqueue, a cron drains the queue.

**Send pipeline:**

1. Trigger event (DB trigger or Server Action) inserts into `notification_queue` with priority + `scheduled_for`.
2. `process-notification-queue` cron (every 15 min) fetches due pending rows (batch 100) via `get_pending_notifications()` using `FOR UPDATE SKIP LOCKED`.
3. **Preference check** — `is_notification_enabled(user_id, type)` (defaults `true` if no row).
4. **Deliverable-email check** — `getDeliverableEmail()` (see below); skip if none.
5. **Rate-limit check** — 100/hr/user, 1000/hr system-wide.
6. Render HTML template → SMTP send → write `notification_log`.
7. On failure, schedule retry with exponential backoff.

**Retry backoff** (`MAX_RETRY_ATTEMPTS = 5`, `lib/email/retry-handler.ts`):

| Attempt | Wait                           |
| ------- | ------------------------------ |
| 1       | 1 min                          |
| 2       | 5 min                          |
| 3       | 30 min                         |
| 4       | 2 hr                           |
| 5       | 24 hr                          |
| >5      | dead-letter → status `bounced` |

**Bounce handling:** 3 consecutive bounces auto-disables all notifications for the user (`lib/email/bounce-handler.ts`; re-enable via `reenableNotificationsForUser`).

**Priority levels** (queue ordering, higher first): `CRITICAL=10`, `HIGH=8`, `NORMAL=5`, `LOW=3`, `BULK=1`.

---

## Deliverable-Email Chokepoint (`getDeliverableEmail`)

All email sends funnel through a single resolver, **`getDeliverableEmail()`** — the chokepoint that decides whether a recipient actually has a sendable address.

- It resolves the address to send to and is the one place that enforces deliverability.
- **Shadow profiles with no `invite_email` are skipped** — there is no address to deliver to, so the send is a no-op (logged/skipped, never errored). This prevents queue churn and bounces against placeholder shadow records.
- In-app notifications do **not** pass through this chokepoint (no email address needed) and are delivered to shadows normally.

Cross-ref: **MASTER_SPEC §2.6.2** for the full deliverable-email / shadow-profile contract.

---

## Tables

### `notification_queue` — scheduled/delayed email sends

| Column                      | Type                | Notes                    |
| --------------------------- | ------------------- | ------------------------ |
| `id`                        | UUID                | PK                       |
| `notification_type`         | notification_type   | enum                     |
| `recipient_user_id`         | UUID                | FK profiles(id)          |
| `template_data`             | JSONB               | data for template        |
| `scheduled_for`             | TIMESTAMPTZ         | when to send             |
| `processed_at`              | TIMESTAMPTZ         | when processed           |
| `status`                    | notification_status | queue status             |
| `priority`                  | INT                 | 1–10, higher first       |
| `entity_type` / `entity_id` | TEXT / UUID         | optional polymorphic ref |
| `created_at` / `updated_at` | TIMESTAMPTZ         |                          |

Key indexes: `scheduled_for WHERE status='pending'`; `(priority DESC, scheduled_for ASC) WHERE status='pending'`.

### `notification_log` — audit trail of every send attempt

| Column                        | Type                | Notes           |
| ----------------------------- | ------------------- | --------------- |
| `id`                          | UUID                | PK              |
| `notification_type`           | notification_type   |                 |
| `recipient_user_id`           | UUID                | FK profiles(id) |
| `recipient_email`             | TEXT                | address sent to |
| `status`                      | notification_status | delivery status |
| `subject`                     | TEXT                |                 |
| `template_data`               | JSONB               |                 |
| `sent_at`                     | TIMESTAMPTZ         | on success      |
| `error_message`               | TEXT                | on failure      |
| `retry_count` / `max_retries` | INT                 | default max 5   |
| `entity_type` / `entity_id`   | TEXT / UUID         | optional        |
| `created_at` / `updated_at`   | TIMESTAMPTZ         |                 |

Key indexes: `(recipient_user_id, created_at DESC)`; `(status, created_at DESC)`; `(status, retry_count) WHERE status='failed'`.

### `notification_preferences` — per-user opt-in/out + channel

| Column                      | Type                          | Notes                     |
| --------------------------- | ----------------------------- | ------------------------- |
| `id`                        | UUID                          | PK                        |
| `user_id`                   | UUID                          | FK profiles(id)           |
| `notification_type`         | notification_type             |                           |
| `enabled`                   | BOOLEAN                       | default `true`            |
| `delivery_channel`          | notification_delivery_channel | `email \| in_app \| both` |
| `created_at` / `updated_at` | TIMESTAMPTZ                   |                           |

Unique: `(user_id, notification_type)`. Seeded per user by `initialize_notification_preferences()`; digests (`weekly_progress_digest`, `teacher_daily_summary`) default `enabled=false`.

### `in_app_notifications` — durable in-app feed

| Column                        | Type                  | Notes                                            |
| ----------------------------- | --------------------- | ------------------------------------------------ |
| `id`                          | UUID                  | PK                                               |
| `user_id`                     | UUID                  | FK profiles(id)                                  |
| `notification_type`           | notification_type     |                                                  |
| `title` / `body`              | TEXT                  | content                                          |
| `icon`                        | TEXT                  | emoji/icon                                       |
| `variant`                     | TEXT                  | `default \| success \| warning \| error \| info` |
| `is_read` / `read_at`         | BOOLEAN / TIMESTAMPTZ | read status                                      |
| `action_url` / `action_label` | TEXT                  | optional deep link                               |
| `entity_type` / `entity_id`   | TEXT / UUID           | polymorphic ref                                  |
| `priority`                    | INT                   | 1–10                                             |
| `expires_at`                  | TIMESTAMPTZ           | 30 days after read                               |
| `created_at`                  | TIMESTAMPTZ           |                                                  |

Realtime enabled. Cleanup via `cleanup_old_in_app_notifications()` (daily). Key indexes: user-unread, user-all, entity, expires.

> Note: a separate `user_preferences` table holds broader per-user settings; notification opt-in/out and channel live in `notification_preferences` above. Keep notification toggles out of `user_preferences` to avoid drift.

### Enums

- **`notification_type`** — Lessons: `lesson_reminder_24h`, `lesson_recap`, `lesson_cancelled`, `lesson_rescheduled` · Assignments: `assignment_created`, `assignment_due_reminder`, `assignment_overdue_alert`, `assignment_completed` · Achievements: `song_mastery_achievement`, `milestone_reached` · Lifecycle: `student_welcome`, `trial_ending_reminder` · Digests: `teacher_daily_summary`, `weekly_progress_digest` · System: `calendar_conflict_alert`, `webhook_expiration_notice`, `admin_error_alert`.
- **`notification_status`** — `pending`, `sent`, `failed`, `bounced`, `skipped`, `cancelled`.
- **`notification_delivery_channel`** — `email`, `in_app`, `both`.

### RLS (all four tables)

- Users SELECT (and UPDATE preferences / in-app read status) their own rows.
- Admins SELECT all.
- Service role performs all queue/log/insert operations.

---

## Preference Checks

- **Email path:** queue processor calls `is_notification_enabled(user_id, type)` before sending. Returns `BOOLEAN`, defaults `true` when no preference row exists. Disabled → `notification_log.status = 'skipped'`.
- **Channel routing:** `getDeliveryChannel()` reads `notification_preferences.delivery_channel`, falling back to `getDefaultDeliveryChannel()` per type.
- **UI:** `/dashboard/settings` notification preferences toggle `enabled` per type and show a channel badge (Email Only / In-App Only / Email + In-App). Managed via `app/actions/notification-preferences.ts`.

---

## Unsubscribe Flow (email)

One-click opt-out from email footer links, no auth required.

- **Link generation:** `getUnsubscribeLink(recipientUserId, notificationType)` in `lib/email/templates/base-template.ts`. Templates pass `recipientUserId` + `notificationType` to render it; fallback link is `/dashboard/settings`.
- **API:** `GET /app/api/notifications/unsubscribe?userId=<uuid>&type=<notification_type>`
  1. Validate params → validate type exists → verify user in profiles.
  2. Set `notification_preferences.enabled = false` for `(userId, type)`.
  3. Redirect to `/unsubscribe` confirmation page with `success`/`error`/`type`.
- **Errors:** `missing_params`, `invalid_type`, `user_not_found`, `update_failed`, `server_error`.
- **Confirmation page:** `/app/unsubscribe/page.tsx` — success / error / default states; links to settings + dashboard; re-subscribe by toggling back on in settings.
- **Security:** current model trusts `userId`+`type` in the URL (fine for one-time email use). Future: signed expiring token (`UNSUBSCRIBE_SECRET`).

---

## Cron Jobs

Defined in `/vercel.json`, implemented in `/app/api/cron/`. All verify `Authorization: Bearer ${CRON_SECRET}`.

| Job                            | Schedule           | Purpose                                 |
| ------------------------------ | ------------------ | --------------------------------------- |
| **process-notification-queue** | `*/15 * * * *`     | Drain pending email queue (batch 100)   |
| **lesson-reminders**           | `0 10 * * *`       | Queue 24h lesson reminders              |
| **assignment-due-reminders**   | `0 9 * * *`        | Reminders for assignments due in 2 days |
| **assignment-overdue-check**   | `0 18 * * *`       | Alerts for overdue assignments          |
| **weekly-digest**              | `0 18 * * 0`       | Weekly progress digest to students      |
| **weekly-insights**            | `0 9 * * 1`        | Weekly insights to teachers             |
| **renew-webhooks**             | `0 2 * * *`        | Renew expiring calendar webhooks        |
| **cleanup (in-app)**           | daily ~`0 2 * * *` | `cleanup_old_in_app_notifications()`    |

The two pillars: **`process-notification-queue`** (the email send loop) and **`weekly-digest`** (batched student digest). Each cron returns JSON `{ processed, failed, timestamp }`.

**Local trigger:**

```bash
curl -X GET http://localhost:3000/api/cron/process-notification-queue \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

---

## Configuration

| Var                         | Purpose                                   |
| --------------------------- | ----------------------------------------- |
| `GMAIL_USER` / `GMAIL_PASS` | SMTP (Gmail app password)                 |
| `CRON_SECRET`               | Secures cron endpoints                    |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin DB access for queue/log writes      |
| `NEXT_PUBLIC_APP_URL`       | Base URL for links (unsubscribe, CTAs)    |
| `NOTIFICATIONS_ENABLED`     | Global kill-switch (`false` disables all) |

Rate limits (`lib/email/rate-limiter.ts`): `USER_LIMIT=100/hr`, `SYSTEM_LIMIT=1000/hr`. Stay under 50% of Gmail's daily cap (500 free / 2000 Workspace).

---

## Key Files

| Path                                                                      | Role                                                                    |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `lib/services/notification-service.ts`                                    | Dual-channel routing, queue/send, `getDeliverableEmail`                 |
| `lib/services/in-app-notification-service.ts`                             | In-app CRUD (`createInAppNotification`, `markAsRead`, `getUnreadCount`) |
| `lib/email/templates/base-template.ts`                                    | Base HTML + unsubscribe link                                            |
| `lib/email/retry-handler.ts` · `rate-limiter.ts` · `bounce-handler.ts`    | Retry / rate / bounce                                                   |
| `app/actions/notification-preferences.ts` · `in-app-notifications.ts`     | Server actions                                                          |
| `app/api/notifications/unsubscribe/route.ts` · `app/unsubscribe/page.tsx` | Unsubscribe                                                             |
| `components/notifications/*`                                              | Bell, Center, `useNotifications` (realtime)                             |
| `types/notifications.ts`                                                  | Types, categories, `NotificationDeliveryChannel`                        |
| `supabase/migrations/032,038,039_*.sql`                                   | Schema + in-app + trigger migrations (bucket A)                         |
