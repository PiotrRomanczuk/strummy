import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTrack, getAudioFeatures } from '@/lib/spotify';
import { createLogger } from '@/lib/logger';
import { z } from 'zod';
import type { Database } from '@/database.types';

const log = createLogger('CreateFromSpotify');

// Request schema
const CreateFromSpotifySchema = z.object({
  spotifyTrackId: z.string().min(1),
  driveFileId: z.string().min(1),
  videoMetadata: z.object({
    filename: z.string(),
    parsed: z
      .object({
        title: z.string(),
        artist: z.string().nullable(),
      })
      .nullable(),
  }),
});

/**
 * POST /api/admin/drive-videos/create-from-spotify
 * Creates a new song from Spotify track and links a Drive video to it
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate and authorize
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, is_teacher')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin && !profile?.is_teacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = CreateFromSpotifySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error },
        { status: 400 }
      );
    }

    const { spotifyTrackId, driveFileId, videoMetadata } = parseResult.data;

    // Fetch Spotify track details
    log.info('Fetching Spotify track', { spotifyTrackId });
    const trackData = (await getTrack(spotifyTrackId)) as {
      id: string;
      name: string;
      artists: { name: string }[];
      album: {
        name: string;
        images: { url: string }[];
        release_date: string;
      };
      external_urls: { spotify: string };
      duration_ms: number;
    };

    // Fetch audio features (key, tempo, etc.)
    let audioFeatures: {
      key?: number;
      tempo?: number;
      time_signature?: number;
    } = {};
    try {
      const features = (await getAudioFeatures(spotifyTrackId)) as {
        key: number;
        tempo: number;
        time_signature: number;
      };
      audioFeatures = {
        key: features.key,
        tempo: Math.round(features.tempo),
        time_signature: features.time_signature,
      };
    } catch (error) {
      log.warn('Failed to fetch audio features', { error });
      // Continue without audio features
    }

    // Map Spotify key number to music key (0 = C, 1 = C#, etc.)
    const keyMap: Record<number, string> = {
      0: 'C',
      1: 'C#',
      2: 'D',
      3: 'D#',
      4: 'E',
      5: 'F',
      6: 'F#',
      7: 'G',
      8: 'G#',
      9: 'A',
      10: 'A#',
      11: 'B',
    };

    // Extract release year
    const releaseYear = trackData.album.release_date
      ? parseInt(trackData.album.release_date.split('-')[0], 10)
      : null;

    // Get cover image (largest available)
    const coverImage =
      trackData.album.images.length > 0 ? trackData.album.images[0].url : null;

    // Determine level (default to beginner)
    const level = 'beginner';

    // Determine key
    const musicKey =
      audioFeatures.key !== undefined ? keyMap[audioFeatures.key] || 'C' : 'C';

    // Create song using admin client (bypasses RLS)
    const adminClient = createAdminClient();

    const songData = {
      title: trackData.name,
      author: trackData.artists.map((a) => a.name).join(', '),
      level: level as 'beginner',
      key: musicKey as Database['public']['Enums']['music_key'],
      spotify_link_url: trackData.external_urls.spotify,
      cover_image_url: coverImage,
      release_year: releaseYear,
      tempo: audioFeatures.tempo || null,
      time_signature: audioFeatures.time_signature || null,
      duration_ms: trackData.duration_ms,
      category: null, // User can add later
      chords: null,
      ultimate_guitar_link: null,
      youtube_url: null,
    };

    log.info('Creating song from Spotify', { title: songData.title });

    const { data: song, error: songError } = await adminClient
      .from('songs')
      .insert(songData)
      .select()
      .single() as { data: { id: string; title: string; author: string; level: string; spotify_link_url: string } | null; error: { message: string } | null };

    if (songError || !song) {
      log.error('Failed to create song', { error: songError });
      throw new Error(`Failed to create song: ${songError?.message ?? 'No data returned'}`);
    }

    // Get Drive folder ID (from env or scan data)
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.split('?')[0] || '';

    // Link video to new song
    const videoData = {
      song_id: song.id,
      uploaded_by: user.id,
      google_drive_file_id: driveFileId,
      google_drive_folder_id: folderId,
      title: videoMetadata.parsed?.title || videoMetadata.filename,
      filename: videoMetadata.filename,
      mime_type: 'video/mp4', // Default, actual type unknown at this point
      file_size_bytes: null,
      thumbnail_url: null,
      display_order: 0,
      match_confidence: 100, // From Spotify, so perfect match
      match_source: 'spotify',
    };

    log.info('Linking video to song', { songId: song.id, driveFileId });

    const { data: video, error: videoError } = await adminClient
      .from('song_videos')
      .insert(videoData)
      .select()
      .single() as { data: { id: string; filename: string } | null; error: { message: string } | null };

    if (videoError || !video) {
      log.error('Failed to link video', { error: videoError });
      // Roll back song creation
      await adminClient.from('songs').delete().eq('id', song.id);
      throw new Error(`Failed to link video: ${videoError?.message ?? 'No data returned'}`);
    }

    log.info('Successfully created song from Spotify and linked video', {
      songId: song.id,
      videoId: video.id,
    });

    return NextResponse.json({
      success: true,
      song: {
        id: song.id,
        title: song.title,
        author: song.author,
        level: song.level,
        spotifyUrl: song.spotify_link_url,
      },
      video: {
        id: video.id,
        filename: video.filename,
      },
    });
  } catch (error) {
    log.error('Create from Spotify failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
