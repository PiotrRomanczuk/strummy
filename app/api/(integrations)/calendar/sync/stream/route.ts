import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGoogleClient } from '@/lib/google';
import { google } from 'googleapis';
import { TablesInsert } from '@/types/database.types';
import {
  generateMonthChunks,
  determineLessonStatus,
  resolveStudentAttendee,
  findOrCreateStudent,
} from '@/lib/services/calendar-bulk-import';
import { isGuitarLesson } from '@/lib/calendar/calendar-utils';

const activeSyncs = new Map<string, AbortController>();

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { data: profile } = await supabase
    .from('user_overview')
    .select('is_admin, is_teacher')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_admin && !profile?.is_teacher) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const body = await request.json();
  const { startDate, endDate } = body as { startDate: string; endDate: string };

  if (!startDate || !endDate) {
    return new Response(JSON.stringify({ error: 'startDate and endDate required' }), {
      status: 400,
    });
  }

  const syncId = `${user.id}-${Date.now()}`;
  const abortController = new AbortController();
  activeSyncs.set(syncId, abortController);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const adminClient = createAdminClient();
        const oauthClient = await getGoogleClient(user.id);
        const calendar = google.calendar({ version: 'v3', auth: oauthClient });
        const teacherEmail = user.email || '';

        const chunks = generateMonthChunks(new Date(startDate), new Date(endDate));

        sendEvent({ type: 'init', syncId, totalMonths: chunks.length });

        const results = { imported: 0, skipped: 0, errors: 0, total: 0 };

        for (let i = 0; i < chunks.length; i++) {
          if (abortController.signal.aborted) {
            sendEvent({ type: 'cancelled', message: 'Sync cancelled by user' });
            controller.close();
            activeSyncs.delete(syncId);
            return;
          }

          const chunk = chunks[i];
          sendEvent({
            type: 'month_start',
            month: chunk.label,
            monthIndex: i + 1,
            totalMonths: chunks.length,
          });

          let pageToken: string | undefined;

          do {
            const response = await calendar.events.list({
              calendarId: 'primary',
              timeMin: chunk.start.toISOString(),
              timeMax: chunk.end.toISOString(),
              singleEvents: true,
              orderBy: 'startTime',
              maxResults: 250,
              pageToken,
            });

            const events = response.data.items || [];
            pageToken = response.data.nextPageToken || undefined;

            for (const event of events) {
              if (abortController.signal.aborted) break;

              results.total++;

              if (!isGuitarLesson(event)) {
                results.skipped++;
                continue;
              }

              const student = await resolveStudentAttendee(
                event.attendees as Array<{ email: string; displayName?: string }>,
                teacherEmail,
                adminClient
              );

              if (!student) {
                results.skipped++;
                sendEvent({
                  type: 'event_skipped',
                  eventId: event.id,
                  title: event.summary,
                  reason: 'No student attendee',
                });
                continue;
              }

              // Dedup by google_event_id
              const { data: existing } = await adminClient
                .from('lessons')
                .select('id')
                .eq('google_event_id', event.id!)
                .single();

              if (existing) {
                results.skipped++;
                continue;
              }

              const studentResult = await findOrCreateStudent(
                adminClient,
                student.email,
                student.displayName
              );

              if ('error' in studentResult) {
                results.errors++;
                sendEvent({
                  type: 'event_error',
                  eventId: event.id,
                  title: event.summary,
                  error: studentResult.error,
                });
                continue;
              }

              const startTime = event.start?.dateTime || event.start?.date || '';
              const lessonData: TablesInsert<'lessons'> = {
                student_id: studentResult.profileId,
                teacher_id: user.id,
                title: event.summary || 'Guitar Lesson',
                notes: event.description || undefined,
                scheduled_at: startTime,
                google_event_id: event.id!,
                status: determineLessonStatus(startTime),
              };

              const { error: insertError } = await adminClient
                .from('lessons')
                .insert(lessonData);

              if (insertError) {
                results.errors++;
                sendEvent({
                  type: 'event_error',
                  eventId: event.id,
                  title: event.summary,
                  error: insertError.message,
                });
              } else {
                results.imported++;
                sendEvent({
                  type: 'event_imported',
                  eventId: event.id,
                  title: event.summary,
                  student: student.email,
                  status: lessonData.status,
                });
              }
            }
          } while (pageToken && !abortController.signal.aborted);
        }

        sendEvent({ type: 'complete', results });
        controller.close();
        activeSyncs.delete(syncId);
      } catch (error) {
        sendEvent({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        controller.close();
        activeSyncs.delete(syncId);
      }
    },
    cancel() {
      activeSyncs.delete(syncId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const url = new URL(request.url);
  const syncId = url.searchParams.get('syncId');

  if (!syncId) {
    return new Response(JSON.stringify({ error: 'syncId required' }), { status: 400 });
  }

  // syncId is formatted as `${user.id}-${timestamp}` — verify ownership
  if (!syncId.startsWith(user.id)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const controller = activeSyncs.get(syncId);
  if (controller) {
    controller.abort();
    activeSyncs.delete(syncId);
    return new Response(JSON.stringify({ success: true, message: 'Sync cancelled' }));
  }

  return new Response(JSON.stringify({ error: 'Sync not found' }), { status: 404 });
}
