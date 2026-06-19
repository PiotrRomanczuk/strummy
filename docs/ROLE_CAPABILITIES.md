---
created: 2026-06-19
updated: 2026-06-19
---

# Role Capabilities — Admin & Student

A concrete inventory of every feature and CRUD operation in Strummy, by role.
Two roles are covered here: **Admin** and **Student**. (Teacher currently shares
the Admin dashboard — the owner is the sole teacher — so "Admin" below means
Admin/Teacher.)

**Enforcement:** access is enforced at the database by **Row-Level Security**
(ADR-0001), not in app code. The rule of thumb:

- **Admin** — full CRUD on **all** rows of every domain table.
- **Student** — reads/writes only their **own** rows; most teaching artifacts
  (songs, lessons, assignments) are **read-only** to students, with a few
  explicit self-service writes (practice log, repertoire self-rating, song
  requests, assignment status, own profile/settings).

Legend: **C** create · **R** read · **U** update · **D** delete · **—** not permitted.
"own" = scoped to the signed-in student by RLS.

---

## 1. CRUD matrix by entity

| Entity / table                                                                                 | Route(s)                                                          | Admin                                  | Student                              | Notes                                                                                                                                              |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Songs** (`songs`)                                                                            | `/dashboard/songs`, `/dashboard/songs/[id]`, `/new`, `/[id]/edit` | C R U D                                | **R** (own/assigned, RLS-scoped)     | Students never create/edit/delete songs. Admin soft-deletes (`deleted_at`).                                                                        |
| **Song attachments / videos** (`song_videos`, `drive_files`)                                   | song detail                                                       | C R U D                                | R                                    | YouTube/Ultimate-Guitar/PDF/Drive links.                                                                                                           |
| **Song requests** (`song_requests`)                                                            | song UI                                                           | C R U D                                | **C R** (own)                        | Students can request a song be added.                                                                                                              |
| **Lessons** (`lessons`)                                                                        | `/dashboard/lessons`, `/[id]`                                     | C R U D                                | **R** (own)                          | Students **cannot** edit or delete lessons (read notes + assigned songs only).                                                                     |
| **Lesson ↔ song links** (`lesson_songs`)                                                       | lesson detail                                                     | C R U D                                | R (own lessons)                      | Teacher assigns songs worked on in a lesson.                                                                                                       |
| **Lesson bulk ops**                                                                            | `POST/PUT/DELETE /api/lessons/bulk`                               | C U D (≤100)                           | —                                    | Bulk create/update/soft-delete; admin/teacher only.                                                                                                |
| **Assignments** (`assignments`)                                                                | `/dashboard/assignments`, `/[id]`, `/new`, `/[id]/edit`           | C R U D                                | **R + U(status)** (own)              | Students may advance their own assignment **status** (Not Started→In Progress→Completed); cannot create/delete or edit content.                    |
| **Assignment templates** (`assignment_templates`)                                              | assignment form                                                   | C R U D                                | —                                    | Reusable assignment presets.                                                                                                                       |
| **Practice sessions** (`practice_sessions`)                                                    | `/dashboard/practice`                                             | C R U D                                | **C R + D(same-day)** (own)          | Practice log is **immutable** once recorded; student may delete a same-day entry (undo). No edits.                                                 |
| **Repertoire** (`student_repertoire`)                                                          | `/dashboard/repertoire`                                           | C R U D                                | **R + U(self-rating)** (own)         | Student updates their own self-rating; teacher manages the repertoire set.                                                                         |
| **Song progress / status** (`student_song_progress`, `song_status_history`)                    | song & lesson detail                                              | C R U D                                | R (own)                              | Status lifecycle: To Learn → Started → Remembered → With Author → Mastered. Teacher sets status post-lesson; history is trigger-owned (audit).     |
| **Chord quiz** (`chord_quiz_attempts`)                                                         | fretboard / quiz UI                                               | R (all)                                | **C R** (own)                        | Students take quizzes; attempts are logged.                                                                                                        |
| **Users / profiles** (`profiles`, `user_roles`)                                                | `/dashboard/users`, `/[id]`                                       | C R U D + role mgmt + soft-delete      | **R + U** (own profile only)         | Admin assigns/revokes Admin/Teacher/Student roles, creates users, creates **shadow** students, soft-deletes. Students edit only their own profile. |
| **Shadow students** (`profiles` with `user_id=null`)                                           | `/dashboard/users/[id]`                                           | C + invite (set-and-send) + link/claim | —                                    | Admin/teacher only; invite flow → student claims account (references transfer).                                                                    |
| **Account lockout** (`profiles.locked_until`)                                                  | admin dashboard                                                   | R + unlock                             | —                                    | Admin sees locked accounts and can unlock (clears counters).                                                                                       |
| **Notifications** (`in_app_notifications`)                                                     | `/dashboard/notifications`                                        | R U(mark-read) D (all)                 | **R + U(mark-read/dismiss)** (own)   | In-app inbox; each user manages their own.                                                                                                         |
| **Notification preferences** (`notification_preferences`)                                      | `/dashboard/settings`                                             | C R U D                                | **C R U** (own)                      | Opt-in/out per notification type; unsubscribe.                                                                                                     |
| **User settings** (`user_settings`)                                                            | `/dashboard/settings`                                             | R U (own)                              | **R U** (own)                        | Theme, language, timezone, profile visibility, font scheme.                                                                                        |
| **API keys** (`api_keys`)                                                                      | `/dashboard/settings`                                             | C R D (own)                            | **C R D** (own)                      | `gcrm_` bearer tokens for external apps / iOS widget.                                                                                              |
| **Google integration** (`user_integrations`, `webhook_subscriptions`)                          | `/dashboard/settings`, `/dashboard/calendar`                      | C R + connect/**disconnect** (own)     | (own, if a student connects)         | OAuth connect, calendar sync, disconnect (revoke + stop webhook + delete rows).                                                                    |
| **Calendar sync conflicts** (`sync_conflicts`)                                                 | `/dashboard/calendar/conflicts`                                   | R + U(resolve) (own lessons)           | —                                    | Teacher resolves local-vs-Google diffs (use_local / use_remote).                                                                                   |
| **AI conversations** (`ai_conversations`, `ai_messages`, `ai_generations`)                     | `/dashboard/ai`, `/dashboard/ai/history`                          | C R U D (own)                          | — (no AI tools surfaced to students) | Chat, drafting, insights, generation history.                                                                                                      |
| **Content / production** (`content_posts`, `hashtag_sets`, `content_post_metrics`)             | song detail → Production tab                                      | C R U D                                | —                                    | Admin/teacher only; per-platform post slots, hashtag sets, metrics.                                                                                |
| **Song of the Week** (`song_of_the_week`)                                                      | dashboard / `/dashboard/songs`                                    | C R U D                                | R                                    | Admin curates; students view.                                                                                                                      |
| **Theory courses** (`theoretical_courses`, `theoretical_lessons`, `theoretical_course_access`) | `/dashboard/theory`                                               | C R U D                                | **R** (granted courses)              | Admin authors; students read courses they're granted access to.                                                                                    |
| **Audit log** (`audit_log`, `auth_events`, `*_history`, `system_logs`)                         | `/dashboard/admin`, `/dashboard/logs`                             | R                                      | —                                    | Admin-only visibility; rows written by triggers/system.                                                                                            |

---

## 2. Feature inventory by route

| Route                                                      | Feature                                                                      | Admin                               | Student                                                |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------ |
| `/dashboard`                                               | Role-based dashboard (metrics, agenda, activity, quick actions)              | Platform-wide metrics + admin tools | Next lesson, my songs, my assignments, recent progress |
| `/dashboard/songs`                                         | Song library (search/filter/paginate, Spotify import, attachments)           | Full management                     | Read-only browse of own/assigned songs                 |
| `/dashboard/lessons`                                       | Lessons (list/calendar, create/edit, notes, status, history)                 | Full management + bulk ops          | Read-only (schedule, notes, assigned songs)            |
| `/dashboard/assignments`                                   | Assignments (create/edit/detail, templates, status, notify)                  | Full management                     | View own + advance status                              |
| `/dashboard/practice`                                      | Practice logging                                                             | View all                            | Log own sessions (immutable, same-day undo)            |
| `/dashboard/repertoire`                                    | Repertoire tracking                                                          | Full management                     | View own + self-rating                                 |
| `/dashboard/calendar`                                      | Google Calendar UI (import, webhook, conflicts, disconnect)                  | Full                                | (own connection, if used)                              |
| `/dashboard/users`                                         | User management (roles, create, shadow, invite, soft-delete, lockout unlock) | Full                                | — (no access)                                          |
| `/dashboard/notifications`                                 | In-app notification inbox                                                    | Own + admin view                    | Own                                                    |
| `/dashboard/settings`                                      | Profile, password, settings, API keys, integrations, notification prefs      | Full                                | Own account only                                       |
| `/dashboard/profile`                                       | Self profile                                                                 | Own                                 | Own                                                    |
| `/dashboard/ai`, `/dashboard/ai/history`                   | AI assistant, email drafts, insights, generation history                     | Full                                | —                                                      |
| `/dashboard/fretboard`                                     | Fretboard trainer / chord quiz                                               | Yes                                 | Yes (own attempts)                                     |
| `/dashboard/theory`                                        | Theory courses                                                               | Author                              | Read granted courses                                   |
| `/dashboard/stats`                                         | Analytics / statistics                                                       | Platform-wide                       | — / own progress only                                  |
| `/dashboard/skills`, `/cohorts`                            | Skills / cohorts views                                                       | Yes                                 | Scoped/none                                            |
| `/dashboard/admin`, `/dashboard/logs`, `/dashboard/health` | Admin tools, activity logs, system health, audit, locked accounts            | Yes                                 | —                                                      |

---

## 3. Authentication & account features (all roles)

| Feature                                                                        | Admin | Student                  |
| ------------------------------------------------------------------------------ | ----- | ------------------------ |
| Email + password sign-in (single-step; account lockout after 5 fails / 30 min) | ✓     | ✓                        |
| Google sign-in (`/auth/callback`; claims a matching shadow profile)            | ✓     | ✓                        |
| Sign-up + email confirmation                                                   | ✓     | ✓ (typically via invite) |
| Onboarding (role/goal/skill steps)                                             | ✓     | ✓                        |
| Password reset / change                                                        | ✓     | ✓                        |
| Bearer API keys (`gcrm_`) for external API / iOS widget                        | ✓     | ✓                        |

---

## 4. Student-specific rules (constraints worth calling out)

- **Lessons are read-only** to students — no create/edit/delete (USER_GUIDES §Student).
- **Practice log is immutable** — a student can record sessions and delete a
  **same-day** entry (undo), but cannot edit past sessions.
- **Assignment status only** — students may move their own assignment through the
  status lifecycle but cannot change its content, due date, or links.
- **Own records only** — every student read/write is RLS-scoped to rows the
  student owns; cross-student access is denied at the database.
- **No admin surfaces** — users management, AI tools, content/production,
  conflict resolution, audit logs, and system health are not available to students.
- **Shadow → claim** — a student may first exist as a shadow profile (created by
  a teacher); on accepting the invite, all their lessons/assignments/repertoire
  and future calendar attendees migrate onto the claimed account.

---

## 5. Sources

Derived from the live routes under `app/dashboard/*`, the per-feature specs
([`specs/01`–`specs/10`](./specs)), the RBAC model in
[`MASTER_SPEC.md` §2](./MASTER_SPEC.md), RLS policies in `supabase/migrations`,
and the end-user [`USER_GUIDES.md`](./USER_GUIDES.md). RLS is the source of truth
for enforcement; where this doc and a policy disagree, the policy wins.
