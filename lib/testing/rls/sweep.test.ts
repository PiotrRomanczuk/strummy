import type { SupabaseClient, User } from '@supabase/supabase-js';

import { sweepRlsData } from './sweep';

const user = (email: string, createdAt: string, rlsRunId?: string): User =>
  ({ id: email, email, created_at: createdAt, user_metadata: { rlsRunId } }) as unknown as User;

function fakeService(users: User[], deleteError: string | null = null) {
  const deleted: string[] = [];
  const songQuery = {
    delete: () => songQuery,
    like: () => songQuery,
    lt: () => songQuery,
    select: async () => ({ data: [{ id: 's1' }], error: null }),
  };
  const service = {
    from: () => songQuery,
    auth: {
      admin: {
        listUsers: async () => ({ data: { users }, error: null }),
        deleteUser: async (id: string) => {
          if (deleteError) return { error: { message: deleteError } };
          deleted.push(id);
          return { error: null };
        },
      },
    },
  } as unknown as SupabaseClient;
  return { service, deleted };
}

const OLD = '2026-10-01T00:00:00Z';
const NEW = '2026-10-21T11:59:00Z';

describe('sweepRlsData', () => {
  it("deletes only this run's RLS users when scoped by run id", async () => {
    const { service, deleted } = fakeService([
      user('a@guitarcrm.local', NEW, 'run-1'),
      user('b@guitarcrm.local', NEW, 'run-2'),
      user('student@dev.local', NEW, 'run-1'),
    ]);
    const result = await sweepRlsData(service, { runId: 'run-1' });
    expect(deleted).toEqual(['a@guitarcrm.local']);
    expect(result).toEqual({ users: 1, songs: 1, errors: [] });
  });

  it('deletes stale RLS users of any run when scoped by age', async () => {
    const { service, deleted } = fakeService([
      user('old@guitarcrm.local', OLD),
      user('fresh@guitarcrm.local', NEW, 'run-9'),
    ]);
    await sweepRlsData(service, { olderThan: new Date('2026-10-21T10:00:00Z') });
    expect(deleted).toEqual(['old@guitarcrm.local']);
  });

  it('reports failed deletes instead of swallowing them', async () => {
    const { service } = fakeService([user('a@guitarcrm.local', NEW, 'run-1')], 'FK violation');
    const result = await sweepRlsData(service, { runId: 'run-1' });
    expect(result.users).toBe(0);
    expect(result.errors).toEqual(['deleteUser a@guitarcrm.local: FK violation']);
  });
});
