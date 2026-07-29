import type { CronJobStatus } from '@/types/health';

/**
 * The cron fleet as it actually runs.
 *
 * Vercel Hobby allows one cron entry, so `vercel.json` schedules only
 * `/api/cron/dispatcher` (daily 06:00 UTC) and the dispatcher fans out
 * in-process. Every other route therefore inherits that cadence — the
 * per-route schedules this file used to advertise (the notification queue
 * claimed every 15 minutes; it runs once a day) stopped being true when
 * 3d2f1c25 collapsed the schedule, and the debug dashboard went on
 * rendering them as fact.
 *
 * Keep in sync with the job list in `app/api/cron/dispatcher/route.ts`.
 * `manual` entries are deliberate: they are reachable but unscheduled.
 */
const DISPATCHER_SCHEDULE = '0 6 * * *';

export const CRON_REGISTRY: CronJobStatus[] = [
  {
    path: '/api/cron/dispatcher',
    schedule: DISPATCHER_SCHEDULE,
    name: 'Dispatcher (entry point)',
    trigger: 'vercel-cron',
  },
  {
    path: '/api/cron/daily-report',
    schedule: DISPATCHER_SCHEDULE,
    name: 'Daily Report',
    trigger: 'via-dispatcher',
  },
  {
    path: '/api/cron/lesson-reminders',
    schedule: DISPATCHER_SCHEDULE,
    name: 'Lesson Reminders',
    trigger: 'via-dispatcher',
  },
  {
    path: '/api/cron/assignment-due-reminders',
    schedule: DISPATCHER_SCHEDULE,
    name: 'Assignment Due Reminders',
    trigger: 'via-dispatcher',
  },
  {
    path: '/api/cron/assignment-overdue-check',
    schedule: DISPATCHER_SCHEDULE,
    name: 'Assignment Overdue Check',
    trigger: 'via-dispatcher',
  },
  {
    path: '/api/cron/drive-video-scan',
    schedule: DISPATCHER_SCHEDULE,
    name: 'Drive Video Scan',
    trigger: 'via-dispatcher',
  },
  {
    path: '/api/cron/calendar-sync',
    schedule: DISPATCHER_SCHEDULE,
    name: 'Calendar Sync + Student Status',
    trigger: 'via-dispatcher',
  },
  {
    path: '/api/cron/update-student-status',
    schedule: DISPATCHER_SCHEDULE,
    name: 'Update Student Status',
    trigger: 'via-dispatcher',
  },
  {
    path: '/api/cron/renew-webhooks',
    schedule: DISPATCHER_SCHEDULE,
    name: 'Renew Webhooks',
    trigger: 'via-dispatcher',
  },
  {
    path: '/api/cron/process-notification-queue',
    schedule: DISPATCHER_SCHEDULE,
    name: 'Notification Queue',
    trigger: 'via-dispatcher',
  },
  {
    path: '/api/cron/cleanup-auth-events',
    schedule: DISPATCHER_SCHEDULE,
    name: 'Auth Events Cleanup (GDPR)',
    trigger: 'via-dispatcher',
  },
  {
    path: '/api/cron/prune-system-logs',
    schedule: DISPATCHER_SCHEDULE,
    name: 'System Logs Retention',
    trigger: 'via-dispatcher',
  },
  {
    path: '/api/cron/admin-monitoring',
    schedule: DISPATCHER_SCHEDULE,
    name: 'Admin Monitoring',
    trigger: 'via-dispatcher',
  },
  {
    path: '/api/cron/weekly-digest',
    schedule: '0 6 * * 0',
    name: 'Weekly Digest',
    trigger: 'via-dispatcher',
  },
  {
    path: '/api/cron/weekly-insights',
    schedule: '0 6 * * 1',
    name: 'Weekly Insights',
    trigger: 'via-dispatcher',
  },
];
