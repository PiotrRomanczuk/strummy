import { NextResponse } from 'next/server';

import { resolvedLessonDraftSchema } from '@/lib/ai/schemas/lesson-transcript-draft';
import { parseId } from '@/lib/api/validate-id';
import { withApiAuth } from '@/lib/auth/withApiAuth';
import { isDemoMutationBlocked, TEST_ACCOUNT_MUTATION_ERROR } from '@/lib/auth/test-account-guard';
import { createLogger } from '@/lib/logger';
import { managedLessonClient } from '@/lib/services/lesson-transcript-draft-access';
import { applyLessonDraft } from '@/lib/services/lesson-transcript-draft-apply';
import { defaultSelection } from '@/lib/services/lesson-transcript-draft-selection';
import { LessonDraftApplySchema, type LessonDraftApply } from '@/schemas/LessonDraftApplySchema';

const log = createLogger('api:lessons:transcript-draft:apply');

type Params = { params: Promise<{ id: string }> };

const STATUS_BY_CODE = { not_found: 404, not_ready: 409, write_failed: 500 } as const;

async function readBody(request: Request): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try {
    const raw = await request.text();
    return { ok: true, body: raw.trim() ? JSON.parse(raw) : null };
  } catch {
    return { ok: false };
  }
}

/**
 * POST /api/lessons/[id]/transcript-draft/apply — write the approved draft
 * into the lesson, its songs, a homework assignment and the student's skills.
 *
 * Body: a LessonDraftApply (exactly what to write), or no body to apply the
 * stored draft's default selection (confident items only, lesson not marked
 * completed). 409 when there is no ready draft — a draft applies once.
 */
export async function POST(request: Request, { params }: Params) {
  return withApiAuth(request, async (authed) => {
    if (isDemoMutationBlocked(authed.flags.isDevelopment)) {
      return NextResponse.json({ error: TEST_ACCOUNT_MUTATION_ERROR }, { status: 403 });
    }
    const parsed = parseId((await params).id, 'Lesson');
    if (!parsed.ok) return parsed.response;

    const read = await readBody(request);
    if (!read.ok) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const access = await managedLessonClient(parsed.id, authed);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    let selection: LessonDraftApply;
    if (read.body === null) {
      const { data } = await access.supabase
        .from('lesson_transcripts')
        .select('draft')
        .eq('lesson_id', parsed.id)
        .maybeSingle();
      const draft = resolvedLessonDraftSchema.safeParse(data?.draft);
      if (!draft.success) return NextResponse.json({ error: 'No draft to apply' }, { status: 409 });
      selection = defaultSelection(draft.data, new Date().toISOString().slice(0, 10));
    } else {
      const body = LessonDraftApplySchema.safeParse(read.body);
      if (!body.success) {
        return NextResponse.json({ error: 'Invalid apply payload', issues: body.error.issues }, { status: 400 });
      }
      selection = body.data;
    }

    const result = await applyLessonDraft(access.supabase, parsed.id, selection);
    if (!result.ok) {
      log.warn('[apply] not applied', { lessonId: parsed.id, code: result.code });
      return NextResponse.json({ error: result.message, code: result.code }, { status: STATUS_BY_CODE[result.code] });
    }
    return NextResponse.json(result);
  });
}
