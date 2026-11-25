/**
 * @jest-environment node
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { validatePreconditions } from './validate-link-request';

/**
 * The existing-profile check is the point of these tests: `realUserId` is an
 * auth id, so it must be matched against `profiles.user_id`, never `profiles.id`
 * (they differ since S2). The mock records every filter and answers a lookup
 * only when it filters on the column a real query would have to use.
 */

const SHADOW_ID = '45085573-07bc-475b-b8f2-baeae18ffb4e';
const REAL_USER_ID = '69590a6f-5873-428b-8e37-9c1306f26757';
const REAL_PROFILE_ID = 'bbbbbbbb-1111-4000-a000-000000000002';

const SHADOW_ROW = { id: SHADOW_ID, email: 'shadow@x.test', full_name: 'Shadow', is_shadow: true };

function mockClient(options: { realUserHasProfile: boolean }) {
  const filters: Array<{ column: string; value: unknown }> = [];
  const answer = (column: string, value: unknown) => {
    if (column === 'id' && value === SHADOW_ID) return SHADOW_ROW;
    if (column === 'user_id' && value === REAL_USER_ID && options.realUserHasProfile) {
      return { id: REAL_PROFILE_ID };
    }
    return null;
  };
  const client = {
    from: () => ({
      select: () => ({
        eq: (column: string, value: unknown) => {
          filters.push({ column, value });
          const row = answer(column, value);
          const result = { data: row, error: row ? null : { message: 'no rows' } };
          return {
            single: async () => result,
            maybeSingle: async () => ({ data: row, error: null }),
          };
        },
      }),
    }),
    auth: {
      admin: {
        getUserById: jest.fn().mockResolvedValue({
          data: { user: { id: REAL_USER_ID, email: 'real@x.test' } },
          error: null,
        }),
      },
    },
  };
  return { client: client as unknown as SupabaseClient, filters };
}

describe('validatePreconditions — existing profile of the real user', () => {
  it('returns 409 when the account already has a profile, matched on user_id', async () => {
    const { client, filters } = mockClient({ realUserHasProfile: true });

    const result = await validatePreconditions(client, SHADOW_ID, REAL_USER_ID);

    expect(result.errorResponse?.status).toBe(409);
    expect(filters).toContainEqual({ column: 'user_id', value: REAL_USER_ID });
    expect(filters).not.toContainEqual({ column: 'id', value: REAL_USER_ID });
  });

  it('passes when the account has no profile yet', async () => {
    const { client } = mockClient({ realUserHasProfile: false });

    const result = await validatePreconditions(client, SHADOW_ID, REAL_USER_ID);

    expect(result.errorResponse).toBeUndefined();
    expect(result.realUserEmail).toBe('real@x.test');
    expect(result.shadowProfile?.id).toBe(SHADOW_ID);
  });
});
