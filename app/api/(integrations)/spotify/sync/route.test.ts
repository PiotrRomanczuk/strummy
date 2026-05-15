import { POST } from './route';
import { createClient } from '@/lib/supabase/server';
import { searchTracks } from '@/lib/spotify';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/spotify', () => ({
  searchTracks: jest.fn(),
}));

describe('Spotify Sync API', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
    select: jest.fn(),
    eq: jest.fn(),
    single: jest.fn(),
    is: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    // Setup chainable mocks
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.single.mockReturnValue(mockSupabase);
    mockSupabase.is.mockReturnValue(mockSupabase);
    mockSupabase.update.mockReturnValue(mockSupabase);
  });

  it('returns 401 if not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await POST(new NextRequest('http://localhost/api/spotify/sync', { method: 'POST' }));
    expect(res.status).toBe(401);
  });

  it('returns 403 if not admin or teacher', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user1' } }, error: null });
    mockSupabase.single.mockResolvedValue({
      data: { is_admin: false, is_teacher: false },
      error: null,
    });

    const res = await POST(new NextRequest('http://localhost/api/spotify/sync', { method: 'POST' }));
    expect(res.status).toBe(403);
  });

  it('syncs songs successfully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user1' } }, error: null });

    const profileBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
    };

    const songsBuilder = {
      select: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [
          { id: '1', title: 'Song 1', author: 'Artist 1' },
          { id: '2', title: 'Song 2', author: 'Artist 2' },
        ],
        error: null,
      }),
    };

    const updateBuilder = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };

    mockSupabase.from
      .mockReturnValueOnce(profileBuilder)
      .mockReturnValueOnce(songsBuilder)
      .mockReturnValue(updateBuilder);

    // Mock Spotify search
    (searchTracks as jest.Mock)
      .mockResolvedValueOnce({
        // For Song 1
        tracks: {
          items: [
            {
              external_urls: { spotify: 'https://spotify.com/track/1' },
              duration_ms: 200000,
              album: {
                release_date: '2023-01-01',
                images: [{ url: 'https://image.url/1' }],
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        // For Song 2 (no match)
        tracks: { items: [] },
      })
      .mockResolvedValueOnce({
        // For Song 2 (fallback no match)
        tracks: { items: [] },
      });

    const res = await POST(new NextRequest('http://localhost/api/spotify/sync', { method: 'POST' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.total).toBe(2);
    expect(data.updated).toBe(1);
    expect(data.skipped).toBe(1);
    expect(searchTracks).toHaveBeenCalledTimes(3);
    expect(updateBuilder.update).toHaveBeenCalledTimes(1);
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        cover_image_url: 'https://image.url/1',
      })
    );
  });
});
