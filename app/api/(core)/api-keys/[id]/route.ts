/**
 * DELETE /api/api-keys/[id] - Delete a specific API key
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the key belongs to the user
    const { data: key, error: fetchError } = await supabase
      .from('api_keys')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !key) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    if (key.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete the key
    const { error: deleteError } = await supabase.from('api_keys').delete().eq('id', id);

    if (deleteError) {
      logger.error('[API Keys] Error deleting key:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('[API Keys] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
