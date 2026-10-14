import { NextResponse } from 'next/server';

import { withApiAuth } from '@/lib/auth/withApiAuth';
import { createLogger } from '@/lib/logger';
import { ingestTranscript } from '@/lib/services/lesson-transcripts';
import { createAdminClient } from '@/lib/supabase/admin';
import { TranscriptIngestSchema } from '@/schemas/LessonTranscriptSchema';

const log = createLogger('api:transcripts:ingest');

/**
 * POST /api/transcripts/ingest — attach a recorder's transcript to a lesson.
 *
 * Auth: cookie session or `Authorization: Bearer gcrm_…` API key; teacher or
 * admin. The student is resolved by email (never created); the lesson is the
 * student's lesson nearest `started_at`, or a new COMPLETED one (→ 201).
 * Re-sending the same `external_id` updates the stored text (→ 200).
 */
export async function POST(request: Request) {
  return withApiAuth(request, async ({ roles, profileId }) => {
    try {
      if (!roles.isAdmin && !roles.isTeacher) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }

      const parsed = TranscriptIngestSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid transcript payload', issues: parsed.error.issues },
          { status: 400 }
        );
      }

      const result = await ingestTranscript(createAdminClient(), {
        ...parsed.data,
        teacherProfileId: profileId,
      });

      if ('error' in result) {
        return NextResponse.json(
          { error: 'No student matches student_email', code: result.error },
          { status: 404 }
        );
      }

      log.info('[transcripts/ingest] stored', {
        lessonId: result.lessonId,
        transcriptId: result.transcriptId,
        lessonCreated: result.lessonCreated,
        source: parsed.data.source,
      });
      return NextResponse.json(result, { status: result.lessonCreated ? 201 : 200 });
    } catch (err: unknown) {
      log.error('[transcripts/ingest] failed', { error: err instanceof Error ? err.message : err });
      return NextResponse.json({ error: 'Could not store transcript' }, { status: 500 });
    }
  });
}
