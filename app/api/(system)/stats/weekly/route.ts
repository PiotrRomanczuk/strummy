import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { startOfWeek, endOfWeek } from 'date-fns';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 }); // Sunday

    // Fetch lessons completed this week
    const { count: lessonsCompleted } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())
      .eq('status', 'completed');

    // Fetch new students this week
    const { count: newStudents } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString());

    // Fetch songs added this week
    const { count: songsAssigned } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString());

    return NextResponse.json({
      lessonsCompleted: lessonsCompleted || 0,
      newStudents: newStudents || 0,
      songsAssigned: songsAssigned || 0,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching weekly summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
