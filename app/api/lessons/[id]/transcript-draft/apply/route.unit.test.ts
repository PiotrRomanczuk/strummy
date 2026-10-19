/**
 * @jest-environment node
 */

import { POST } from './route';
import { applyLessonDraft } from '@/lib/services/lesson-transcript-draft-apply';
import { managedLessonClient } from '@/lib/services/lesson-transcript-draft-access';
import type { AuthedProfile } from '@/lib/auth/loadAuthedProfile';

jest.mock('@/lib/services/lesson-transcript-draft-apply', () => ({ applyLessonDraft: jest.fn() }));
jest.mock('@/lib/services/lesson-transcript-draft-access', () => ({ managedLessonClient: jest.fn() }));
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));
jest.mock('@/lib/auth/withApiAuth', () => ({
  withApiAuth: jest.fn((req: Request, handler: (a: AuthedProfile, r: Request) => Promise<Response>) =>
    handler(
      {
        profileId: 'teacher-1',
        roles: { isAdmin: false, isTeacher: true, isStudent: false },
        flags: { isParent: false, isDevelopment: false },
      } as AuthedProfile,
      req
    )
  ),
}));

const LESSON_ID = '55555555-5555-4555-8555-555555555555';
const mockedApply = applyLessonDraft as jest.MockedFunction<typeof applyLessonDraft>;
const mockedAccess = managedLessonClient as jest.MockedFunction<typeof managedLessonClient>;

const storedDraft = {
  isGuitarLesson: true,
  lessonTitle: 'Riffy',
  songs: [],
  assignment: null,
  skills: [],
  notes: { technique: ['Palm muting'], theory: [], wentWell: [], needsWork: [], other: [] },
  teacherCommitments: [],
  profileHints: [],
  logistics: [],
  questions: [],
};

function supabaseReturning(draft: unknown) {
  const chain = { select: () => chain, eq: () => chain, maybeSingle: () => Promise.resolve({ data: { draft } }) };
  return { from: () => chain } as never;
}

const post = (body?: string) =>
  POST(new Request(`http://localhost/api/lessons/${LESSON_ID}/transcript-draft/apply`, { method: 'POST', body }), {
    params: Promise.resolve({ id: LESSON_ID }),
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockedAccess.mockResolvedValue({ ok: true, supabase: supabaseReturning(storedDraft) });
  mockedApply.mockResolvedValue({ ok: true, songs: 0, newSongs: 0, assignmentId: null, skills: 0 });
});

describe('POST /api/lessons/[id]/transcript-draft/apply', () => {
  it('applies the default selection of the stored draft when there is no body', async () => {
    expect((await post()).status).toBe(200);
    const selection = mockedApply.mock.calls[0][2];
    expect(selection).toMatchObject({ lessonTitle: 'Riffy', markCompleted: false, songs: [] });
    expect(selection.notes).toContain('## Technika\n- Palm muting');
  });

  it('409 when there is no stored draft to default from', async () => {
    mockedAccess.mockResolvedValue({ ok: true, supabase: supabaseReturning(null) });
    expect((await post()).status).toBe(409);
    expect(mockedApply).not.toHaveBeenCalled();
  });

  it('400 on an invalid selection', async () => {
    expect((await post(JSON.stringify({ notes: 'x' }))).status).toBe(400);
    expect((await post('{oops')).status).toBe(400);
  });

  it('maps not_ready to 409', async () => {
    mockedApply.mockResolvedValue({ ok: false, code: 'not_ready', message: 'applied' });
    expect((await post()).status).toBe(409);
  });
});
