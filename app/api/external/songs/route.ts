import { NextRequest, NextResponse } from 'next/server';
import { containsPattern } from '@/lib/supabase/filter-pattern';
import { withApiAuth } from '@/lib/auth/withApiAuth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { Constants } from '@/types/database.types';
import { ExternalSongCreateSchema } from '@/schemas/ExternalSongSchema';

type SongLevel = (typeof Constants.public.Enums.difficulty_level)[number];
type SongKey = (typeof Constants.public.Enums.music_key)[number];

/**
 * `level` and `key` arrive as raw query strings but the columns are enums, so
 * they must be validated at the boundary rather than passed through. Checking
 * against the database's own enum lists (not a hand-copied subset) keeps every
 * legitimate value — including flats like `Db`/`Eb` — accepted.
 */
const isSongLevel = (value: string): value is SongLevel =>
  (Constants.public.Enums.difficulty_level as readonly string[]).includes(value);

const isSongKey = (value: string): value is SongKey =>
  (Constants.public.Enums.music_key as readonly string[]).includes(value);

/**
 * External Songs API Handler
 *
 * Public-facing songs endpoint for external applications, authenticated via
 * API key bearer token (or cookie session).
 */

export async function GET(request: NextRequest) {
  return withApiAuth(request, async () => {
    try {
      const { searchParams } = new URL(request.url);

      // Parse query parameters
      const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
      const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;
      const search = searchParams.get('search') || undefined;
      const level = searchParams.get('level') || undefined;
      const key = searchParams.get('key') || undefined;

      // Use the admin client — the caller is already authenticated via API key
      // or cookie session above, and there is no end-user RLS context to route
      // a raw PostgREST request through (see the anon-key routing this used to
      // go through, which silently returned zero rows under RLS).
      const supabase = createAdminClient();
      let query = supabase.from('songs').select('*', { count: 'exact' }).is('deleted_at', null);

      // Reject unknown enum values outright: they can never match a row, so a
      // 400 is more useful to an API consumer than a silent empty result.
      if (level !== undefined && !isSongLevel(level)) {
        return NextResponse.json(
          { error: `Invalid level "${level}"`, allowed: Constants.public.Enums.difficulty_level },
          { status: 400 }
        );
      }
      if (key !== undefined && !isSongKey(key)) {
        return NextResponse.json(
          { error: `Invalid key "${key}"`, allowed: Constants.public.Enums.music_key },
          { status: 400 }
        );
      }

      if (level) query = query.eq('level', level);
      if (key) query = query.eq('key', key);
      if (search) {
        const pattern = containsPattern(search);
        query = query.or(`title.ilike.${pattern},author.ilike.${pattern}`);
      }

      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

      const { data: songs, error, count } = await query;

      if (error) {
        return NextResponse.json(
          { error: 'Database query failed', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        songs: songs || [],
        meta: {
          count: count ?? songs?.length ?? 0,
        },
      });
    } catch (error) {
      logger.error('❌ [External API] Songs GET error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest) {
  return withApiAuth(request, async ({ roles }) => {
    try {
      // The admin client below skips RLS, so the rule songs_update_staff
      // enforces for in-app writes is checked here: staff only.
      if (!roles.isAdmin && !roles.isTeacher) {
        return NextResponse.json(
          { error: 'Only a teacher or an admin can add songs' },
          { status: 403 }
        );
      }

      const parsed = ExternalSongCreateSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid song', issues: parsed.error.issues },
          { status: 400 }
        );
      }
      const input = parsed.data;

      const supabase = createAdminClient();
      const { data: song, error: insertError } = await supabase
        .from('songs')
        .insert({
          title: input.title,
          author: input.author,
          level: input.level,
          key: input.key,
          ultimate_guitar_link: input.ultimate_guitar_link ?? '',
          chords: input.chords || null,
          short_title: input.short_title || null,
          youtube_url: input.youtube_url ?? null,
          gallery_images: input.gallery_images ?? null,
        })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json(
          {
            error: 'Failed to create song',
            details: insertError.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          song,
          meta: {
            created: true,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      logger.error('❌ [External API] Songs POST error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  });
}
