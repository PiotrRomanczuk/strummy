/**
 * Tests for duplicateSongAction — the song detail page's "Duplicate" button
 * clones a song and its sections as an unpublished draft.
 */

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/getUserWithRolesSSR', () => ({
  getUserWithRolesSSR: jest.fn(),
}));

jest.mock('@/lib/auth/test-account-guard', () => ({
  assertNotTestAccount: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

import { duplicateSongAction } from '@/app/actions/songs';
import { createClient } from '@/lib/supabase/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';

const SONG_ID = '00000000-0000-4000-a000-000000000001';
const NEW_SONG_ID = '00000000-0000-4000-a000-000000000099';

const SOURCE_SONG = {
  id: SONG_ID,
  title: 'Hotel California',
  author: 'Eagles',
  is_draft: false,
  deleted_at: null,
  recording_queued_at: '2026-01-01T00:00:00Z',
  recorded_at: '2026-01-02T00:00:00Z',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  search_vector: 'ignored',
};

const SOURCE_SECTIONS = [
  {
    section_type: 'intro',
    section_number: 1,
    order_position: 0,
    chords: ['Bm'],
    lyrics: null,
    tab_notation: null,
    notes: null,
  },
];

function buildSupabaseMock({
  song = SOURCE_SONG as Record<string, unknown> | null,
  sections = SOURCE_SECTIONS as Record<string, unknown>[],
  insertError = null as { message: string } | null,
  sectionsInsertError = null as { message: string } | null,
} = {}) {
  const songsInsert = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest
        .fn()
        .mockResolvedValue(
          insertError
            ? { data: null, error: insertError }
            : { data: { id: NEW_SONG_ID }, error: null }
        ),
    }),
  });

  const sectionsInsert = jest.fn().mockResolvedValue({ error: sectionsInsertError });

  const from = jest.fn((table: string) => {
    if (table === 'songs') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValue({ data: song, error: song ? null : { message: 'not found' } }),
          }),
        }),
        insert: songsInsert,
      };
    }
    if (table === 'song_sections') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: sections, error: null }),
        }),
        insert: sectionsInsert,
      };
    }
    throw new Error(`unexpected table ${table}`);
  });

  return { from, songsInsert, sectionsInsert };
}

describe('duplicateSongAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a non-staff caller', async () => {
    (getUserWithRolesSSR as jest.Mock).mockResolvedValue({
      isAdmin: false,
      isTeacher: false,
      isDevelopment: false,
    });
    (createClient as jest.Mock).mockResolvedValue(buildSupabaseMock());

    const result = await duplicateSongAction(SONG_ID);

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('clones the song as a draft with a "Copy of" title and clears recording state', async () => {
    (getUserWithRolesSSR as jest.Mock).mockResolvedValue({
      isAdmin: false,
      isTeacher: true,
      isDevelopment: false,
    });
    const supabase = buildSupabaseMock();
    (createClient as jest.Mock).mockResolvedValue(supabase);

    const result = await duplicateSongAction(SONG_ID);

    expect(result).toEqual({ success: true, id: NEW_SONG_ID });
    expect(supabase.songsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Copy of Hotel California',
        author: 'Eagles',
        is_draft: true,
        deleted_at: null,
        recording_queued_at: null,
        recorded_at: null,
      })
    );
    // Generated/identity columns must not be sent back on insert.
    const inserted = supabase.songsInsert.mock.calls[0][0];
    expect(inserted).not.toHaveProperty('id');
    expect(inserted).not.toHaveProperty('search_vector');
    expect(inserted).not.toHaveProperty('created_at');
    expect(inserted).not.toHaveProperty('updated_at');
  });

  it('clones sections onto the new song id', async () => {
    (getUserWithRolesSSR as jest.Mock).mockResolvedValue({
      isAdmin: true,
      isTeacher: false,
      isDevelopment: false,
    });
    const supabase = buildSupabaseMock();
    (createClient as jest.Mock).mockResolvedValue(supabase);

    await duplicateSongAction(SONG_ID);

    expect(supabase.sectionsInsert).toHaveBeenCalledWith([
      { ...SOURCE_SECTIONS[0], song_id: NEW_SONG_ID },
    ]);
  });

  it('returns an error when the source song is not found', async () => {
    (getUserWithRolesSSR as jest.Mock).mockResolvedValue({
      isAdmin: true,
      isTeacher: false,
      isDevelopment: false,
    });
    (createClient as jest.Mock).mockResolvedValue(buildSupabaseMock({ song: null }));

    const result = await duplicateSongAction(SONG_ID);

    expect(result).toEqual({ success: false, error: 'Song not found' });
  });

  it('returns an error when the insert fails', async () => {
    (getUserWithRolesSSR as jest.Mock).mockResolvedValue({
      isAdmin: true,
      isTeacher: false,
      isDevelopment: false,
    });
    (createClient as jest.Mock).mockResolvedValue(
      buildSupabaseMock({ insertError: { message: 'db exploded' } })
    );

    const result = await duplicateSongAction(SONG_ID);

    expect(result).toEqual({ success: false, error: 'Failed to duplicate song' });
  });
});
