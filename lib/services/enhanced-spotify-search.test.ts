/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit Tests for Enhanced Spotify Search Service
 *
 * Tests AI-enhanced song matching with Spotify API integration
 */

import {
  searchSongWithAI,
  searchSongsWithAI,
  type EnhancedSearchOptions,
} from '@/lib/services/enhanced-spotify-search';
import { searchTracks } from '@/lib/spotify';
import {
  analyzeAndNormalizeSong,
  generateSearchQueries,
  scoreMatch,
} from '@/lib/services/ai-song-matching';
import type { Database } from '@/types/database.types';

type DatabaseSong = Database['public']['Tables']['songs']['Row'];

// Mock dependencies
jest.mock('@/lib/spotify');
jest.mock('@/lib/services/ai-song-matching');

describe('Enhanced Spotify Search Service', () => {
  // Mock song: "Dust in the Wind" by Kansas
  const mockSong: DatabaseSong = {
    id: 'song-123',
    title: 'Dust in the Wind',
    author: 'Kansas',
    level: 'intermediate',
    key: 'C',
    ultimate_guitar_link: 'https://www.ultimate-guitar.com/tab/kansas/dust-in-the-wind-tabs-123',
    spotify_link_url: null,
    cover_image_url: null,
    release_year: null,
    duration_ms: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    deleted_at: null,
  } as any;

  // Mock Spotify track response
  const mockSpotifyTrack = {
    id: '2takcwOaAZWiXQijPHIx7B',
    name: 'Dust in the Wind',
    artists: [{ name: 'Kansas', id: 'artist-123' }],
    album: {
      name: 'Point of Know Return',
      release_date: '1977-10-11',
      images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273dust-in-wind.jpg' }],
    },
    duration_ms: 207000,
    external_urls: {
      spotify: 'https://open.spotify.com/track/2takcwOaAZWiXQijPHIx7B',
    },
    popularity: 75,
  };

  // Mock AI analysis response
  const mockAIAnalysis = {
    normalizedTitle: 'dust in the wind',
    normalizedArtist: 'kansas',
    confidence: 95,
    reasoning: 'Classic rock song with clear title and artist',
    suggestedAlternatives: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('searchSongWithAI', () => {
    it('should find a high-confidence match for "Dust in the Wind"', async () => {
      // Mock AI analysis
      (analyzeAndNormalizeSong as jest.Mock).mockResolvedValue(mockAIAnalysis);
      (generateSearchQueries as jest.Mock).mockReturnValue([
        'track:"Dust in the Wind" artist:"Kansas"',
        'Dust in the Wind Kansas',
        '"Dust in the Wind"',
      ]);
      (scoreMatch as jest.Mock).mockReturnValue(95);

      // Mock Spotify search
      (searchTracks as jest.Mock).mockResolvedValue({
        tracks: {
          items: [mockSpotifyTrack],
        },
      });

      const options: EnhancedSearchOptions = {
        maxQueries: 8,
        minConfidenceScore: 70,
        enableAIAnalysis: true,
      };

      const promise = searchSongWithAI(mockSong, options);

      // Fast-forward timers for rate limiting delays
      await jest.runOnlyPendingTimersAsync();

      const result = await promise;

      expect(result.song).toEqual(mockSong);
      expect(result.match.found).toBe(true);
      expect(result.match.confidence).toBe(95);
      expect(result.match.track).toEqual(mockSpotifyTrack);
      expect(result.queriesUsed).toBeGreaterThan(0);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);

      // Verify AI was called
      expect(analyzeAndNormalizeSong).toHaveBeenCalledWith(mockSong);
      expect(generateSearchQueries).toHaveBeenCalledWith(mockAIAnalysis);
    });

    it('should handle no matches found', async () => {
      (analyzeAndNormalizeSong as jest.Mock).mockResolvedValue(mockAIAnalysis);
      (generateSearchQueries as jest.Mock).mockReturnValue([
        'track:"Dust in the Wind" artist:"Kansas"',
      ]);

      // Mock empty Spotify response
      (searchTracks as jest.Mock).mockResolvedValue({
        tracks: {
          items: [],
        },
      });

      const options: EnhancedSearchOptions = {
        maxQueries: 3,
        minConfidenceScore: 70,
        enableAIAnalysis: true,
      };

      const promise = searchSongWithAI(mockSong, options);
      await jest.runOnlyPendingTimersAsync();
      const result = await promise;

      expect(result.match.found).toBe(false);
      expect(result.match.confidence).toBe(0);
      expect(result.match.track).toBeUndefined();
      expect(result.match.reasoning).toContain('No matches found');
    });

    it('should work without AI analysis (fallback mode)', async () => {
      // Mock Spotify search
      (searchTracks as jest.Mock).mockResolvedValue({
        tracks: {
          items: [mockSpotifyTrack],
        },
      });

      const options: EnhancedSearchOptions = {
        maxQueries: 4,
        minConfidenceScore: 50,
        enableAIAnalysis: false,
      };

      const promise = searchSongWithAI(mockSong, options);
      await jest.runOnlyPendingTimersAsync();
      const result = await promise;

      expect(result.match.found).toBe(true);
      expect(analyzeAndNormalizeSong).not.toHaveBeenCalled();
      expect(searchTracks).toHaveBeenCalled();
    });

    it('should respect maxQueries limit', async () => {
      (analyzeAndNormalizeSong as jest.Mock).mockResolvedValue(mockAIAnalysis);
      (generateSearchQueries as jest.Mock).mockReturnValue([
        'query1',
        'query2',
        'query3',
        'query4',
        'query5',
        'query6',
        'query7',
        'query8',
      ]);
      (scoreMatch as jest.Mock).mockReturnValue(50); // Low score to prevent early termination

      // Mock Spotify search with low-confidence results
      (searchTracks as jest.Mock).mockResolvedValue({
        tracks: {
          items: [mockSpotifyTrack],
        },
      });

      const options: EnhancedSearchOptions = {
        maxQueries: 3,
        minConfidenceScore: 70,
        enableAIAnalysis: true,
      };

      const promise = searchSongWithAI(mockSong, options);

      // Run all timers (150ms delays for each query)
      await jest.runAllTimersAsync();

      const result = await promise;

      expect(result.queriesUsed).toBeLessThanOrEqual(3);
      expect(searchTracks).toHaveBeenCalledTimes(3);
    });

    it('should terminate early on high-confidence match', async () => {
      (analyzeAndNormalizeSong as jest.Mock).mockResolvedValue(mockAIAnalysis);
      (generateSearchQueries as jest.Mock).mockReturnValue([
        'query1',
        'query2',
        'query3',
        'query4',
      ]);
      (scoreMatch as jest.Mock).mockReturnValue(95); // High score

      (searchTracks as jest.Mock).mockResolvedValue({
        tracks: {
          items: [mockSpotifyTrack],
        },
      });

      const options: EnhancedSearchOptions = {
        maxQueries: 8,
        minConfidenceScore: 70,
        enableAIAnalysis: true,
      };

      const promise = searchSongWithAI(mockSong, options);
      await jest.runOnlyPendingTimersAsync();
      const result = await promise;

      // Should stop after first query since confidence >= minConfidenceScore
      expect(result.queriesUsed).toBe(1);
      expect(searchTracks).toHaveBeenCalledTimes(1);
    });

    it('should handle Spotify API errors gracefully', async () => {
      (analyzeAndNormalizeSong as jest.Mock).mockResolvedValue(mockAIAnalysis);
      (generateSearchQueries as jest.Mock).mockReturnValue(['query1', 'query2', 'query3']);

      // Mock Spotify API error - all queries fail
      (searchTracks as jest.Mock).mockRejectedValue(new Error('Spotify API rate limit exceeded'));

      const options: EnhancedSearchOptions = {
        maxQueries: 3,
        enableAIAnalysis: true,
      };

      const promise = searchSongWithAI(mockSong, options);
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result.match.found).toBe(false);
      expect(result.match.reasoning).toContain('No matches found');
      expect(result.queriesUsed).toBe(3); // All queries attempted despite errors
    });

    it('should select best match from multiple results', async () => {
      const lowerScoreTrack = {
        ...mockSpotifyTrack,
        id: 'lower-score-track',
        name: 'Dust in the Wind (Live)',
      };

      (analyzeAndNormalizeSong as jest.Mock).mockResolvedValue(mockAIAnalysis);
      (generateSearchQueries as jest.Mock).mockReturnValue(['query1', 'query2']);

      // First query returns low-score match
      (scoreMatch as jest.Mock).mockReturnValueOnce(60);
      (searchTracks as jest.Mock).mockResolvedValueOnce({
        tracks: {
          items: [lowerScoreTrack],
        },
      });

      // Second query returns high-score match
      (scoreMatch as jest.Mock).mockReturnValueOnce(95);
      (searchTracks as jest.Mock).mockResolvedValueOnce({
        tracks: {
          items: [mockSpotifyTrack],
        },
      });

      const options: EnhancedSearchOptions = {
        maxQueries: 8,
        minConfidenceScore: 70,
        enableAIAnalysis: true,
      };

      const promise = searchSongWithAI(mockSong, options);
      await jest.runOnlyPendingTimersAsync();
      const result = await promise;

      expect(result.match.confidence).toBe(95);
      expect(result.match.track?.id).toBe(mockSpotifyTrack.id);
    });
  });

  describe('searchSongsWithAI (batch processing)', () => {
    const mockSongs: DatabaseSong[] = [
      mockSong,
      {
        ...mockSong,
        id: 'song-124',
        title: 'Carry On Wayward Son',
        author: 'Kansas',
      },
      {
        ...mockSong,
        id: 'song-125',
        title: 'Bohemian Rhapsody',
        author: 'Queen',
      },
    ];

    it('should process multiple songs with progress tracking', async () => {
      (analyzeAndNormalizeSong as jest.Mock).mockResolvedValue(mockAIAnalysis);
      (generateSearchQueries as jest.Mock).mockReturnValue(['query1']);
      (scoreMatch as jest.Mock).mockReturnValue(90);

      (searchTracks as jest.Mock).mockResolvedValue({
        tracks: {
          items: [mockSpotifyTrack],
        },
      });

      const progressCallback = jest.fn();
      const options: EnhancedSearchOptions = {
        maxQueries: 3,
        minConfidenceScore: 70,
        enableAIAnalysis: true,
      };

      const promise = searchSongsWithAI(mockSongs, options, progressCallback);
      await jest.runAllTimersAsync();
      const results = await promise;

      expect(results).toHaveLength(3);
      expect(progressCallback).toHaveBeenCalledTimes(3);
      expect(progressCallback).toHaveBeenCalledWith({
        completed: 1,
        total: 3,
        current: expect.objectContaining({
          song: mockSongs[0],
        }),
      });
    });

    it('should calculate correct batch statistics', async () => {
      (analyzeAndNormalizeSong as jest.Mock).mockResolvedValue(mockAIAnalysis);
      (generateSearchQueries as jest.Mock).mockReturnValue(['query1']);
      (scoreMatch as jest.Mock).mockReturnValue(85);

      (searchTracks as jest.Mock).mockResolvedValue({
        tracks: {
          items: [mockSpotifyTrack],
        },
      });

      const options: EnhancedSearchOptions = {
        maxQueries: 3,
        minConfidenceScore: 70,
        enableAIAnalysis: true,
      };

      const promise = searchSongsWithAI(mockSongs, options);
      await jest.runAllTimersAsync();
      const results = await promise;

      const totalQueries = results.reduce((sum, r) => sum + r.queriesUsed, 0);
      const successfulMatches = results.filter((r) => r.match.confidence >= 70).length;

      expect(totalQueries).toBeGreaterThan(0);
      expect(successfulMatches).toBe(3); // All should succeed with 85% confidence
    });

    it('should handle mixed success and failure results', async () => {
      (analyzeAndNormalizeSong as jest.Mock).mockResolvedValue(mockAIAnalysis);
      (generateSearchQueries as jest.Mock).mockReturnValue(['query1']);

      // Mock different responses for each song
      (scoreMatch as jest.Mock)
        .mockReturnValueOnce(90) // Song 1: Success
        .mockReturnValueOnce(50) // Song 2: Low confidence
        .mockReturnValueOnce(85); // Song 3: Success

      (searchTracks as jest.Mock)
        .mockResolvedValueOnce({ tracks: { items: [mockSpotifyTrack] } })
        .mockResolvedValueOnce({ tracks: { items: [mockSpotifyTrack] } })
        .mockResolvedValueOnce({ tracks: { items: [mockSpotifyTrack] } });

      const options: EnhancedSearchOptions = {
        maxQueries: 3,
        minConfidenceScore: 70,
        enableAIAnalysis: true,
      };

      const promise = searchSongsWithAI(mockSongs, options);
      await jest.runAllTimersAsync();
      const results = await promise;

      const successful = results.filter((r) => r.match.confidence >= 70);
      const unsuccessful = results.filter((r) => r.match.confidence < 70);

      expect(successful).toHaveLength(2);
      expect(unsuccessful).toHaveLength(1);
    });

    it('should apply rate limiting between songs', async () => {
      (analyzeAndNormalizeSong as jest.Mock).mockResolvedValue(mockAIAnalysis);
      (generateSearchQueries as jest.Mock).mockReturnValue(['query1']);
      (scoreMatch as jest.Mock).mockReturnValue(90);

      (searchTracks as jest.Mock).mockResolvedValue({
        tracks: {
          items: [mockSpotifyTrack],
        },
      });

      const options: EnhancedSearchOptions = {
        maxQueries: 1,
        enableAIAnalysis: true,
      };

      const promise = searchSongsWithAI(mockSongs, options);

      // Verify that setTimeout is called for rate limiting (300ms between songs)
      await jest.runAllTimersAsync();
      await promise;

      // Should have delays: 150ms per query + 300ms between songs
      // Total timers: 3 songs * (1 query delay + 1 song delay) = 6 timers
      expect(jest.getTimerCount()).toBe(0); // All timers should be consumed
    });
  });
});
