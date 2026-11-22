/**
 * @jest-environment node
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NextRequest } from 'next/server';

import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';

import { GET } from './route';

jest.mock('@/lib/getUserWithRolesSSR');

const mockGetUser = getUserWithRolesSSR as jest.MockedFunction<typeof getUserWithRolesSSR>;
const roles = { isTeacher: false, isStudent: false, isParent: false, isDevelopment: false };
const SHA1 = 'e'.repeat(40);

function call(sha1: string) {
  return GET(new NextRequest(`http://localhost/api/admin/lab/tabs/${sha1}/file`), {
    params: Promise.resolve({ sha1 }),
  });
}

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'lab-route-'));
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ version: 1, sources: [], counts: {} }));
  mkdirSync(join(dir, 'tabs', 'files', 'D'), { recursive: true });
  writeFileSync(
    join(dir, 'tabs', 'index.jsonl'),
    JSON.stringify({ sha1: SHA1, path: 'D/Demo - Song.gp5', roles: [], tunings: [], exercise: null })
  );
  writeFileSync(join(dir, 'tabs', 'files', 'D', 'Demo - Song.gp5'), Buffer.from([1, 2, 3]));
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

afterEach(() => {
  delete process.env.PRIVATE_DATA_DIR;
  jest.clearAllMocks();
});

describe('GET /api/admin/lab/tabs/[sha1]/file', () => {
  it('404s when the hub is not on this machine', async () => {
    expect((await call(SHA1)).status).toBe(404);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('refuses everyone but the admin', async () => {
    process.env.PRIVATE_DATA_DIR = dir;
    mockGetUser.mockResolvedValue({ user: { id: 'u' } as never, isAdmin: false, ...roles, isTeacher: true });
    expect((await call(SHA1)).status).toBe(403);
  });

  it('streams the file to the admin, and 404s for a sha1 outside the index', async () => {
    process.env.PRIVATE_DATA_DIR = dir;
    mockGetUser.mockResolvedValue({ user: { id: 'u' } as never, isAdmin: true, ...roles });
    const response = await call(SHA1);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/octet-stream');
    // jest.setup.js mocks next/server; its NextResponse keeps the body as given.
    expect([...(response as unknown as { _body: Uint8Array })._body]).toEqual([1, 2, 3]);
    expect((await call('0'.repeat(40))).status).toBe(404);
    expect((await call('..%2Fmanifest.json')).status).toBe(404);
  });
});
