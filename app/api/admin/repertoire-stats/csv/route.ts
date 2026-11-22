import { NextResponse } from 'next/server';

import { withApiAuth } from '@/lib/auth/withApiAuth';
import { logger } from '@/lib/logger';
import { GAP_KINDS, type GapKind } from '@/lib/repertoire-stats/coverage';
import { gapsCsv, mismatchesCsv, progressionsCsv, songsCsv } from '@/lib/repertoire-stats/csv';
import { songTableOf } from '@/lib/repertoire-stats/songs-table';
import { getRepertoireSongs } from '@/lib/services/repertoire-stats-queries';
import { parseStatsParams } from '@/components/admin/repertoire-stats/repertoire-stats.helpers';

/** The CSV of a repertoire statistics view (SNG-13), filtered as the page is; admin only, like the page. */
export async function GET(request: Request) {
  return withApiAuth(
    request,
    async () => {
      try {
        const url = new URL(request.url);
        const params = parseStatsParams(Object.fromEntries(url.searchParams));
        const gap = GAP_KINDS.find((kind) => kind === url.searchParams.get('gap')) ?? null;
        const songs = await getRepertoireSongs();
        return new Response(csvOf(params, gap, songs), {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="repertoire-${gap ?? params.view}.csv"`,
          },
        });
      } catch (error) {
        logger.error('[repertoire-stats] CSV export failed', error);
        return NextResponse.json({ error: 'Export failed' }, { status: 500 });
      }
    },
    { requiredRole: 'admin' }
  );
}

function csvOf(
  params: ReturnType<typeof parseStatsParams>,
  gap: GapKind | null,
  songs: Awaited<ReturnType<typeof getRepertoireSongs>>
): string {
  if (params.view === 'mismatches') return mismatchesCsv(songs, params.field);
  if (params.view === 'progressions') return progressionsCsv(songs);
  if (params.view === 'songs') {
    return songsCsv(songTableOf(songs, { ...params, limit: songs.length }).rows);
  }
  if (params.view === 'overview') return gapsCsv(songs, gap);
  return songsCsv(songs);
}
