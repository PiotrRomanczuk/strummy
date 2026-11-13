/**
 * @jest-environment node
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NextRequest } from 'next/server';

import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';

import { GET } from './route';

jest.mock('@/lib/getUserWithRolesSSR');

const mockGetUser = getUserWithRolesSSR as jest.MockedFunction<typeof getUserWithRolesSSR>;
const roles = { isTeacher: false, isStudent: false, isParent: false, isDevelopment: false };

function call(path: string[]) {
  return GET(new NextRequest(`http://localhost/api/admin/lab/alphatab/${path.join('/')}`), {
    params: Promise.resolve({ path }),
  });
}

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'lab-assets-'));
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ version: 1, sources: [], counts: {} }));
  process.env.PRIVATE_DATA_DIR = dir;
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.PRIVATE_DATA_DIR;
});

describe('GET /api/admin/lab/alphatab/[...path]', () => {
  it('refuses a student', async () => {
    mockGetUser.mockResolvedValue({ user: { id: 'u' } as never, isAdmin: false, ...roles, isStudent: true });
    expect((await call(['font', 'Bravura.woff2'])).status).toBe(403);
  });

  it('serves only the listed font and soundfont files', async () => {
    mockGetUser.mockResolvedValue({ user: { id: 'u' } as never, isAdmin: true, ...roles });
    const font = await call(['font', 'Bravura.woff2']);
    expect(font.status).toBe(200);
    expect(font.headers.get('Content-Type')).toBe('font/woff2');
    expect((await call(['..', '..', 'package.json'])).status).toBe(404);
    expect((await call(['alphaTab.mjs'])).status).toBe(404);
  });
});
