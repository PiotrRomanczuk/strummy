/**
 * Health Check API Endpoint
 *
 * GET /api/health — Returns status for all 8 external service integrations.
 * Admin only. Max 8s total timeout.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  checkSupabaseLocal,
  checkSupabaseRemote,
  checkSpotify,
  checkGoogleCalendar,
  checkGoogleDrive,
  checkGmailSmtp,
  checkOpenRouter,
  checkOllama,
  computeOverall,
} from '@/lib/health/checkers';
import { CRON_REGISTRY } from '@/lib/health/cron-registry';
import type { HealthResponse } from '@/types/health';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };

  return { user };
}

export async function GET(): Promise<NextResponse> {
  const auth = await verifyAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const DEADLINE = 8000;
  const deadline = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Health check deadline exceeded')), DEADLINE)
  );

  try {
    const checks = await Promise.race([
      Promise.allSettled([
        checkSupabaseLocal(),
        checkSupabaseRemote(),
        checkSpotify(),
        checkGoogleCalendar(),
        checkGoogleDrive(),
        checkGmailSmtp(),
        checkOpenRouter(),
        checkOllama(),
      ]),
      deadline,
    ]);

    const [local, remote, spotify, gcal, gdrive, gmail, openrouter, ollama] = checks.map((r) =>
      r.status === 'fulfilled'
        ? r.value
        : { name: 'Unknown', status: 'error' as const, message: String((r as PromiseRejectedResult).reason), checkedAt: new Date().toISOString() }
    );

    const allServices = [local, remote, spotify, gcal, gdrive, gmail, openrouter, ollama];

    const response: HealthResponse = {
      overall: computeOverall(allServices),
      services: {
        supabaseLocal: local,
        supabaseRemote: remote,
        spotify,
        googleCalendar: gcal,
        googleDrive: gdrive,
        gmailSmtp: gmail,
        openrouter,
        ollama,
      },
      crons: CRON_REGISTRY,
      checkedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
