/**
 * @jest-environment node
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { notFound, redirect } from 'next/navigation';

import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';

import { requireLabAdmin } from './access';
import { isPrivateDataAvailable } from './config';
import { getSource, loadManifest } from './manifest';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: jest.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  }),
}));
jest.mock('@/lib/getUserWithRolesSSR');

const mockGetUser = getUserWithRolesSSR as jest.MockedFunction<typeof getUserWithRolesSSR>;
const roles = { isTeacher: false, isStudent: false, isParent: false, isDevelopment: false };
const MANIFEST = { version: 1, built: '2026-11-13T21:00', counts: {}, sources: [{ id: 'scan-list' }] };

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'lab-hub-'));
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(MANIFEST));
  process.env.PRIVATE_DATA_DIR = dir;
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.PRIVATE_DATA_DIR;
  jest.clearAllMocks();
});

describe('private data availability', () => {
  it('is off without PRIVATE_DATA_DIR (every deployed environment)', () => {
    delete process.env.PRIVATE_DATA_DIR;
    expect(isPrivateDataAvailable()).toBe(false);
    expect(loadManifest()).toBeNull();
  });

  it('is off when the folder has no manifest', () => {
    process.env.PRIVATE_DATA_DIR = join(dir, 'missing');
    expect(isPrivateDataAvailable()).toBe(false);
  });

  it('finds sources by id only', () => {
    expect(getSource('scan-list')).toMatchObject({ id: 'scan-list' });
    expect(getSource('../../etc/passwd')).toBeNull();
  });
});

describe('requireLabAdmin', () => {
  it('404s when the hub is not on this machine, before asking who is signed in', async () => {
    delete process.env.PRIVATE_DATA_DIR;
    await expect(requireLabAdmin('/dashboard/admin/lab')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('sends a signed-out visitor to sign-in', async () => {
    mockGetUser.mockResolvedValue({ user: null, isAdmin: false, ...roles });
    await expect(requireLabAdmin('/dashboard/admin/lab')).rejects.toThrow(
      'NEXT_REDIRECT /sign-in?redirect=%2Fdashboard%2Fadmin%2Flab'
    );
  });

  it('sends a teacher or student home', async () => {
    mockGetUser.mockResolvedValue({ user: { id: 'u1' } as never, isAdmin: false, ...roles, isTeacher: true });
    await expect(requireLabAdmin('/dashboard/admin/lab')).rejects.toThrow('NEXT_REDIRECT /dashboard');
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });

  it('lets the admin through', async () => {
    mockGetUser.mockResolvedValue({ user: { id: 'u1' } as never, isAdmin: true, ...roles });
    await expect(requireLabAdmin('/dashboard/admin/lab')).resolves.toBeUndefined();
  });
});
