import { createClient } from '@/lib/supabase/server';
import { searchSongsWithAI } from '@/lib/services/enhanced-spotify-search';
import type { Database } from '@/database.types';

type DatabaseSong = Database['public']['Tables']['songs']['Row'];

// Store active sync sessions
const activeSyncs = new Map<string, AbortController>();

export async function POST(request: Request) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // Check permissions
  const { data: profile } = await supabase
    .from('user_overview')
    .select('is_admin, is_teacher')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_admin && !profile?.is_teacher) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  // Parse request body
  const body = await request.json();
  const {
    songIds,
    enableAI = true,
    force = false,
    minConfidence = 70,
  } = body as {
    songIds?: string[];
    enableAI?: boolean;
    force?: boolean;
    minConfidence?: number;
  };

  // Create abort controller for this sync session
  const syncId = `${user.id}-${Date.now()}`;
  const abortController = new AbortController();
  activeSyncs.set(syncId, abortController);

  // Set up SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: Record<string, unknown>) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        // Send initial event with sync ID
        sendEvent({ type: 'init', syncId });

        // Fetch songs
        let queryBuilder = supabase.from('songs').select('*').is('deleted_at', null);

        if (songIds && songIds.length > 0) {
          queryBuilder = queryBuilder.in('id', songIds);
        } else if (!force) {
          queryBuilder = queryBuilder.is('spotify_link_url', null);
        }

        const { data: songs, error } = await queryBuilder;

        if (error) {
          sendEvent({ type: 'error', error: error.message });
          controller.close();
          activeSyncs.delete(syncId);
          return;
        }

        if (!songs || songs.length === 0) {
          sendEvent({
            type: 'complete',
            results: {
              total: 0,
              updated: 0,
              failed: 0,
              skipped: 0,
              pending: 0,
              message: 'No songs found to process',
            },
          });
          controller.close();
          activeSyncs.delete(syncId);
          return;
        }

        sendEvent({
          type: 'start',
          total: songs.length,
        });

        const results = {
          total: songs.length,
          updated: 0,
          failed: 0,
          skipped: 0,
          pending: 0,
          errors: [] as string[],
          aiMatches: 0,
          totalQueries: 0,
          averageConfidence: 0,
        };

        // Process songs with AI-enhanced search
        const searchResults = await searchSongsWithAI(
          songs as DatabaseSong[],
          {
            maxQueries: 8,
            minConfidenceScore: minConfidence,
            includePartialMatches: true,
            enableAIAnalysis: enableAI,
          },
          // Progress callback
          (progress) => {
            if (abortController.signal.aborted) {
              throw new Error('Sync cancelled by user');
            }

            sendEvent({
              type: 'progress',
              completed: progress.completed,
              total: progress.total,
              currentSong: progress.current?.song?.title,
              percentage: Math.round((progress.completed / progress.total) * 100),
            });
          }
        );

        // Check if aborted
        if (abortController.signal.aborted) {
          sendEvent({ type: 'cancelled', message: 'Sync cancelled by user' });
          controller.close();
          activeSyncs.delete(syncId);
          return;
        }

        // Process results and update database
        for (let i = 0; i < searchResults.length; i++) {
          if (abortController.signal.aborted) {
            sendEvent({ type: 'cancelled', message: 'Sync cancelled by user' });
            controller.close();
            activeSyncs.delete(syncId);
            return;
          }

          const searchResult = searchResults[i];
          const { song, match } = searchResult;
          results.totalQueries += searchResult.queriesUsed;

          try {
            const track = match.track || match.spotifyTrack;

            if (match.confidence >= 85 && track) {
              // High confidence match - auto-update
              const updateData: {
                spotify_link_url: string;
                duration_ms: number;
                release_year: number | null;
                author?: string;
                cover_image_url?: string;
                updated_at: string;
              } = {
                spotify_link_url: track.external_urls.spotify,
                duration_ms: track.duration_ms,
                release_year: track.album.release_date
                  ? parseInt(track.album.release_date.split('-')[0])
                  : null,
                updated_at: new Date().toISOString(),
              };

              // Set author from Spotify artist
              const artistName = track.artists?.[0]?.name;
              if (artistName) {
                updateData.author = artistName;
              }

              const imageUrl = track.album.images[0]?.url;
              if (imageUrl) {
                updateData.cover_image_url = imageUrl;
              }

              const { error: updateError } = await supabase
                .from('songs')
                .update(updateData)
                .eq('id', song.id);

              if (updateError) {
                results.failed++;
                results.errors.push(`Failed to update ${song.title}: ${updateError.message}`);
                sendEvent({
                  type: 'song_failed',
                  songId: song.id,
                  title: song.title,
                  error: updateError.message,
                });
              } else {
                results.updated++;
                results.aiMatches++;
                sendEvent({
                  type: 'song_updated',
                  songId: song.id,
                  title: song.title,
                  spotifyTrack: track.name,
                  confidence: match.confidence,
                });
              }
            } else if (match.confidence >= 20 && track) {
              // Store for manual review
              const { data: existingMatch } = await supabase
                .from('spotify_matches')
                .select('id')
                .eq('song_id', song.id)
                .eq('status', 'pending')
                .single();

              if (!existingMatch) {
                const { error: insertError } = await supabase.from('spotify_matches').insert({
                  song_id: song.id,
                  spotify_track_id: track.id,
                  spotify_track_name: track.name,
                  spotify_artist_name: track.artists[0]?.name || 'Unknown',
                  spotify_album_name: track.album.name,
                  spotify_url: track.external_urls.spotify,
                  spotify_preview_url: track.preview_url || null,
                  spotify_cover_image_url: track.album.images?.[0]?.url || null,
                  spotify_duration_ms: track.duration_ms,
                  spotify_release_date: track.album.release_date,
                  spotify_popularity: track.popularity,
                  confidence_score: match.confidence,
                  search_query: match.searchQuery || `${song.title} ${song.author}`,
                  match_reason: match.reason || 'AI-powered fuzzy match',
                  status: 'pending',
                });

                if (insertError) {
                  results.failed++;
                  sendEvent({
                    type: 'song_failed',
                    songId: song.id,
                    title: song.title,
                    error: insertError.message,
                  });
                } else {
                  results.pending++;
                  sendEvent({
                    type: 'song_pending',
                    songId: song.id,
                    title: song.title,
                    spotifyTrack: track.name,
                    confidence: match.confidence,
                  });
                }
              } else {
                results.pending++;
                sendEvent({
                  type: 'song_pending',
                  songId: song.id,
                  title: song.title,
                  message: 'Already has pending match',
                });
              }
            } else {
              results.skipped++;
              sendEvent({
                type: 'song_skipped',
                songId: song.id,
                title: song.title,
                reason: match.reason,
                confidence: match.confidence,
              });
            }
          } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : 'Unknown error';
            results.failed++;
            results.errors.push(`Error updating ${song.title}: ${errorMessage}`);
            sendEvent({
              type: 'song_failed',
              songId: song.id,
              title: song.title,
              error: errorMessage,
            });
          }
        }

        // Calculate final statistics
        const confidenceScores = searchResults.map((r) => r.match.confidence).filter((c) => c > 0);
        results.averageConfidence =
          confidenceScores.length > 0
            ? Math.round(confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length)
            : 0;

        // Send completion event
        sendEvent({
          type: 'complete',
          results,
        });

        controller.close();
        activeSyncs.delete(syncId);
      } catch (error) {
        sendEvent({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        controller.close();
        activeSyncs.delete(syncId);
      }
    },
    cancel() {
      activeSyncs.delete(syncId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// Cancel endpoint
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const syncId = url.searchParams.get('syncId');

  if (!syncId) {
    return new Response(JSON.stringify({ error: 'syncId required' }), { status: 400 });
  }

  const controller = activeSyncs.get(syncId);
  if (controller) {
    controller.abort();
    activeSyncs.delete(syncId);
    return new Response(JSON.stringify({ success: true, message: 'Sync cancelled' }));
  }

  return new Response(JSON.stringify({ error: 'Sync not found' }), { status: 404 });
}
