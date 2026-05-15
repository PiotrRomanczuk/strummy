import { NextResponse } from 'next/server';
import { searchTracks, searchArtists } from '@/lib/spotify';
import { SpotifyApiTrack, SpotifyApiArtist } from '@/types/spotify';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  // Require authenticated user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  const type = searchParams.get('type') || 'track';

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    if (type === 'artist') {
      const data = await searchArtists(query) as {
        error?: { message: string; status: number };
        artists: { items: SpotifyApiArtist[] };
      };

      if (data.error) {
        return NextResponse.json({ error: data.error.message }, { status: data.error.status });
      }

      const results = data.artists.items.map((artist: SpotifyApiArtist) => ({
        id: artist.id,
        name: artist.name,
        image: artist.images[0]?.url,
        popularity: artist.popularity,
        genres: artist.genres,
        url: artist.external_urls.spotify,
      }));

      return NextResponse.json({ results });
    } else {
      const data = await searchTracks(query) as {
        error?: { message: string; status: number };
        tracks: { items: SpotifyApiTrack[] };
      };

      if (data.error) {
        return NextResponse.json({ error: data.error.message }, { status: data.error.status });
      }

      const results = data.tracks.items.map((track: SpotifyApiTrack) => ({
        id: track.id,
        name: track.name,
        artist: track.artists[0].name,
        album: track.album.name,
        url: track.external_urls.spotify,
        coverUrl: track.album.images[0]?.url,
        duration_ms: track.duration_ms,
        release_date: track.album.release_date,
      }));

      return NextResponse.json({ results });
    }
  } catch (error) {
    logger.error('Spotify Search Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
