'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function saveSongSection(data: any) {
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
