import { authenticateRequest } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { SongUpdateSchema } from '@/schemas/SongSchema';
import { TEST_ACCOUNT_MUTATION_ERROR } from '@/lib/auth/test-account-guard';
import { logger } from '@/lib/logger';

export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status });
    }
    const supabase = createAdminClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, is_teacher, is_development')
      .eq('id', auth.user.id)
      .single();

    if (profile?.is_development) {
      return NextResponse.json({ error: TEST_ACCOUNT_MUTATION_ERROR }, { status: 403 });
    }

    if (!profile?.is_admin && !profile?.is_teacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = SongUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { id, ...updateFields } = parsed.data;

    const { data: existingData } = await supabase.from('songs').select('id').eq('id', id).single();

    if (!existingData) {
      return NextResponse.json({ error: 'No song found with the specified ID' }, { status: 404 });
    }

    const { data: updatedSong, error } = await supabase
      .from('songs')
      .update({ ...updateFields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating song', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ song: updatedSong }, { status: 200 });
  } catch (error) {
    logger.error('Unexpected error in song update API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
