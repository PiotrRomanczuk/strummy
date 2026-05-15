import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFileStreamUrl } from '@/lib/services/google-drive';
import { createLogger } from '@/lib/logger';

const log = createLogger('DriveFileStream');

/**
 * GET /api/drive/files/[fileId]/stream
 * Get a streaming/download URL for a file
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch file (RLS handles permission checks)
    const { data: file, error } = await supabase
      .from('drive_files')
      .select('google_drive_file_id, file_type, mime_type')
      .eq('id', fileId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      log.error('Error fetching file', { error, fileId });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get streaming URL from Google Drive
    const streamUrl = await getFileStreamUrl(user.id, file.google_drive_file_id);

    log.info('Generated stream URL', { fileId, fileType: file.file_type });

    return NextResponse.json({
      streamUrl,
      mimeType: file.mime_type,
      fileType: file.file_type,
    });
  } catch (error) {
    log.error('Unexpected error generating stream URL', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
