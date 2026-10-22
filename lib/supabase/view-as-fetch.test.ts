/**
 * @jest-environment node
 */
import { isDataWrite, viewAsGuardedFetch } from './view-as-fetch';

const REST = 'http://db.test/rest/v1/practice_sessions';

describe('isDataWrite', () => {
  it.each(['POST', 'PATCH', 'PUT', 'DELETE', 'post'])(
    'treats %s to the REST API as a write',
    (method) => {
      expect(isDataWrite(REST, { method })).toBe(true);
    }
  );

  it('treats RPC calls and storage uploads as writes', () => {
    expect(
      isDataWrite('http://db.test/rest/v1/rpc/student_toggle_checklist_item', { method: 'POST' })
    ).toBe(true);
    expect(
      isDataWrite(new URL('http://db.test/storage/v1/object/avatars/a.png'), { method: 'PUT' })
    ).toBe(true);
  });

  it('lets reads and auth calls through', () => {
    expect(isDataWrite(REST)).toBe(false);
    expect(isDataWrite(REST, { method: 'GET' })).toBe(false);
    expect(isDataWrite(REST, { method: 'HEAD' })).toBe(false);
    expect(
      isDataWrite('http://db.test/auth/v1/token?grant_type=refresh_token', { method: 'POST' })
    ).toBe(false);
  });

  it('reads the method from a Request object', () => {
    expect(isDataWrite(new Request(REST, { method: 'DELETE' }))).toBe(true);
  });
});

describe('viewAsGuardedFetch', () => {
  const realFetch = global.fetch;
  const fetchMock = jest.fn().mockResolvedValue(new Response('[]'));

  beforeEach(() => {
    fetchMock.mockClear();
    global.fetch = fetchMock;
  });
  afterAll(() => {
    global.fetch = realFetch;
  });

  it('refuses a write while viewing as a student, without reaching the database', async () => {
    const res = await viewAsGuardedFetch(() => true)(REST, { method: 'POST', body: '{}' });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'VIEW_AS_READ_ONLY' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('passes reads through while viewing as a student', async () => {
    await viewAsGuardedFetch(() => true)(REST, { method: 'GET' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('passes writes through outside a preview, without checking the cookie for reads', async () => {
    const isViewingAs = jest.fn().mockResolvedValue(false);
    const guarded = viewAsGuardedFetch(isViewingAs);
    await guarded(REST, { method: 'PATCH' });
    await guarded(REST);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(isViewingAs).toHaveBeenCalledTimes(1);
  });
});
