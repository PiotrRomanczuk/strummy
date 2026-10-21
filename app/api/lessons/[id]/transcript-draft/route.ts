import { NextResponse } from 'next/server';
import { z } from 'zod';

import { parseId } from '@/lib/api/validate-id';
import { withApiAuth } from '@/lib/auth/withApiAuth';
import { isDemoMutationBlocked, TEST_ACCOUNT_MUTATION_ERROR } from '@/lib/auth/test-account-guard';
import { createLogger } from '@/lib/logger';
import { generateLessonDraft } from '@/lib/services/lesson-transcript-draft';
import { managedLessonClient } from '@/lib/services/lesson-transcript-draft-access';

const log = createLogger('api:lessons:transcript-draft');

/**
 * The draft model (nvidia/nemotron-3.5-super-vl:free since 2026-10-21) takes
 * 80–90 s on an hour-long lesson, and the fallback can run a second call.
 * 300 s is the Fluid Compute ceiling on the Hobby plan; 60 s timed out (504).
 */
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

const GenerateBodySchema = z
  .object({ aliases: z.array(z.string().trim().min(2).max(60)).max(10).optional() })
  .default({});

const STATUS_BY_CODE = { not_found: 404, already_applied: 409, generation_failed: 502 } as const;

/**
 * GET /api/lessons/[id]/transcript-draft — the stored draft and its status.
 * Auth: cookie session or `Bearer gcrm_…`; admin or the lesson's teacher.
 */
export async function GET(request: Request, { params }: Params) {
  return withApiAuth(request, async (authed) => {
    const parsed = parseId((await params).id, 'Lesson');
    if (!parsed.ok) return parsed.response;
    const access = await managedLessonClient(parsed.id, authed);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const { data } = await access.supabase
      .from('lesson_transcripts')
      .select('draft, draft_status, draft_model, draft_error, draft_generated_at, draft_applied_at')
      .eq('lesson_id', parsed.id)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: 'No transcript for this lesson' }, { status: 404 });
    return NextResponse.json(data);
  });
}

/**
 * POST /api/lessons/[id]/transcript-draft — (re)generate the draft from the
 * lesson's transcript. Body (optional): `{ aliases: ["Kuba"] }` — other names
 * the student is called in the recording, stripped before the model sees it.
 * Writes only lesson_transcripts.draft; 409 once the draft has been applied.
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
    const body = GenerateBodySchema.safeParse(json);
    if (!body.success) {
      return NextResponse.json({ error: 'Invalid body', issues: body.error.issues }, { status: 400 });
    }

    const access = await managedLessonClient(parsed.id, authed);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    try {
      const result = await generateLessonDraft(access.supabase, parsed.id, {
        actorProfileId: authed.profileId,
        aliases: body.data.aliases,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.message, code: result.code }, { status: STATUS_BY_CODE[result.code] });
      }
      return NextResponse.json({ draft: result.draft, model: result.model });
    } catch (err: unknown) {
      log.error('[transcript-draft] generation crashed', { error: err instanceof Error ? err.message : String(err) });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  });
}
