import { NextResponse } from 'next/server';
import { secretsMatch } from '@/lib/auth/secret-compare';

/**
 * Verify that a request is from Vercel Cron by checking the
 * Authorization header against the CRON_SECRET env variable.
 *
 * Returns null if authorized, or a 401/500 NextResponse if not.
 */
export function verifyCronSecret(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (!secretsMatch(authHeader, `Bearer ${cronSecret}`)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  return null;
}
