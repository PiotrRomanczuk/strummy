/**
 * @jest-environment node
 */
import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock global fetch
global.fetch = jest.fn();

describe('Spotify Features API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if no id is provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/spotify/features');
    const response = await GET(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Query parameter "id" is required');
  });

  it('should return audio features', async () => {
    const mockTokenResponse = {
      access_token: 'mock-token',
      token_type: 'Bearer',
      expires_in: 3600,
    };

    const mockFeaturesResponse = {
      key: 2,
      mode: 1,
      tempo: 174.3,
      time_signature: 4,
      duration_ms: 258000,
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFeaturesResponse,
      });

    const req = new NextRequest('http://localhost:3000/api/spotify/features?id=track1');
    const response = await GET(req);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data).toEqual({
      key: 2,
      mode: 1,
      tempo: 174.3,
      time_signature: 4,
      duration_ms: 258000,
    });
  });

  it('should handle Spotify API errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Spotify API Error'));

    const req = new NextRequest('http://localhost:3000/api/spotify/features?id=track1');
    const response = await GET(req);
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal Server Error');
  });
});
