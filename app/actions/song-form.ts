'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { DifficultyLevelEnum, MusicKeyEnum, URLField, LYRICS_MAX_LENGTH } from '@/schemas/CommonSchema';
import { createClient } from '@/lib/supabase/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { TEST_ACCOUNT_MUTATION_ERROR, isDemoMutationBlocked } from '@/lib/auth/test-account-guard';
import { logger } from '@/lib/logger';

const SongFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  author: z.string().min(1, 'Author is required').max(100),
  level: DifficultyLevelEnum,
  key: MusicKeyEnum,
  capo_fret: z.number().int().min(0).max(20).nullable(),
  tempo: z.number().int().min(0).max(300).nullable(),
  time_signature: z.number().int().min(1).max(16).nullable(),
  release_year: z.number().int().min(1500).max(2100).nullable(),
  chords: z.string().max(500).nullable(),
  strumming_pattern: z.string().max(100).nullable(),
  notes: z.string().max(4000).nullable(),
  lyrics_with_chords: z.string().max(LYRICS_MAX_LENGTH).nullable(),
  category: z.string().max(50).nullable(),
  youtube_url: URLField.nullable(),
  spotify_link_url: URLField.nullable(),
  ultimate_guitar_link: URLField.nullable(),
  tiktok_short_url: URLField.nullable(),
  cover_image_url: URLField.nullable(),
  is_draft: z.boolean(),
});

export type SongFormErrors = Partial<Record<keyof z.infer<typeof SongFormSchema>, string>> & {
  _form?: string;
};

export type SongFormState = {
  errors?: SongFormErrors;
};

const parseNumberOrNull = (value: FormDataEntryValue | null): number | null => {
  if (value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const parseTextOrNull = (value: FormDataEntryValue | null): string | null =>
  String(value ?? '').trim() || null;

export async function createSongAction(
  _prev: SongFormState,
  formData: FormData
): Promise<SongFormState> {
  // Demo accounts are read-only. This action had no guard at all and leaned
  // entirely on RLS, which happily lets a demo TEACHER insert — so the "create
  // a song" path was the one mutation a demo user could actually complete.
  // Checked before validation: a blocked account is refused whatever it sends.
  const { isDevelopment } = await getUserWithRolesSSR();
  if (isDemoMutationBlocked(isDevelopment)) {
    return { errors: { _form: TEST_ACCOUNT_MUTATION_ERROR } };
  }

  const parsed = SongFormSchema.safeParse({
    title: String(formData.get('title') ?? '').trim(),
    author: String(formData.get('author') ?? '').trim(),
    level: String(formData.get('level') ?? ''),
    key: String(formData.get('key') ?? ''),
    capo_fret: parseNumberOrNull(formData.get('capo_fret')),
    tempo: parseNumberOrNull(formData.get('tempo')),
    time_signature: parseNumberOrNull(formData.get('time_signature')),
    release_year: parseNumberOrNull(formData.get('release_year')),
    chords: parseTextOrNull(formData.get('chords')),
    strumming_pattern: parseTextOrNull(formData.get('strumming_pattern')),
    notes: parseTextOrNull(formData.get('notes')),
    lyrics_with_chords: parseTextOrNull(formData.get('lyrics_with_chords')),
    category: parseTextOrNull(formData.get('category')),
    youtube_url: parseTextOrNull(formData.get('youtube_url')),
    spotify_link_url: parseTextOrNull(formData.get('spotify_link_url')),
    ultimate_guitar_link: parseTextOrNull(formData.get('ultimate_guitar_link')),
    tiktok_short_url: parseTextOrNull(formData.get('tiktok_short_url')),
    cover_image_url: parseTextOrNull(formData.get('cover_image_url')),
    is_draft: formData.get('is_draft') === 'true',
  });

  if (!parsed.success) {
    const errors: SongFormErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === 'string') {
        errors[key as keyof SongFormErrors] = issue.message;
      }
    }
    return { errors };
  }

  const supabase = await createClient();

  // Manual creation had no duplicate check (unlike the CSV importer, which
  // fuzzy-matches via find_similar_songs before inserting) — the same
  // title+author could be entered repeatedly, producing duplicate rows in
  // the library. An exact case-insensitive match on both fields is enough
  // here since this is single, deliberate entry rather than bulk import.
  const { data: existing } = await supabase
    .from('songs')
    .select('id')
    .ilike('title', parsed.data.title)
    .ilike('author', parsed.data.author)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return {
      errors: {
        _form: `A song titled "${parsed.data.title}" by ${parsed.data.author} already exists.`,
      },
    };
  }

  const { data, error } = await supabase.from('songs').insert(parsed.data).select('id').single();

  if (error) {
    logger.error('[song-form] insert error', {
      error: error.message,
      code: error.code,
    });
    return {
      errors: {
        _form: 'Could not save the song. Check your role permissions or try again.',
      },
    };
  }

  redirect(`/dashboard/songs/${data.id}`);
}
