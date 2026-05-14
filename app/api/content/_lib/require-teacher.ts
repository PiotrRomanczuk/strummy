import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { validateMutationPermission } from '@/lib/auth/permissions';
import { getSupabaseConfig } from '@/lib/supabase/config';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface TeacherContext {
  userId: string;
  supabase: SupabaseClient;
}

export type TeacherGate = { ok: true; ctx: TeacherContext } | { ok: false; response: NextResponse };

function extractBearer(req: NextRequest | Request): string | null {
  const header = req.headers.get('Authorization');
  if (!header) return null;
  const parts = header.split(' ');
  return parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : null;
}

export async function requireTeacher(request?: NextRequest | Request): Promise<TeacherGate> {
  // Bearer token path — supports API clients and Bruno tests
  if (request) {
    const token = extractBearer(request);
    if (!token) {
      return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    const { url, anonKey } = getSupabaseConfig();
    const supabase = createSupabaseClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }) as SupabaseClient;

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) {
      return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, is_teacher')
      .eq('id', user.id)
      .single();

    if (
      !validateMutationPermission({ isAdmin: profile?.is_admin, isTeacher: profile?.is_teacher })
    ) {
      return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }

    return { ok: true, ctx: { userId: user.id, supabase } };
  }

  // Cookie-based path — existing browser session behavior
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, is_teacher')
    .eq('id', user.id)
    .single();

  if (!validateMutationPermission({ isAdmin: profile?.is_admin, isTeacher: profile?.is_teacher })) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true, ctx: { userId: user.id, supabase: supabase as SupabaseClient } };
}
