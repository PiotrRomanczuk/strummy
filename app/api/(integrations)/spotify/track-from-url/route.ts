import { NextResponse } from 'next/server';
import { getTrack } from '@/lib/spotify';
import { SpotifyApiTrack } from '@/types/spotify';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * Extract Spotify track ID from various URL formats:
 * - https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp
 * - https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp?si=...
 * - spotify:track:3n3Ppam7vgaVa1iaRUc9Lp
 */
function extractTrackId(url: string): string | null {
  // Handle spotify: URI format
  if (url.startsWith('spotify:track:')) {
    return url.split(':')[2];
  }

  // Handle HTTP/HTTPS URLs
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/track\/([a-zA-Z0-9]+)/);
    if (pathMatch) {
      return pathMatch[1];
    }
  } catch {
    // Invalid URL, try to extract ID directly
    const directMatch = url.match(/([a-zA-Z0-9]{22})/);
    if (directMatch) {
      return directMatch[1];
    }
  }

  return null;
}

/**
 * GET /api/spotify/track-from-url?url=...
 * Fetch track details from a Spotify URL
 */
export async function GET(request: Request) {
  // Require authenticated user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  const trackId = extractTrackId(url);
  if (!trackId) {
    return NextResponse.json({ error: 'Invalid Spotify URL or track ID' }, { status: 400 });
  }

  try {
    const track = await getTrack(trackId) as SpotifyApiTrack;

    const result = {
      id: track.id,
      name: track.name,
      artist: track.artists[0].name,
      album: track.album.name,
      url: track.external_urls.spotify,
      image: track.album.images[0]?.url || '',
      release_date: track.album.release_date,
    };

    return NextResponse.json({ track: result });
  } catch (error) {
    logger.error('Spotify Track Fetch Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch track from Spotify' },
      { status: 500 }
    );
  }
}
