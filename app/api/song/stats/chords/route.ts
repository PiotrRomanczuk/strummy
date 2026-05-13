import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadAuthedProfile } from '@/lib/auth/loadAuthedProfile';
import { computeChordAnalysis } from '@/lib/services/chord-analytics';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status });
    }

    const authed = await loadAuthedProfile(auth.user);
    if (!authed) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 });
    }

    if (!authed.roles.isAdmin && !authed.roles.isTeacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = createAdminClient();

    const { data: songs, error } = await adminClient
      .from('songs')
      .select('id, title, author, key, chords')
      .is('deleted_at', null);

    if (error) {
      logger.error('[ChordAnalysis] Query error:', error);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    const result = computeChordAnalysis(songs ?? []);
    return NextResponse.json(result);
  } catch (error) {
    logger.error('[ChordAnalysis] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
