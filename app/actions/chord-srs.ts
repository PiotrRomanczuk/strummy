'use server';

import { createClient } from '@/lib/supabase/server';
import { computeNextSRSState, newSRSCard, type SRSCard } from '@/lib/music-theory/srs';
import { createLogger } from '@/lib/logger';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';

const log = createLogger('chord-srs');

export interface ChordSRSUpdate {
  chord_id: string;
  is_correct: boolean;
}

export async function getChordsDueCount(): Promise<{ count: number } | { error: string }> {
  const { user, profileId } = await getUserWithRolesSSR();
  if (!user || !profileId) return { error: 'Unauthorized' };

  const supabase = await createClient();
  const { count, error } = await supabase
    .from('chord_srs')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', profileId)
    .lte('next_review_at', new Date().toISOString());

  if (error) {
    log.error('Failed to count due chords', { profileId, error });
    return { error: error.message };
  }
  return { count: count ?? 0 };
}

export async function getDueChordIds(): Promise<{ chordIds: string[] } | { error: string }> {
  const { user, profileId } = await getUserWithRolesSSR();
  if (!user || !profileId) return { error: 'Unauthorized' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('chord_srs')
    .select('chord_id')
    .eq('student_id', profileId)
    .lte('next_review_at', new Date().toISOString())
    .order('next_review_at', { ascending: true })
    .limit(30);

  if (error) {
    log.error('Failed to fetch due chord IDs', { profileId, error });
    return { error: error.message };
  }
  return { chordIds: (data ?? []).map((r) => r.chord_id) };
}

export async function updateChordSRSBatch(
  updates: ChordSRSUpdate[]
): Promise<{ success: true } | { error: string }> {
  if (updates.length === 0) return { success: true };

  const { user, profileId } = await getUserWithRolesSSR();
  if (!user || !profileId) return { error: 'Unauthorized' };

  const supabase = await createClient();
  const chordIds = updates.map((u) => u.chord_id);
  const { data: existing, error: fetchError } = await supabase
    .from('chord_srs')
    .select('chord_id, repetitions, interval_days, ease_factor')
    .eq('student_id', profileId)
    .in('chord_id', chordIds);

  if (fetchError) {
    log.error('Failed to fetch SRS state', { profileId, error: fetchError });
    return { error: fetchError.message };
  }

  const existingMap = new Map((existing ?? []).map((r) => [r.chord_id, r as SRSCard]));

  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const rows = updates.map((update) => {
    const current = existingMap.get(update.chord_id) ?? newSRSCard(now);
    const next = computeNextSRSState(current, update.is_correct, now);
    return { student_id: profileId, chord_id: update.chord_id, ...next, updated_at: nowIso };
  });

  const { error } = await supabase
    .from('chord_srs')
    .upsert(rows, { onConflict: 'student_id,chord_id' });

  if (error) {
    log.error('Failed to upsert SRS state', { profileId, error });
    return { error: error.message };
  }
  return { success: true };
}
