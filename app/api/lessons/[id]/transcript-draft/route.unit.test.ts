/**
 * @jest-environment node
 */

import { POST } from './route';
import { generateLessonDraft } from '@/lib/services/lesson-transcript-draft';
import { managedLessonClient } from '@/lib/services/lesson-transcript-draft-access';
import type { AuthedProfile } from '@/lib/auth/loadAuthedProfile';

jest.mock('@/lib/services/lesson-transcript-draft', () => ({ generateLessonDraft: jest.fn() }));
jest.mock('@/lib/services/lesson-transcript-draft-access', () => ({ managedLessonClient: jest.fn() }));
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

let authedProfile: AuthedProfile | null = null;

jest.mock('@/lib/auth/withApiAuth', () => ({
  withApiAuth: jest.fn(
    async (req: Request, handler: (authed: AuthedProfile, req: Request) => Promise<Response>) => {
      if (!authedProfile) {
        const { NextResponse } = await import('next/server');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return handler(authedProfile, req);
    }
  ),
}));

const teacher: AuthedProfile = {
  user: { id: 'auth-1', email: 't@test.com' } as AuthedProfile['user'],
  profileId: 'teacher-1',
  roles: { isAdmin: false, isTeacher: true, isStudent: false },
  flags: { isParent: false, isDevelopment: false },
} as AuthedProfile;

const LESSON_ID = '55555555-5555-4555-8555-555555555555';
const mockedGenerate = generateLessonDraft as jest.MockedFunction<typeof generateLessonDraft>;
const mockedAccess = managedLessonClient as jest.MockedFunction<typeof managedLessonClient>;

const post = (body?: string, id = LESSON_ID) =>
  POST(new Request(`http://localhost/api/lessons/${id}/transcript-draft`, { method: 'POST', body }), {
    params: Promise.resolve({ id }),
  });

beforeEach(() => {
  jest.clearAllMocks();
  authedProfile = teacher;
  mockedAccess.mockResolvedValue({ ok: true, supabase: {} as never });
});

describe('POST /api/lessons/[id]/transcript-draft', () => {
  it('401 without auth', async () => {
    authedProfile = null;
    expect((await post()).status).toBe(401);
  });

  it('404 when the lesson belongs to another teacher', async () => {
    mockedAccess.mockResolvedValue({ ok: false, status: 404, error: 'Lesson not found' });
    expect((await post()).status).toBe(404);
    expect(mockedGenerate).not.toHaveBeenCalled();
  });

  it('400 on malformed JSON or bad aliases', async () => {
    expect((await post('{nope')).status).toBe(400);
    expect((await post(JSON.stringify({ aliases: ['x'] }))).status).toBe(400);
  });

  it('passes aliases through and returns the draft', async () => {
    mockedGenerate.mockResolvedValue({ ok: true, draft: { songs: [] } as never, model: 'm' });
    const res = await post(JSON.stringify({ aliases: ['Kuba'] }));
    expect(res.status).toBe(200);
    expect(mockedGenerate).toHaveBeenCalledWith({}, LESSON_ID, { actorProfileId: 'teacher-1', aliases: ['Kuba'] });
  });

  it.each([
    ['already_applied', 409],
    ['generation_failed', 502],
    ['not_found', 404],
  ] as const)('maps %s to %i', async (code, status) => {
    mockedGenerate.mockResolvedValue({ ok: false, code, message: code });
    expect((await post()).status).toBe(status);
  });
});
