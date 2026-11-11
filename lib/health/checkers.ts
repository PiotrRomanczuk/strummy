/**
 * Service health checker functions
 *
 * Each checker returns a ServiceCheck with latency, status, and optional details.
 * All checkers return 'unconfigured' when env vars are missing — treated as neutral.
 */

import transporter, { isSmtpConfigured } from '@/lib/email/smtp-client';
import type { ServiceCheck, ServiceStatus } from '@/types/health';
import { getSpotifyCircuitState } from '@/lib/spotify';

function now(): string {
  return new Date().toISOString();
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

async function headCheck(url: string, headers: Record<string, string> = {}): Promise<number> {
  const start = Date.now();
  const res = await fetch(url, { method: 'HEAD', headers, cache: 'no-store' });
  if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
  return Date.now() - start;
}

export async function checkSupabaseLocal(): Promise<ServiceCheck> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_LOCAL_ANON_KEY;

  if (!url || !key) {
    return { name: 'Supabase Local', status: 'unconfigured', message: 'Not configured', checkedAt: now() };
  }

  try {
    const latencyMs = await withTimeout(headCheck(`${url}/rest/v1/`, { apikey: key }), 3000);
    return { name: 'Supabase Local', status: 'healthy', latencyMs, checkedAt: now() };
  } catch (err) {
    return { name: 'Supabase Local', status: 'error', message: String(err), checkedAt: now() };
  }
}

export async function checkSupabaseRemote(): Promise<ServiceCheck> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_REMOTE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_REMOTE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return { name: 'Supabase Remote', status: 'unconfigured', message: 'Not configured', checkedAt: now() };
  }

  try {
    const latencyMs = await withTimeout(headCheck(`${url}/rest/v1/`, { apikey: key }), 3000);
    return { name: 'Supabase Remote', status: 'healthy', latencyMs, checkedAt: now() };
  } catch (err) {
    return { name: 'Supabase Remote', status: 'error', message: String(err), checkedAt: now() };
  }
}

export async function checkSpotify(): Promise<ServiceCheck> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return { name: 'Spotify', status: 'unconfigured', message: 'Not configured', checkedAt: now() };
  }

  const circuit = getSpotifyCircuitState();
  if (circuit.isOpen) {
    return {
      name: 'Spotify',
      status: 'degraded',
      message: `Circuit breaker open (${circuit.consecutiveFailures} failures)`,
      details: circuit,
      checkedAt: now(),
    };
  }

  try {
    const start = Date.now();
    await withTimeout(
      fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
      }).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); }),
      5000
    );
    return { name: 'Spotify', status: 'healthy', latencyMs: Date.now() - start, checkedAt: now() };
  } catch (err) {
    return { name: 'Spotify', status: 'error', message: String(err), checkedAt: now() };
  }
}

export async function checkGoogleCalendar(): Promise<ServiceCheck> {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return { name: 'Google Calendar', status: 'unconfigured', message: 'Not configured', checkedAt: now() };
  }

  try {
    const latencyMs = await withTimeout(
      headCheck('https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'),
      3000
    );
    return { name: 'Google Calendar', status: 'healthy', latencyMs, checkedAt: now() };
  } catch (err) {
    return { name: 'Google Calendar', status: 'error', message: String(err), checkedAt: now() };
  }
}

export async function checkGoogleDrive(): Promise<ServiceCheck> {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    return { name: 'Google Drive', status: 'unconfigured', message: 'Not configured', checkedAt: now() };
  }

  try {
    const latencyMs = await withTimeout(
      headCheck('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'),
      3000
    );
    return { name: 'Google Drive', status: 'healthy', latencyMs, checkedAt: now() };
  } catch (err) {
    return { name: 'Google Drive', status: 'error', message: String(err), checkedAt: now() };
  }
}

export async function checkEmailSmtp(): Promise<ServiceCheck> {
  if (!isSmtpConfigured()) {
    return { name: 'Email SMTP', status: 'unconfigured', message: 'Not configured', checkedAt: now() };
  }

  try {
    const start = Date.now();
    await withTimeout(transporter.verify(), 5000);
    return { name: 'Email SMTP', status: 'healthy', latencyMs: Date.now() - start, checkedAt: now() };
  } catch (err) {
    return { name: 'Email SMTP', status: 'error', message: String(err), checkedAt: now() };
  }
}

export async function checkOpenRouter(): Promise<ServiceCheck> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return { name: 'OpenRouter', status: 'unconfigured', message: 'Not configured', checkedAt: now() };
  }

  try {
    const start = Date.now();
    const res = await withTimeout(
      fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: 'no-store',
      }),
      5000
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const latencyMs = Date.now() - start;
    return { name: 'OpenRouter', status: 'healthy', latencyMs, checkedAt: now() };
  } catch (err) {
    return { name: 'OpenRouter', status: 'error', message: String(err), checkedAt: now() };
  }
}

export async function checkOllama(): Promise<ServiceCheck> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  try {
    const start = Date.now();
    const res = await withTimeout(
      fetch(`${baseUrl}/api/tags`, { cache: 'no-store' }),
      2000
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { models?: unknown[] };
    const modelCount = data.models?.length ?? 0;
    return {
      name: 'Ollama',
      status: 'healthy',
      latencyMs: Date.now() - start,
      message: `${modelCount} model${modelCount === 1 ? '' : 's'} available`,
      details: { baseUrl, modelCount },
      checkedAt: now(),
    };
  } catch (err) {
    const isNotConfigured = !process.env.OLLAMA_BASE_URL;
    const status: ServiceStatus = isNotConfigured ? 'unconfigured' : 'error';
    return { name: 'Ollama', status, message: isNotConfigured ? 'Not running (optional)' : String(err), checkedAt: now() };
  }
}

export function computeOverall(services: ServiceCheck[]): ServiceStatus {
  const configured = services.filter((s) => s.status !== 'unconfigured');
  if (configured.some((s) => s.status === 'error')) return 'error';
  if (configured.some((s) => s.status === 'degraded')) return 'degraded';
  if (configured.length === 0) return 'unconfigured';
  return 'healthy';
}
