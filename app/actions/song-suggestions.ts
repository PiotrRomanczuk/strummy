'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { decide, getPendingSuggestions, type Decision } from '@/lib/services/song-suggestions';
import { createClient } from '@/lib/supabase/server';

export type DecideResult = { ok: true; decision: Decision } | { ok: false; error: string };
export type BulkResult =
  { ok: true; accepted: number; stale: number; failed: number } | { ok: false; error: string };

const STATS_PATH = '/dashboard/admin/repertoire-stats';

const DecideSchema = z.object({ id: z.string().uuid(), accept: z.boolean() });
const BulkSchema = z.object({ minConfidence: z.number().min(0.5).max(1) });

async function adminId(): Promise<string | null | false> {
  const { isAdmin, profileId } = await getUserWithRolesSSR();
  return isAdmin ? (profileId ?? null) : false;
}

/** Accepts or rejects one AI proposal (SNG-15); an accepted value is written only into a still-empty field. */
export async function decideSuggestion(input: {
  id: string;
  accept: boolean;
}): Promise<DecideResult> {
  const parsed = DecideSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const by = await adminId();
  if (by === false) return { ok: false, error: 'forbidden' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('song_suggestions')
    .select('id, song_id, field, value')
    .eq('id', parsed.data.id)
    .eq('status', 'pending')
    .maybeSingle();
  if (error || !data) return { ok: false, error: 'not-found' };
  const suggestion = {
    id: data.id,
    songId: data.song_id,
    field: data.field,
    value: data.value,
  } as Parameters<typeof decide>[1];
  const decision = await decide(supabase, suggestion, parsed.data.accept, by);
  revalidatePath(STATS_PATH);
  return decision === 'failed' ? { ok: false, error: 'save-failed' } : { ok: true, decision };
}

/** Accepts every open proposal at or above the confidence; the ones whose field was filled meanwhile go stale. */
export async function acceptConfidentSuggestions(input: {
  minConfidence: number;
}): Promise<BulkResult> {
  const parsed = BulkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const by = await adminId();
  if (by === false) return { ok: false, error: 'forbidden' };
  const supabase = await createClient();
  const confident = (await getPendingSuggestions(supabase)).filter(
    (suggestion) => suggestion.confidence >= parsed.data.minConfidence
  );
  const counts = { accepted: 0, stale: 0, failed: 0 };
  for (const suggestion of confident) {
    const decision = await decide(supabase, suggestion, true, by);
    if (decision === 'accepted' || decision === 'stale' || decision === 'failed')
      counts[decision] += 1;
  }
  revalidatePath(STATS_PATH);
  return { ok: true, ...counts };
}
