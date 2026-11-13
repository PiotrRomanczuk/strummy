import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { labApiGuard } from '@/lib/private-data/access';

/**
 * alphaTab's notation font (Bravura) and soundfont (SONiVOX), served from the installed package.
 * Turbopack cannot run alphaTab's bundler plugin that would copy them, and the Lab only ever runs
 * locally, so the package folder is right here. Only the files listed below are reachable.
 */
const ASSETS: Record<string, string> = {
  'font/Bravura.woff2': 'font/woff2',
  'font/Bravura.woff': 'font/woff',
  'font/Bravura.otf': 'font/otf',
  'font/Bravura.eot': 'application/vnd.ms-fontobject',
  'font/Bravura.svg': 'image/svg+xml',
  'soundfont/sonivox.sf2': 'application/octet-stream',
  'soundfont/sonivox.sf3': 'application/octet-stream',
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const denied = await labApiGuard();
    if (denied) return denied;
    const asset = (await params).path.join('/');
    const contentType = ASSETS[asset];
    if (!contentType) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const bytes = await readFile(join(process.cwd(), 'node_modules/@coderline/alphatab/dist', asset));
    return new NextResponse(new Uint8Array(bytes), {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'private, max-age=86400' },
    });
  } catch (error) {
    logger.error('[Lab] alphaTab asset failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
