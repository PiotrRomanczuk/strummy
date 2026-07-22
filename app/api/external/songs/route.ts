import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/auth/withApiAuth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

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

      if (level) query = query.eq('level', level);
      if (key) query = query.eq('key', key);
      if (search) query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);

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
  return withApiAuth(request, async () => {
    try {
      const body = await request.json();

      // Validate required fields
      if (!body.title || !body.author || !body.level || !body.key) {
        return NextResponse.json(
          { error: 'Missing required fields: title, author, level, key' },
          { status: 400 }
        );
      }

      // Use admin client to bypass RLS — request is already authenticated via bearer token
      const supabase = createAdminClient();
      const { data: song, error: insertError } = await supabase
        .from('songs')
        .insert({
          title: body.title,
          author: body.author,
          level: body.level,
          key: body.key,
          ultimate_guitar_link: body.ultimate_guitar_link || '',
          chords: body.chords || null,
          short_title: body.short_title || null,
          youtube_url: body.youtube_url || null,
          gallery_images: body.gallery_images || null,
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
