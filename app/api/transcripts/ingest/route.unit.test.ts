/**
 * @jest-environment node
 */

import { POST } from './route';
import { ingestTranscript } from '@/lib/services/lesson-transcripts';
import type { AuthedProfile } from '@/lib/auth/loadAuthedProfile';

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn(() => ({})) }));
jest.mock('@/lib/services/lesson-transcripts', () => ({ ingestTranscript: jest.fn() }));
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

const profile = (roles: Partial<AuthedProfile['roles']>): AuthedProfile => ({
  user: { id: 'auth-1', email: 'x@test.com' } as AuthedProfile['user'],
  profileId: 'profile-1',
  roles: { isAdmin: false, isTeacher: false, isStudent: false, ...roles },
  flags: { isParent: false, isDevelopment: false },
});

const VALID_BODY = {
  source: 'wispr',
  external_id: 'wispr-abc',
  started_at: '2026-10-13T16:00:00Z',
  student_email: 'jan@example.pl',
  transcript: 'Teacher: Let us start with Hammer to Fall. Student: sztos.',
};

const post = (body: unknown) =>
  POST(
    new Request('http://localhost/api/transcripts/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  );

const mockedIngest = ingestTranscript as jest.MockedFunction<typeof ingestTranscript>;

describe('POST /api/transcripts/ingest', () => {
  beforeEach(() => {
    authedProfile = null;
    mockedIngest.mockReset();
  });

  it('401 without a session or API key', async () => {
    const res = await post(VALID_BODY);
    expect(res.status).toBe(401);
    expect(mockedIngest).not.toHaveBeenCalled();
  });

  it('403 for a student', async () => {
    authedProfile = profile({ isStudent: true });
    const res = await post(VALID_BODY);
    expect(res.status).toBe(403);
    expect(mockedIngest).not.toHaveBeenCalled();
  });

  it('400 for an invalid body (transcript too short, bad email)', async () => {
    authedProfile = profile({ isTeacher: true });
    const res = await post({ ...VALID_BODY, transcript: 'short', student_email: 'nope' });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid transcript payload');
    expect(Array.isArray(json.issues)).toBe(true);
  });

  it('400 for a non-JSON body', async () => {
    authedProfile = profile({ isTeacher: true });
    const res = await post('{not json');
    expect(res.status).toBe(400);
  });

  it('200 on an existing lesson, passing the teacher profile id and defaults through', async () => {
    authedProfile = profile({ isTeacher: true });
    mockedIngest.mockResolvedValue({
      lessonId: 'lesson-1',
      transcriptId: 'tr-1',
      lessonCreated: false,
      student: { id: 'student-1', name: 'Jan' },
    });

    const res = await post(VALID_BODY);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      lessonId: 'lesson-1',
      transcriptId: 'tr-1',
      lessonCreated: false,
      student: { id: 'student-1', name: 'Jan' },
    });
    expect(mockedIngest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ teacherProfileId: 'profile-1', language: 'pl', source: 'wispr' })
    );
  });

  it('201 when the lesson had to be created', async () => {
    authedProfile = profile({ isAdmin: true });
    mockedIngest.mockResolvedValue({
      lessonId: 'lesson-new',
      transcriptId: 'tr-2',
      lessonCreated: true,
      student: { id: 'student-1', name: null },
    });
    const res = await post(VALID_BODY);
    expect(res.status).toBe(201);
  });

  it('404 when no student matches the email', async () => {
    authedProfile = profile({ isTeacher: true });
    mockedIngest.mockResolvedValue({ error: 'student_not_found' });
    const res = await post(VALID_BODY);
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ code: 'student_not_found' });
  });

  it('500 JSON when the service throws', async () => {
    authedProfile = profile({ isTeacher: true });
    mockedIngest.mockRejectedValue(new Error('db down'));
    const res = await post(VALID_BODY);
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'Could not store transcript' });
  });
});
