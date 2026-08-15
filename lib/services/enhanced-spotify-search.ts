/**
 * Enhanced Spotify Search Service
 *
 * Integrates AI-powered song matching with Spotify API for better recognition
 * of poor quality database entries.
 */

import { searchTracks } from '@/lib/spotify';
import {
  analyzeAndNormalizeSong,
  generateSearchQueries,
  scoreMatch,
  type SongMatchResult,
  type SpotifyTrack,
} from './ai-song-matching';
import type { Database } from '@/types/database.types';
import { logger } from '@/lib/logger';

type DatabaseSong = Database['public']['Tables']['songs']['Row'];

export interface EnhancedSearchOptions {
  maxQueries?: number;
  minConfidenceScore?: number;
  includePartialMatches?: boolean;
  enableAIAnalysis?: boolean;
}

export interface SearchResult {
  song: DatabaseSong;
  match: SongMatchResult;
  executionTime: number;
  queriesUsed: number;
}

/**
 * Enhanced search that combines AI analysis with multiple search strategies
 */
export async function searchSongWithAI(
  song: DatabaseSong,
  options: EnhancedSearchOptions = {}
): Promise<SearchResult> {
  const startTime = Date.now();

  const {
    maxQueries = 8,
    minConfidenceScore = 70,
    includePartialMatches: _includePartialMatches = true,
    enableAIAnalysis = true,
  } = options;

  let queriesUsed = 0;
  let bestMatch: SongMatchResult | null = null;

  try {
    // Step 1: AI Analysis (if enabled)
    let analysis = null;
    if (enableAIAnalysis) {
      analysis = await analyzeAndNormalizeSong(song);
    }

    // Step 2: Generate search queries
    let queries: string[] = [];

    if (analysis) {
      queries = generateSearchQueries(analysis);
    } else {
      // Fallback to simple queries if AI is disabled
      queries = [
        `track:"${song.title}" artist:"${song.author}"`,
        `${song.title} ${song.author}`,
        `"${song.title}"`,
        `artist:"${song.author}"`,
      ];
    }

    // Step 3: Execute searches with early termination on good matches
    for (let i = 0; i < Math.min(queries.length, maxQueries); i++) {
      const query = queries[i];
      queriesUsed++;

      try {
        const searchData = await searchTracks(query) as { tracks?: { items?: SpotifyTrack[] } } | null;

        if (searchData?.tracks?.items && searchData.tracks.items.length > 0) {
          // Score all tracks from this search
          const scoredTracks = searchData.tracks.items.map((track: SpotifyTrack) => {
            const score = analysis
              ? scoreMatch(song, track, analysis)
              : calculateSimpleScore(song, track);

            return {
              track,
              score,
              query,
            };
          });

          // Sort by score
          scoredTracks.sort((a, b) => b.score - a.score);

          const topTrack = scoredTracks[0];

          // Update best match if this is better
          if (!bestMatch || topTrack.score > bestMatch.confidence) {
            bestMatch = {
              confidence: topTrack.score,
              found: true,
              spotifyTrack: topTrack.track,
              searchQuery: query,
              reason: `Found via query: ${query}`,
              reasoning: `Found via query: ${query}`,
              suggestions: scoredTracks
                .slice(1, 3)
                .map((t) => `${t.track.name} by ${t.track.artists[0]?.name} (${t.score}%)`),
            };
          }

          // Early termination if we found a high-confidence match
          if (topTrack.score >= minConfidenceScore) {
            break;
          }
        }

        // Rate limiting delay
        await new Promise((resolve) => setTimeout(resolve, 150));
      } catch (error) {
        logger.error(`❌ Error executing query "${query}":`, error);
        continue;
      }
    }

    // Step 4: Return result
    const executionTime = Date.now() - startTime;

    if (!bestMatch) {
      return {
        song,
        match: {
          confidence: 0,
          found: false,
          track: undefined,
          searchQuery: queries[0] || `${song.title} ${song.author}`,
          reasoning: 'No matches found in Spotify',
          suggestions: [],
        },
        executionTime,
        queriesUsed,
      };
    }

    // Add execution metadata to the match
    bestMatch.reason += ` (${queriesUsed} queries in ${executionTime}ms)`;

    return {
      song,
      match: {
        confidence: bestMatch.confidence,
        found: true,
        track: bestMatch.spotifyTrack,
        searchQuery: bestMatch.searchQuery,
        reasoning: bestMatch.reason || bestMatch.reasoning,
        suggestions: bestMatch.suggestions,
      },
      executionTime,
      queriesUsed,
    };
  } catch (error) {
    logger.error('Enhanced search error:', error);

    return {
      song,
      match: {
        confidence: 0,
        found: false,
        track: undefined,
        searchQuery: `${song.title} ${song.author}`,
        reasoning: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestions: [],
      },
      executionTime: Date.now() - startTime,
      queriesUsed,
    };
  }
}

