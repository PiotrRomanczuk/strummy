import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check permissions
  const { data: profile } = await supabase
    // `profiles`, not the `user_overview` view: that view selects
    // `profiles.id AS user_id` and never exposes the auth linkage, so
    // filtering it by an auth id matched nothing and this guard 403'd
    // every caller, admins included.
    .from('profiles')
    .select('is_admin, is_teacher')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_admin && !profile?.is_teacher) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { count, error } = await supabase
      .from('spotify_matches')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    logger.error('Error fetching pending count:', error);
    return NextResponse.json({ error: 'Failed to fetch count' }, { status: 500 });
  }
}
