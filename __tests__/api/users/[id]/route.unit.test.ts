/**
 * @jest-environment node
 *
 * User API [id] Route Tests
 * Regression tests for STRUM-253: PUT must not clobber role flags
 * when the client sends a partial payload.
 */

import { GET, PUT } from '@/app/api/users/[id]/route';
import { createClient } from '@/lib/supabase/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/getUserWithRolesSSR', () => ({
  getUserWithRolesSSR: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const targetUserId = '00000000-0000-0000-0000-0000000000aa';

interface UpdateCall {
  payload: Record<string, unknown>;
}

function buildSupabaseMock(updateCalls: UpdateCall[]) {
  // Single returns the row after update
  const returnedRow = { id: targetUserId, full_name: 'Updated' };

  const builder = {
    select: jest.fn().mockReturnThis(),
    update: jest.fn((payload: Record<string, unknown>) => {
      updateCalls.push({ payload });
      return builder;
    }),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: returnedRow, error: null }),
  };

  return {
    from: jest.fn().mockReturnValue(builder),
  };
}

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/users/' + targetUserId, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const paramsPromise = Promise.resolve({ id: targetUserId });

describe('PUT /api/users/[id] - partial payload (STRUM-253)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getUserWithRolesSSR as jest.Mock).mockResolvedValue({
      user: { id: 'admin-id' },
      isAdmin: true,
    });
  });

  it('does not include role flags when client omits them', async () => {
    const calls: UpdateCall[] = [];
    (createClient as jest.Mock).mockResolvedValue(buildSupabaseMock(calls));

    const res = await PUT(makeRequest({ full_name: 'New Name' }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    const payload = calls[0].payload;
    expect(payload).toHaveProperty('full_name', 'New Name');
    expect(payload).toHaveProperty('updated_at');
    expect(payload).not.toHaveProperty('is_admin');
    expect(payload).not.toHaveProperty('is_teacher');
    expect(payload).not.toHaveProperty('is_student');
    expect(payload).not.toHaveProperty('is_parent');
    expect(payload).not.toHaveProperty('is_active');
    expect(payload).not.toHaveProperty('parent_id');
    expect(payload).not.toHaveProperty('student_status');
  });

  it('includes student_status only when explicitly provided', async () => {
    const calls: UpdateCall[] = [];
    (createClient as jest.Mock).mockResolvedValue(buildSupabaseMock(calls));

    const res = await PUT(makeRequest({ studentStatus: 'archived' }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(200);
    const payload = calls[0].payload;
    expect(payload).toHaveProperty('student_status', 'archived');
  });

  it('rejects an invalid student_status value', async () => {
    const calls: UpdateCall[] = [];
    (createClient as jest.Mock).mockResolvedValue(buildSupabaseMock(calls));

    const res = await PUT(makeRequest({ studentStatus: 'bogus' }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('includes role flags only when explicitly provided (incl. false)', async () => {
    const calls: UpdateCall[] = [];
    (createClient as jest.Mock).mockResolvedValue(buildSupabaseMock(calls));

    const res = await PUT(makeRequest({ isAdmin: false, isTeacher: true }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(200);
    const payload = calls[0].payload;
    expect(payload).toHaveProperty('is_admin', false);
    expect(payload).toHaveProperty('is_teacher', true);
    expect(payload).not.toHaveProperty('is_student');
    expect(payload).not.toHaveProperty('full_name');
  });

  it('rejects empty payload (no updatable fields)', async () => {
    const calls: UpdateCall[] = [];
    (createClient as jest.Mock).mockResolvedValue(buildSupabaseMock(calls));

    const res = await PUT(makeRequest({}), { params: paramsPromise });

    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('derives full_name from firstName/lastName only when provided', async () => {
    const calls: UpdateCall[] = [];
    (createClient as jest.Mock).mockResolvedValue(buildSupabaseMock(calls));

    const res = await PUT(makeRequest({ firstName: 'Ada', lastName: 'Lovelace' }), {
      params: paramsPromise,
    });

    expect(res.status).toBe(200);
    expect(calls[0].payload).toHaveProperty('full_name', 'Ada Lovelace');
  });
});

describe('GET /api/users/[id] - teacher notes (#1096)', () => {
  function readMock(note: { notes: string } | null, noteError: { message: string } | null = null) {
    const tables: string[] = [];
    const profile = { id: targetUserId, full_name: 'Ada', email: 'ada@example.com' };
    const from = jest.fn((table: string) => {
      tables.push(table);
      const builder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: profile, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: note, error: noteError }),
      };
      return builder;
    });
    return { client: { from }, tables };
  }

  beforeEach(() => {
    (getUserWithRolesSSR as jest.Mock).mockResolvedValue({
      user: { id: 'admin-id' },
      isAdmin: true,
    });
  });

  it('reads the notes from student_private_notes, not the profile row', async () => {
    const { client, tables } = readMock({ notes: 'Wants to play Wonderwall' });
    (createClient as jest.Mock).mockResolvedValue(client);

    const res = await GET(new Request('http://localhost/api/users/' + targetUserId), {
      params: paramsPromise,
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      id: targetUserId,
      notes: 'Wants to play Wonderwall',
    });
    expect(tables).toEqual(['profiles', 'student_private_notes']);
  });

  it('answers 500 when the notes query fails, never notes: null', async () => {
    (createClient as jest.Mock).mockResolvedValue(
      readMock(null, { message: 'permission denied' }).client
    );

    const res = await GET(new Request('http://localhost/api/users/' + targetUserId), {
      params: paramsPromise,
    });

    expect(res.status).toBe(500);
  });

  it('returns notes: null when the student has none', async () => {
    (createClient as jest.Mock).mockResolvedValue(readMock(null).client);

    const res = await GET(new Request('http://localhost/api/users/' + targetUserId), {
      params: paramsPromise,
    });

    await expect(res.json()).resolves.toMatchObject({ notes: null });
  });
});

describe('PUT /api/users/[id] - teacher edits own student (#1178)', () => {
  const rpc = jest.fn();
  const from = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    rpc.mockResolvedValue({ data: null, error: null });
    (createClient as jest.Mock).mockResolvedValue({ rpc, from });
    (getUserWithRolesSSR as jest.Mock).mockResolvedValue({
      user: { id: 'teacher-auth-id' },
      profileId: 'teacher-profile-id',
      isAdmin: false,
      isTeacher: true,
    });
  });

  it('saves the card fields and archive through the RPC, never a direct update', async () => {
    const res = await PUT(
      makeRequest({ full_name: 'Fixed Name', skillLevel: 'advanced', studentStatus: 'archived' }),
      { params: paramsPromise }
    );

    expect(res.status).toBe(200);
    expect(from).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith('teacher_update_student', {
      p_student_id: targetUserId,
      p_changes: { full_name: 'Fixed Name', skill_level: 'advanced', student_status: 'archived' },
    });
  });

  it.each([{ isAdmin: true }, { isTeacher: false }, { isActive: false }, { parentId: null }])(
    'refuses an admin-only field %p with 403',
    async (field) => {
      const res = await PUT(makeRequest({ full_name: 'X', ...field }), { params: paramsPromise });
      expect(res.status).toBe(403);
      expect(rpc).not.toHaveBeenCalled();
    }
  );

  it('answers 403 when the database says the student is not theirs', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'teacher_update_student: not your student' },
    });
    const res = await PUT(makeRequest({ full_name: 'X' }), { params: paramsPromise });
    expect(res.status).toBe(403);
  });

  it('keeps a student (no teacher role) out entirely', async () => {
    (getUserWithRolesSSR as jest.Mock).mockResolvedValue({
      user: { id: 'student-auth-id' },
      profileId: 'student-profile-id',
      isAdmin: false,
      isTeacher: false,
    });
    const res = await PUT(makeRequest({ full_name: 'X' }), { params: paramsPromise });
    expect(res.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });
});
