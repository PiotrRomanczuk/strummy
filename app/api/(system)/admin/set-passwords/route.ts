import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Use server-side only env var (never NEXT_PUBLIC_ for secrets)
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

export async function POST(req: NextRequest) {
  if (!SERVICE_ROLE_KEY) {
    logger.error('SERVICE_ROLE_KEY env var is required');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
  if (!SUPABASE_URL) {
    logger.error('SUPABASE_URL env var is required');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Security: require Authorization header with SERVICE_ROLE_KEY
  const auth = req.headers.get('authorization') || '';
  if (
    !auth ||
    !auth.startsWith('Bearer ') ||
    auth.replace('Bearer ', '').trim() !== SERVICE_ROLE_KEY
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let users: { id: string; password: string }[];
  try {
    users = await req.json();
    if (!Array.isArray(users)) throw new Error('Payload must be an array');
  } catch {
    return NextResponse.json({ error: 'Invalid JSON or payload' }, { status: 400 });
  }

  async function setPassword(user: { id: string; password: string }) {
    const supabaseUrl = SUPABASE_URL || '';
    const url = `${supabaseUrl.replace(/\/+$/, '')}/auth/v1/admin/users/${encodeURIComponent(
      user.id
    )}`;
    const body = { password: user.password };
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: String(SERVICE_ROLE_KEY),
        } as Record<string, string>,
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
      return { ok: res.ok, status: res.status, body: json };
    } catch (e) {
      return { ok: false, status: 500, body: String(e) };
    }
  }

  const results = [];
  for (const u of users) {
    if (!u.id || !u.password) {
      results.push({
        id: u.id,
        ok: false,
        status: 400,
        error: 'Missing id or password',
      });
      continue;
    }
    const result = await setPassword(u);
    results.push({ id: u.id, ...result });
    // small delay to avoid burst limits
    await new Promise((r) => setTimeout(r, 250));
  }
  return NextResponse.json({ results });
}
