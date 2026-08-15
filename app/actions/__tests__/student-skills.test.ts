import { upsertStudentSkill } from '../student-skills';

/**
 * `upsertStudentSkill` is the entire write surface of the skills domain, and
 * until 2026-08-15 it had no unit test at all — the E2E proved the teacher's
 * <select> was absent for a student, which is not the same as proving the
 * server refuses a forged call.
 *
 * The headline case is `preserves an existing note`: the update branch wrote
 * `notes: notes ?? null`, so the first status change from the dropdown (which
 * passes no notes) erased whatever the teacher had written. That was latent
 * until SKL-3 gave notes a UI; this pins it.
 */

const mockGuard = jest.fn(() => undefined as { error: string } | undefined);
jest.mock('@/lib/auth/test-account-guard', () => ({
  guardTestAccountMutation: (...args: unknown[]) => mockGuard(...(args as [])),
}));

const mockGetUser = jest.fn();
jest.mock('@/lib/getUserWithRolesSSR', () => ({
  getUserWithRolesSSR: () => mockGetUser(),
}));

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockMaybeSingle = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({ from: mockFrom })),
}));

const STUDENT_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const SKILL_ID = 'bbbbbbbb-2222-4222-8222-222222222222';
const ROW_ID = 'cccccccc-3333-4333-8333-333333333333';

/** `existing` = the row already in student_skills, or null for a first assessment. */
function wireSupabase(existing: { id: string } | null) {
  mockMaybeSingle.mockResolvedValue({ data: existing, error: null });
  mockInsert.mockResolvedValue({ error: null });
  mockUpdate.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });

  const selectChain = {
    select: () => ({
      eq: () => ({ eq: () => ({ single: mockMaybeSingle }) }),
    }),
    insert: mockInsert,
    update: mockUpdate,
  };
  mockFrom.mockReturnValue(selectChain);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGuard.mockReturnValue(undefined);
  mockGetUser.mockResolvedValue({
    user: { id: 'auth-user' },
    isTeacher: true,
    isAdmin: false,
    isDevelopment: false,
  });
  wireSupabase(null);
});

describe('role gate', () => {
  it('refuses a student caller and never touches the database', async () => {
    mockGetUser.mockResolvedValue({
      user: { id: 'auth-user' },
      isTeacher: false,
      isAdmin: false,
      isDevelopment: false,
    });

    const res = await upsertStudentSkill(STUDENT_ID, SKILL_ID, 'mastered');

    expect(res).toEqual({ error: 'Unauthorized. Only teachers and admins can update skills.' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('refuses an unauthenticated caller', async () => {
    mockGetUser.mockResolvedValue({
      user: null,
      isTeacher: false,
      isAdmin: false,
      isDevelopment: false,
    });

    const res = await upsertStudentSkill(STUDENT_ID, SKILL_ID, 'mastered');

    expect('error' in res).toBe(true);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('allows an admin', async () => {
    mockGetUser.mockResolvedValue({
      user: { id: 'auth-user' },
      isTeacher: false,
      isAdmin: true,
      isDevelopment: false,
    });

    expect(await upsertStudentSkill(STUDENT_ID, SKILL_ID, 'mastered')).toEqual({ success: true });
  });

  it('is blocked by the demo-account guard before any auth work', async () => {
    mockGuard.mockReturnValue({ error: 'Demo account' });

    expect(await upsertStudentSkill(STUDENT_ID, SKILL_ID, 'mastered')).toEqual({
      error: 'Demo account',
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('validation', () => {
  it('rejects a note longer than 1000 characters', async () => {
    const res = await upsertStudentSkill(STUDENT_ID, SKILL_ID, 'mastered', 'x'.repeat(1001));

    expect('error' in res).toBe(true);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('rejects an unknown status', async () => {
    const res = await upsertStudentSkill(
      STUDENT_ID,
      SKILL_ID,
      'brilliant' as unknown as 'mastered'
    );

    expect('error' in res).toBe(true);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('lazy row semantics', () => {
  it('inserts when the student has no row for this skill yet', async () => {
    wireSupabase(null);

    await upsertStudentSkill(STUDENT_ID, SKILL_ID, 'progressing');

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: STUDENT_ID,
        skill_id: SKILL_ID,
        status: 'progressing',
      })
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('updates when a row already exists', async () => {
    wireSupabase({ id: ROW_ID });

    await upsertStudentSkill(STUDENT_ID, SKILL_ID, 'mastered');

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'mastered' }));
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('stamps last_assessed_at on both paths', async () => {
    wireSupabase(null);
    await upsertStudentSkill(STUDENT_ID, SKILL_ID, 'mastered');
    expect(mockInsert.mock.calls[0][0].last_assessed_at).toEqual(expect.any(String));

    jest.clearAllMocks();
    wireSupabase({ id: ROW_ID });
    await upsertStudentSkill(STUDENT_ID, SKILL_ID, 'mastered');
    expect(mockUpdate.mock.calls[0][0].last_assessed_at).toEqual(expect.any(String));
  });
});

describe('notes', () => {
  // The regression this file exists for.
  it('preserves an existing note when only the status changes', async () => {
    wireSupabase({ id: ROW_ID });

    await upsertStudentSkill(STUDENT_ID, SKILL_ID, 'mastered');

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    // `notes` must be ABSENT from the payload, not null: omitting the column
    // leaves the stored note alone, whereas `notes: null` erases it.
    expect(mockUpdate.mock.calls[0][0]).not.toHaveProperty('notes');
  });

  it('writes a note when one is supplied', async () => {
    wireSupabase({ id: ROW_ID });

    await upsertStudentSkill(STUDENT_ID, SKILL_ID, 'mastered', 'Watch the wrist angle');

    expect(mockUpdate.mock.calls[0][0]).toMatchObject({ notes: 'Watch the wrist angle' });
  });

  it('clears a note when an empty string is supplied', async () => {
    wireSupabase({ id: ROW_ID });

    await upsertStudentSkill(STUDENT_ID, SKILL_ID, 'mastered', '');

    // Empty means "remove it", normalised once here so the UI can send the
    // textarea's raw value without special-casing.
    expect(mockUpdate.mock.calls[0][0]).toMatchObject({ notes: null });
  });

  it('stores null rather than undefined on a first assessment with no note', async () => {
    wireSupabase(null);

    await upsertStudentSkill(STUDENT_ID, SKILL_ID, 'developing');

    expect(mockInsert.mock.calls[0][0]).toMatchObject({ notes: null });
  });
});