/**
 * Batch search multiple songs with progress tracking
 */
export async function searchSongsWithAI(
  songs: DatabaseSong[],
  options: EnhancedSearchOptions = {},
  onProgress?: (progress: { completed: number; total: number; current?: SearchResult }) => void
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];

    const result = await searchSongWithAI(song, options);
    results.push(result);

    // Report progress
    if (onProgress) {
      onProgress({
        completed: i + 1,
        total: songs.length,
        current: result,
      });
    }

    // Longer delay between songs to be nice to APIs
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return results;
}

/**
 * Simple scoring function for when AI analysis is disabled
 */
function calculateSimpleScore(song: DatabaseSong, spotifyTrack: SpotifyTrack): number {
  const titleSimilarity = calculateSimilarity(song.title, spotifyTrack.name);
  const artistSimilarity = calculateSimilarity(
    song.author || '',
    spotifyTrack.artists.map((a) => a.name).join(' ')
  );

  // Weight title more heavily than artist
  return Math.round(titleSimilarity * 0.6 + artistSimilarity * 0.3 + spotifyTrack.popularity * 0.1);
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '');
  const a = normalize(str1);
  const b = normalize(str2);

  if (a === b) return 100;

  const matrix: number[][] = [];
  const len1 = a.length;
  const len2 = b.length;

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (a.charAt(i - 1) === b.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }

  const maxLength = Math.max(len1, len2);
  const similarity = maxLength === 0 ? 100 : ((maxLength - matrix[len1][len2]) / maxLength) * 100;

  return Math.round(similarity);
}

/**
 * Create a detailed match report for debugging
 */
export function generateMatchReport(results: SearchResult[]): string {
  const successful = results.filter((r) => r.match.confidence >= 70);
  const partial = results.filter((r) => r.match.confidence >= 40 && r.match.confidence < 70);
  const failed = results.filter((r) => r.match.confidence < 40);

  let report = `# AI-Enhanced Spotify Matching Report\n\n`;

  report += `## Summary\n`;
  report += `- **Total songs processed**: ${results.length}\n`;
  report += `- **High confidence matches (≥70%)**: ${successful.length} (${Math.round(
    (successful.length / results.length) * 100
  )}%)\n`;
  report += `- **Partial matches (40-69%)**: ${partial.length} (${Math.round(
    (partial.length / results.length) * 100
  )}%)\n`;
  report += `- **Failed matches (<40%)**: ${failed.length} (${Math.round(
    (failed.length / results.length) * 100
  )}%)\n\n`;

  if (successful.length > 0) {
    report += `## ✅ High Confidence Matches\n`;
    successful.forEach((result) => {
      const match = result.match;
      report += `### "${result.song.title}" by "${result.song.author}"\n`;
      report += `- **Found**: ${match.spotifyTrack?.name} by ${match.spotifyTrack?.artists[0]?.name}\n`;
      report += `- **Confidence**: ${match.confidence}%\n`;
      report += `- **Search Query**: ${match.searchQuery}\n`;
      report += `- **Reason**: ${match.reason}\n\n`;
    });
  }

  if (failed.length > 0) {
    report += `## ❌ Failed Matches (Need Manual Review)\n`;
    failed.forEach((result) => {
      report += `### "${result.song.title}" by "${result.song.author}"\n`;
      report += `- **Confidence**: ${result.match.confidence}%\n`;
      report += `- **Reason**: ${result.match.reason}\n`;
      if (result.match.suggestions && result.match.suggestions.length > 0) {
        report += `- **Suggestions**: ${result.match.suggestions.join(', ')}\n`;
      }
      report += `\n`;
    });
  }

  return report;
}
