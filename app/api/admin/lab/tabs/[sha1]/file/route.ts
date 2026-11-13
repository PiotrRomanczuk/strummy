import { readFile } from 'node:fs/promises';
import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { labApiGuard } from '@/lib/private-data/access';
import { tabFilePath } from '@/lib/private-data/tabs';

/** The raw Guitar Pro file of one tab in the library, for the Lab's alphaTab player (admin, local only). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ sha1: string }> }) {
  try {
    const denied = await labApiGuard();
    if (denied) return denied;
    const { sha1 } = await params;
    const file = tabFilePath(sha1);
    if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const bytes = await readFile(file);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    logger.error('[Lab] tab file failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
