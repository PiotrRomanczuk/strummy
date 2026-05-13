import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createResumableUploadUrl } from '@/lib/services/google-drive';
import { UploadUrlRequestSchema } from '@/schemas/SongVideoSchema';
import { createLogger } from '@/lib/logger';

const log = createLogger('SongVideoUploadURL');

/**
 * POST /api/song/[id]/videos/upload-url
 * Generate a resumable upload URL for Google Drive
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: songId } = await params;

    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status });
    }
    const user = auth.user;
    const supabase = createAdminClient();

    // Verify teacher/admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, is_teacher')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin && !profile?.is_teacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify song exists
    const { data: song } = await supabase.from('songs').select('id').eq('id', songId).single();

    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    const body = await request.json();
    const input = UploadUrlRequestSchema.parse(body);

    const { uploadUrl, folderId } = await createResumableUploadUrl(
      user.id,
      input.filename,
      input.mime_type,
      input.file_size_bytes
    );

    return NextResponse.json({ uploadUrl, folderId });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request', details: (error as Error).message },
        { status: 400 }
      );
    }
    log.error('Error generating upload URL', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
