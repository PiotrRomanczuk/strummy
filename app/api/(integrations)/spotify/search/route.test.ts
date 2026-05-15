/**
 * @jest-environment node
 */
import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock global fetch
global.fetch = jest.fn();

describe('Spotify Search API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if no query is provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/spotify/search');
    const response = await GET(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Query parameter "q" is required');
  });

  it('should return mapped tracks', async () => {
    const mockTokenResponse = {
      access_token: 'mock-token',
      token_type: 'Bearer',
      expires_in: 3600,
    };

    const mockSearchResponse = {
      tracks: {
        items: [
          {
            id: 'track1',
            name: 'Wonderwall',
            artists: [{ name: 'Oasis' }],
            album: {
              name: "(What's The Story) Morning Glory?",
              release_date: '1995-10-02',
              images: [{ url: 'image-url' }],
            },
            external_urls: { spotify: 'spotify-url' },
            duration_ms: 258000,
          },
        ],
      },
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResponse,
      });

    const req = new NextRequest('http://localhost:3000/api/spotify/search?q=Wonderwall');
    const response = await GET(req);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.results).toHaveLength(1);
    expect(data.results[0]).toEqual({
      id: 'track1',
      name: 'Wonderwall',
      artist: 'Oasis',
      album: "(What's The Story) Morning Glory?",
      url: 'spotify-url',
      coverUrl: 'image-url',
      duration_ms: 258000,
      release_date: '1995-10-02',
    });
  });

  it('should handle Spotify API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Spotify API Error'));

    const req = new NextRequest('http://localhost:3000/api/spotify/search?q=Wonderwall');
    const response = await GET(req);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal Server Error');
  });
});
