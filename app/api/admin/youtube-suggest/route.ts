import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { logger } from '@/lib/logger';
import { suggestYoutubeLinks } from './helpers';

export async function POST(req: NextRequest) {
  try {
    const { user, isAdmin } = await getUserWithRolesSSR();
    if (!user || !isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'YOUTUBE_API_KEY is not configured' },
        { status: 501 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const batchSize = Math.min(Number(body.batchSize) || 25, 50);
    const supabase = createAdminClient();

    const result = await suggestYoutubeLinks(supabase, batchSize, apiKey);
    return NextResponse.json(result);
  } catch (err) {
    logger.error('[YoutubeSuggest] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
