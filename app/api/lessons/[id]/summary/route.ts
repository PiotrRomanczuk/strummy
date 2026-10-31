import { NextResponse } from 'next/server';
import { z } from 'zod';

import { parseId } from '@/lib/api/validate-id';
import { withApiAuth } from '@/lib/auth/withApiAuth';
import { isDemoMutationBlocked, TEST_ACCOUNT_MUTATION_ERROR } from '@/lib/auth/test-account-guard';
import { createLogger } from '@/lib/logger';
import { generateLessonSummary, saveLessonSummary, sendLessonSummary } from '@/lib/services/lesson-summary';
import { managedLessonClient } from '@/lib/services/lesson-transcript-draft-access';

const log = createLogger('api:lessons:summary');

/** The free model can take ~60 s; sending adds the notification round-trip. */
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

const BodySchema = z
  .object({
    /** The teacher's edited text: saved as is, no generation. */
    text: z.string().trim().min(1).max(4000).optional(),
    /** Generate a fresh summary even if one is saved. */
    regenerate: z.boolean().optional(),
    /** E-mail and in-app notify the student after saving. */
    send: z.boolean().optional(),
  })
  .default({});

const STATUS_BY_CODE = { not_found: 404, empty: 409, send_failed: 502 } as const;

/** GET /api/lessons/[id]/summary — the saved summary and when it was generated / sent. */
export async function GET(request: Request, { params }: Params) {
  return withApiAuth(request, async (authed) => {
    const parsed = parseId((await params).id, 'Lesson');
    if (!parsed.ok) return parsed.response;
    const access = await managedLessonClient(parsed.id, authed);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    const { data } = await access.supabase
      .from('lessons')
      .select('summary, summary_generated_at, summary_sent_at')
      .eq('id', parsed.id)
      .maybeSingle();
    return NextResponse.json(data ?? {});
  });
}

/**
 * POST /api/lessons/[id]/summary — the post-lesson message to the student.
 * Body: `{ text?, regenerate?, send? }`. Without `text`, generates from the
 * lesson's songs, notes and homework unless a summary is already saved
 * (`regenerate: true` forces it). `send: true` e-mails it as a lesson_recap.
 */
export async function POST(request: Request, { params }: Params) {
  return withApiAuth(request, async (authed) => {
    if (isDemoMutationBlocked(authed.flags.isDevelopment)) {
      return NextResponse.json({ error: TEST_ACCOUNT_MUTATION_ERROR }, { status: 403 });
    }
    const parsed = parseId((await params).id, 'Lesson');
    if (!parsed.ok) return parsed.response;

    let json: unknown = {};
    try {
      const raw = await request.text();
      json = raw ? JSON.parse(raw) : {};
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const body = BodySchema.safeParse(json);
    if (!body.success) return NextResponse.json({ error: 'Invalid body', issues: body.error.issues }, { status: 400 });

    const access = await managedLessonClient(parsed.id, authed);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    const { supabase } = access;

    try {
      if (body.data.text) {
        await saveLessonSummary(supabase, parsed.id, body.data.text);
      } else {
        const { data: saved } = await supabase.from('lessons').select('summary').eq('id', parsed.id).maybeSingle();
        if (!saved?.summary || body.data.regenerate) {
          const generated = await generateLessonSummary(supabase, parsed.id, authed.profileId);
          if (!generated.ok) {
            return NextResponse.json({ error: generated.message, code: generated.code }, { status: STATUS_BY_CODE[generated.code] });
          }
        }
      }
      if (!body.data.send) {
        const { data } = await supabase.from('lessons').select('summary').eq('id', parsed.id).maybeSingle();
        return NextResponse.json({ summary: data?.summary ?? '', sent: false });
      }
      const sent = await sendLessonSummary(supabase, parsed.id);
      if (!sent.ok) return NextResponse.json({ error: sent.message, code: sent.code }, { status: STATUS_BY_CODE[sent.code] });
      return NextResponse.json({ summary: sent.summary, sent: sent.sent ?? false });
    } catch (error) {
      log.error('[summary] failed', { lessonId: parsed.id, error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
  });
}
