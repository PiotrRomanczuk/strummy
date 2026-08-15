import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const SEARCH_ENDPOINT = 'https://www.googleapis.com/youtube/v3/search';

export interface YoutubeCandidate {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string | null;
  url: string;
}

export interface YoutubeSuggestion {
  songId: string;
  title: string;
  author: string | null;
  candidates: YoutubeCandidate[];
}

async function searchVideos(query: string, apiKey: string): Promise<YoutubeCandidate[]> {
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: '3',
    videoEmbeddable: 'true',
    key: apiKey,
  });

  const response = await fetch(`${SEARCH_ENDPOINT}?${params.toString()}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`YouTube search failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    items?: Array<{
      id: { videoId: string };
      snippet: {
        title: string;
        channelTitle: string;
        publishedAt: string;
        thumbnails?: { medium?: { url: string } };
      };
    }>;
  };

  return (data.items ?? []).map((item) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? null,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  }));
}

/**
 * Suggests YouTube candidates for songs missing youtube_url. Read-only against
 * `songs` — never writes youtube_url itself, since cover vs. official-video
 * accuracy matters for a teaching product and needs a human pick.
 */
export async function suggestYoutubeLinks(
  supabase: SupabaseClient,
  batchSize: number,
  apiKey: string
): Promise<{ suggestions: YoutubeSuggestion[]; failed: Array<{ songId: string; error: string }> }> {
  const { data: songs } = await supabase
    .from('songs')
    .select('id, title, author')
    .is('deleted_at', null)
    .eq('is_draft', false)
    .or('youtube_url.is.null,youtube_url.eq.')
    .limit(batchSize);

  const suggestions: YoutubeSuggestion[] = [];
  const failed: Array<{ songId: string; error: string }> = [];

  for (const song of songs ?? []) {
    const query = [song.title, song.author, 'official'].filter(Boolean).join(' ');
    try {
      const candidates = await searchVideos(query, apiKey);
      suggestions.push({ songId: song.id, title: song.title, author: song.author, candidates });
    } catch (err) {
      const message = (err as Error).message;
      failed.push({ songId: song.id, error: message });
      logger.warn('[YoutubeSuggest] search error: ' + message);
    }
  }

  return { suggestions, failed };
}
