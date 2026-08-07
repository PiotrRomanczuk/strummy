import { NextRequest, NextResponse } from 'next/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { logger } from '@/lib/logger';
import { generateSongChordExtractionAgent } from '@/lib/ai/agents/song-chord-extraction';

export async function POST(req: NextRequest) {
  try {
    const { user, isAdmin, isTeacher } = await getUserWithRolesSSR();
    if (!user || (!isAdmin && !isTeacher)) {
      return NextResponse.json({ error: 'Admin or teacher only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const artist = typeof body.artist === 'string' ? body.artist.trim() : undefined;
    const chordSheetText = typeof body.chordSheetText === 'string' ? body.chordSheetText.trim() : '';

    if (!title || !chordSheetText) {
      return NextResponse.json({ error: 'title and chordSheetText are required' }, { status: 400 });
    }

    const result = await generateSongChordExtractionAgent({ title, artist, chordSheetText });

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error || 'Extraction failed' }, { status: 502 });
    }

    return NextResponse.json(result.data);
  } catch (err) {
    logger.error('[SongChordExtract] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
