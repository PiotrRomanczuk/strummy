/**
 * Integration test: repertoire:partial-update-preserves
 *
 * Updating a single field of a repertoire entry must not blank the other
 * columns (the classic "PATCH that becomes a PUT" bug). The action takes a
 * partial input and only the keys present in the input may appear in the
 * Postgres UPDATE payload.
 *
 * @see tasks/unbreakable-core.md → repertoire:partial-update-preserves
 */

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/getUserWithRolesSSR', () => ({
  getUserWithRolesSSR: jest.fn().mockResolvedValue({
    user: { id: '00000000-cccc-4000-a000-000000000003' },
    isAdmin: false,
    isTeacher: true,
    isStudent: false,
    isParent: false,
    isDevelopment: false,
  }),
}));

jest.mock('@/lib/auth/test-account-guard', () => ({
  guardTestAccountMutation: jest.fn().mockReturnValue(null),
  assertNotTestAccount: jest.fn(),
}));

import { createMockQueryBuilder, createMockAuthContext } from '@/lib/testing/integration-helpers';
import { createClient } from '@/lib/supabase/server';
import { updateRepertoireEntryAction } from '@/app/actions/repertoire';

const studentCtx = createMockAuthContext('student');
const REPERTOIRE_ID = '00000000-4444-4000-a000-000000000040';

function buildClient(qb: ReturnType<typeof createMockQueryBuilder>) {
  (createClient as jest.Mock).mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: studentCtx.user },
        error: null,
      }),
    },
    from: jest.fn(() => qb),
  });
  return qb;
}

describe('repertoire:partial-update-preserves', () => {
  it('updating only `priority` does not include capo_fret, key, strumming, or notes', async () => {
    const qb = createMockQueryBuilder({ student_id: studentCtx.userId });
    buildClient(qb);

    const result = await updateRepertoireEntryAction(REPERTOIRE_ID, {
      priority: 'high',
    });

    expect(result).toEqual({ success: true });
    expect(qb.update).toHaveBeenCalledTimes(1);
    const payload = qb.update.mock.calls[0][0];
    expect(payload).toEqual({ priority: 'high' });
    expect(payload).not.toHaveProperty('capo_fret');
    expect(payload).not.toHaveProperty('preferred_key');
    expect(payload).not.toHaveProperty('custom_strumming');
    expect(payload).not.toHaveProperty('student_notes');
    expect(payload).not.toHaveProperty('teacher_notes');
  });

  it('updating only `capo_fret` does not blank other fields', async () => {
    const qb = createMockQueryBuilder({ student_id: studentCtx.userId });
    buildClient(qb);

    await updateRepertoireEntryAction(REPERTOIRE_ID, { capo_fret: 5 });
    const payload = qb.update.mock.calls[0][0];
    expect(payload).toEqual({ capo_fret: 5 });
  });

  it('explicit null is preserved (clearing a field is intentional)', async () => {
    const qb = createMockQueryBuilder({ student_id: studentCtx.userId });
    buildClient(qb);

    await updateRepertoireEntryAction(REPERTOIRE_ID, {
      custom_strumming: null,
    });
    const payload = qb.update.mock.calls[0][0];
    expect(payload).toEqual({ custom_strumming: null });
  });

  it('changing status auto-adds the corresponding timestamp but no other fields', async () => {
    const qb = createMockQueryBuilder({ student_id: studentCtx.userId });
    buildClient(qb);

    await updateRepertoireEntryAction(REPERTOIRE_ID, {
      current_status: 'mastered',
    });
    const payload = qb.update.mock.calls[0][0];
    expect(payload.current_status).toBe('mastered');
    expect(payload.mastered_at).toBeDefined();
    expect(Object.keys(payload).sort()).toEqual(['current_status', 'mastered_at'].sort());
  });
});
