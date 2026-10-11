/**
 * Cron Job: Lesson Reminders
 *
 * Queues a "24h" reminder for every lesson that will be 24 h away before the
 * dispatcher's next run. Called by /api/cron/dispatcher (daily, 06:00 UTC).
 * The window is `reminderWindow()` — not a fixed 23–25 h band, which with a
 * daily run only ever matched lessons at 05:00–07:00 UTC.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { queueNotification } from '@/lib/services/notification-service';
import {
  logCronStart,
  logCronComplete,
  logCronError,
  logError,
} from '@/lib/notifications/notification-logger';
import { verifyCronSecret } from '@/lib/auth/cron-auth';
import { reminderWindow } from '@/lib/notifications/reminder-window';
// home-ops: cross-cut observability — emits lesson_reminders_{started,
// succeeded,failed} to the home-ops console. Init happens once in
// instrumentation.ts; no-op when INGEST_URL/INGEST_TOKEN aren't set.
import * as hops from '@/lib/observability/home-ops-log.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const startTime = Date.now();

  try {
    logCronStart('lesson-reminders');
    hops.event('lesson_reminders_started');

    const supabase = createAdminClient();

    // Every lesson that reaches the 24 h mark before the next dispatcher run.
    const { start: startWindow, end: endWindow } = reminderWindow(new Date());

    const { data: lessons, error } = await supabase
      .from('lessons')
      .select(
        `
        id,
        scheduled_at,
        title,
        notes,
        student_id,
        teacher_id,
        student_profile:profiles!lessons_student_id_fkey(id, email, full_name),
        teacher_profile:profiles!lessons_teacher_id_fkey(id, email, full_name)
      `
      )
      .eq('status', 'SCHEDULED')
      .gte('scheduled_at', startWindow.toISOString())
      .lte('scheduled_at', endWindow.toISOString());

    if (error) {
      logCronError(
        'lesson-reminders',
        error instanceof Error ? error : new Error('Failed to fetch lessons')
      );
      hops.event('lesson_reminders_failed', {
        level: 'error',
        data: { stage: 'fetch_lessons', error: error.message, duration_ms: Date.now() - startTime },
      });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch lessons' },
        { status: 200 }
      );
    }

    if (!lessons || lessons.length === 0) {
      const duration_ms = Date.now() - startTime;
      logCronComplete('lesson-reminders', duration_ms, { lessons_found: 0 });
      hops.event('lesson_reminders_succeeded', { data: { lessons_found: 0, duration_ms } });
      return NextResponse.json({
        success: true,
        message: 'No lessons to remind',
        count: 0,
      });
    }

    let queued = 0;
    let failed = 0;

    // Queue a reminder for each lesson
    for (const lesson of lessons) {
      try {
        const lessonDate = new Date(lesson.scheduled_at);
        const lessonDateFormatted = lessonDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        const lessonTime = lessonDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });

        await queueNotification({
          type: 'lesson_reminder_24h',
          recipientUserId: lesson.student_id,
          templateData: {
            studentName: lesson.student_profile?.full_name || 'Student',
            teacherName: lesson.teacher_profile?.full_name || 'Your Teacher',
            lessonDate: lessonDateFormatted,
            lessonTime: lessonTime,
            lessonTitle: lesson.title || undefined,
            lessonNotes: lesson.notes || undefined,
          },
          entityType: 'lesson',
          entityId: lesson.id,
          priority: 7, // High priority
        });

        queued++;
      } catch (notificationError) {
        logError(
          `Failed to queue reminder for lesson ${lesson.id}`,
          notificationError instanceof Error ? notificationError : new Error('Unknown error'),
          {
            lesson_id: lesson.id,
            student_id: lesson.student_id,
          }
        );
        failed++;
      }
    }

    const duration = Date.now() - startTime;

    logCronComplete('lesson-reminders', duration, {
      lessons_found: lessons.length,
      queued,
      failed,
    });
    hops.event('lesson_reminders_succeeded', {
      level: failed > 0 ? 'warn' : 'info',
      data: { lessons_found: lessons.length, queued, failed, duration_ms: duration },
    });

    return NextResponse.json({
      success: true,
      queued,
      failed,
      total: lessons.length,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logCronError('lesson-reminders', err);
    hops.event('lesson_reminders_failed', {
      level: 'error',
      data: { error: err.message, duration_ms: Date.now() - startTime },
    });

    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 200 });
  }
}
