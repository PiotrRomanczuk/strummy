import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GenerateUploadUrlInputSchema } from '@/schemas/DriveFileSchema';
import { createResumableUploadUrl, createFolderInDrive } from '@/lib/services/google-drive';
import { createLogger } from '@/lib/logger';

const log = createLogger('DriveFilesUploadURL');

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

/**
 * POST /api/drive/files/upload-url
 * Generate a resumable upload URL for client-side upload to Google Drive
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify staff role
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, is_teacher')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin && !profile?.is_teacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate request body
    const body = await request.json();
    const input = GenerateUploadUrlInputSchema.parse(body);

    // Determine folder structure: /root/{entity_type}/{entity_id}/{file_type}/
    const entityFolderName = `${input.entity_type}-${input.entity_id}`;
    const fileTypeFolderName = input.file_type;

    // Create entity folder if needed (e.g., "lesson-abc123")
    let entityFolderId: string;
    try {
      entityFolderId = await createFolderInDrive(
        user.id,
        entityFolderName,
        DRIVE_FOLDER_ID
      );
    } catch (err) {
      log.warn('Entity folder may already exist, continuing', { err });
      // If folder already exists, we'd need to search for it
      // For now, use root folder as fallback
      entityFolderId = DRIVE_FOLDER_ID;
    }

    // Create file type subfolder (e.g., "audio", "pdf")
    let fileTypeFolderId: string;
    try {
      fileTypeFolderId = await createFolderInDrive(
        user.id,
        fileTypeFolderName,
        entityFolderId
      );
    } catch (err) {
      log.warn('File type folder may already exist, using entity folder', { err });
      fileTypeFolderId = entityFolderId;
    }

    // Generate resumable upload URL
    const { uploadUrl, folderId } = await createResumableUploadUrl(
      user.id,
      input.filename,
      input.mime_type,
      input.file_size_bytes
    );

    log.info('Generated upload URL', {
      filename: input.filename,
      fileType: input.file_type,
      entityType: input.entity_type,
    });

    return NextResponse.json({
      uploadUrl,
      folderId: fileTypeFolderId || folderId,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: (error as Error).message },
        { status: 400 }
      );
    }
    log.error('Unexpected error generating upload URL', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
