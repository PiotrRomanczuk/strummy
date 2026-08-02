'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { SongSection } from '@/components/songs/types';

type SongSectionInput = Partial<SongSection> & Pick<SongSection, 'song_id'>;

export async function saveSongSection(data: SongSectionInput) {
  const supabase = await createClient();

  const { id, ...rest } = data;

  if (id) {
    const { error } = await supabase.from('song_sections').update(rest).eq('id', id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('song_sections').insert(rest);
    if (error) return { error: error.message };
  }

  revalidatePath(`/dashboard/songs/${data.song_id}`);
  return { success: true };
}
