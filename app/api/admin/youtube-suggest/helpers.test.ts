/**
 * @jest-environment node
 */

import { suggestYoutubeLinks } from './helpers';
import type { SupabaseClient } from '@supabase/supabase-js';

jest.mock('@/lib/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

function mockSupabase(songs: Array<{ id: string; title: string; author: string | null }>) {
  return {
    from: () => ({
      select: () => ({
        is: () => ({
          eq: () => ({
            or: () => ({
              limit: () => Promise.resolve({ data: songs, error: null }),
            }),
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe('suggestYoutubeLinks', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('returns candidates for each song missing youtube_url', async () => {
    const supabase = mockSupabase([{ id: 'song-1', title: 'Wonderwall', author: 'Oasis' }]);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: { videoId: 'abc123' },
            snippet: {
              title: 'Oasis - Wonderwall (Official Video)',
              channelTitle: 'Oasis',
              publishedAt: '2008-01-01T00:00:00Z',
              thumbnails: { medium: { url: 'https://example.com/thumb.jpg' } },
            },
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const result = await suggestYoutubeLinks(supabase, 25, 'test-api-key');

    expect(result.failed).toHaveLength(0);
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toMatchObject({
      songId: 'song-1',
      title: 'Wonderwall',
      author: 'Oasis',
    });
    expect(result.suggestions[0].candidates).toEqual([
      {
        videoId: 'abc123',
        title: 'Oasis - Wonderwall (Official Video)',
        channelTitle: 'Oasis',
        publishedAt: '2008-01-01T00:00:00Z',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        url: 'https://www.youtube.com/watch?v=abc123',
      },
    ]);

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('q=Wonderwall+Oasis+official');
  });

  it('collects per-song failures instead of throwing', async () => {
    const supabase = mockSupabase([{ id: 'song-2', title: 'Broken Song', author: null }]);

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'quota exceeded',
    }) as unknown as typeof fetch;

    const result = await suggestYoutubeLinks(supabase, 25, 'test-api-key');

    expect(result.suggestions).toHaveLength(0);
    expect(result.failed).toEqual([
      { songId: 'song-2', error: expect.stringContaining('403') },
    ]);
  });

  it('returns an empty result when no songs are missing youtube_url', async () => {
    const supabase = mockSupabase([]);
    global.fetch = jest.fn();

    const result = await suggestYoutubeLinks(supabase, 25, 'test-api-key');

    expect(result.suggestions).toEqual([]);
    expect(result.failed).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
