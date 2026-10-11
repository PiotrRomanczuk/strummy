'use server';

import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';
import { createLogger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { FretboardPresetSchema } from '@/schemas/FretboardPresetSchema';

const log = createLogger('fretboard-presets');

export type FretboardPreset = { id: string; name: string; query: string };
type Result<T> = { data: T } | { error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The signed-in user's presets, newest first. RLS limits rows to the owner. */
export async function listFretboardPresets(): Promise<FretboardPreset[]> {
  const { profileId } = await getUserWithRolesSSR();
  if (!profileId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('fretboard_presets')
    .select('id, name, query')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) log.warn('list failed', { error: error.message });
  return data ?? [];
}

/** Save the current fretboard view under a name. The owner comes from the session. */
export async function saveFretboardPreset(input: unknown): Promise<Result<FretboardPreset>> {
  const { profileId, isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return { error: guard.error };
  if (!profileId) return { error: 'Unauthorized' };

  const parsed = FretboardPresetSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('fretboard_presets')
    .insert({ profile_id: profileId, ...parsed.data })
    .select('id, name, query')
    .single();
  if (error || !data) {
    log.error('save failed', { error: error?.message });
    return { error: 'Could not save the preset' };
  }
  return { data };
}

/** Delete one of the user's presets. RLS rejects anyone else's row. */
export async function deleteFretboardPreset(id: string): Promise<Result<true>> {
  const { profileId, isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return { error: guard.error };
  if (!profileId) return { error: 'Unauthorized' };
  if (!UUID_RE.test(id)) return { error: 'Invalid id' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('fretboard_presets')
    .delete()
    .eq('id', id)
    .eq('profile_id', profileId);
  if (error) {
    log.error('delete failed', { error: error.message });
    return { error: 'Could not delete the preset' };
  }
  return { data: true };
}
