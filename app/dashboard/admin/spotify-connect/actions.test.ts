/**
 * @jest-environment node
 */
import { cookies } from 'next/headers';

import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { consumeSpotifyRefreshToken } from './actions';

jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('@/lib/getUserWithRolesSSR', () => ({ getUserWithRolesSSR: jest.fn() }));

describe('consumeSpotifyRefreshToken', () => {
  const store = { get: jest.fn(), delete: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (cookies as jest.Mock).mockResolvedValue(store);
    (getUserWithRolesSSR as jest.Mock).mockResolvedValue({ isAdmin: true });
  });

  it('returns the token once and deletes the cookie', async () => {
    store.get.mockReturnValue({ name: 'spotify_refresh_token_once', value: 'tok' });

    await expect(consumeSpotifyRefreshToken()).resolves.toBe('tok');
    expect(store.delete).toHaveBeenCalledWith({
      name: 'spotify_refresh_token_once',
      path: '/dashboard/admin/spotify-connect',
    });
  });

  it('returns null and deletes nothing when there is no cookie', async () => {
    store.get.mockReturnValue(undefined);

    await expect(consumeSpotifyRefreshToken()).resolves.toBeNull();
    expect(store.delete).not.toHaveBeenCalled();
  });

  it('never reads or deletes the cookie for a non-admin', async () => {
    (getUserWithRolesSSR as jest.Mock).mockResolvedValue({ isAdmin: false });

    await expect(consumeSpotifyRefreshToken()).resolves.toBeNull();
    expect(cookies).not.toHaveBeenCalled();
    expect(store.delete).not.toHaveBeenCalled();
  });
});
