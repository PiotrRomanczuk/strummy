/**
 * Tests for assignSongToStudentsAction — the song detail page's "quick
 * assign" widget assigns one song to several students at once, skipping
 * students who already have it (upsert + ignoreDuplicates) rather than
 * failing the whole batch.
 */

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/getUserWithRolesSSR', () => ({
  getUserWithRolesSSR: jest.fn(),
}));

jest.mock('@/lib/auth/test-account-guard', () => ({
  guardTestAccountMutation: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

import { assignSongToStudentsAction } from '@/app/actions/repertoire';
import { createClient } from '@/lib/supabase/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';

const TEACHER_ID = 'teacher-uuid-1';
const SONG_ID = '00000000-0000-4000-a000-000000000001';
const STUDENT_A = '00000000-0000-4000-a000-000000000002';
const STUDENT_B = '00000000-0000-4000-a000-000000000003';

function buildSupabaseMock(upsertResult: { data: unknown; error: unknown }) {
  const upsert = jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue(upsertResult),
  });
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: TEACHER_ID } }, error: null }),
    },
    from: jest.fn(() => ({ upsert })),
    upsertMock: upsert,
  };
}

describe('assignSongToStudentsAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getUserWithRolesSSR as jest.Mock).mockResolvedValue({ isDevelopment: false });
    (guardTestAccountMutation as jest.Mock).mockReturnValue(null);
  });

  it('rejects an empty student list', async () => {
    (createClient as jest.Mock).mockResolvedValue(buildSupabaseMock({ data: [], error: null }));

    const result = await assignSongToStudentsAction({ song_id: SONG_ID, student_ids: [] });

    expect('error' in result).toBe(true);
  });

  it('upserts one row per student with due_date/goal_text and the caller as assigned_by', async () => {
    const supabase = buildSupabaseMock({ data: [{ id: 'a' }, { id: 'b' }], error: null });
    (createClient as jest.Mock).mockResolvedValue(supabase);

    const result = await assignSongToStudentsAction({
      song_id: SONG_ID,
      student_ids: [STUDENT_A, STUDENT_B],
      due_date: '2026-08-30',
      goal_text: 'Memorise intro',
    });

    expect('success' in result && result.success).toBe(true);
    expect(supabase.upsertMock).toHaveBeenCalledWith(
      [
        {
          student_id: STUDENT_A,
          song_id: SONG_ID,
          due_date: '2026-08-30',
          goal_text: 'Memorise intro',
          assigned_by: TEACHER_ID,
        },
        {
          student_id: STUDENT_B,
          song_id: SONG_ID,
          due_date: '2026-08-30',
          goal_text: 'Memorise intro',
          assigned_by: TEACHER_ID,
        },
      ],
      { onConflict: 'student_id,song_id', ignoreDuplicates: true }
    );
  });

  it('reports assignedCount from what the upsert actually returned (duplicates silently skipped)', async () => {
    // Two students requested, but one already had the song — ignoreDuplicates
    // means Postgres only returns the one newly-inserted row.
    const supabase = buildSupabaseMock({ data: [{ id: 'only-new-row' }], error: null });
    (createClient as jest.Mock).mockResolvedValue(supabase);

    const result = await assignSongToStudentsAction({
      song_id: SONG_ID,
      student_ids: [STUDENT_A, STUDENT_B],
    });

    expect(result).toEqual({ success: true, assignedCount: 1 });
  });

  it('returns an error when the caller is unauthenticated', async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      from: jest.fn(),
    });

    const result = await assignSongToStudentsAction({
      song_id: SONG_ID,
      student_ids: [STUDENT_A],
    });

    expect(result).toEqual({ error: 'Unauthorized' });
  });

  it('returns an error for a demo/test account', async () => {
    (guardTestAccountMutation as jest.Mock).mockReturnValue({ error: 'blocked' });
    (createClient as jest.Mock).mockResolvedValue(buildSupabaseMock({ data: [], error: null }));

    const result = await assignSongToStudentsAction({
      song_id: SONG_ID,
      student_ids: [STUDENT_A],
    });

    expect(result).toEqual({ error: 'blocked' });
  });

  it('propagates a database error', async () => {
    const supabase = buildSupabaseMock({ data: null, error: { message: 'db exploded' } });
    (createClient as jest.Mock).mockResolvedValue(supabase);

    const result = await assignSongToStudentsAction({
      song_id: SONG_ID,
      student_ids: [STUDENT_A],
    });

    expect(result).toEqual({ error: 'db exploded' });
  });
});
