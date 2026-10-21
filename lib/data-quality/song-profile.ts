import type { Tables } from '@/types/database.types';

import { isCanonicalGenre } from './song-genres';
import type { QualityProfile } from './quality.types';
import {
  chordsListIsClean,
  draftIsFresh,
  hasRealKey,
  hasText,
  isUnique,
  JUNK_TITLE,
  linksAreValid,
  songIdentityOf,
} from './song-checks';

export const SONG_QUALITY_COLUMNS =
  'id, title, author, level, key, chords, lyrics_with_chords, spotify_link_url, youtube_url, ultimate_guitar_link, tempo, strumming_pattern, category, is_draft, created_at';

export type SongQualityRecord = Pick<
  Tables<'songs'>,
  | 'id'
  | 'title'
  | 'author'
  | 'level'
  | 'key'
  | 'chords'
  | 'lyrics_with_chords'
  | 'spotify_link_url'
  | 'youtube_url'
  | 'ultimate_guitar_link'
  | 'tempo'
  | 'strumming_pattern'
  | 'category'
  | 'is_draft'
  | 'created_at'
>;

export const songQualityProfile: QualityProfile<SongQualityRecord> = {
  entity: 'song',
  identityOf: songIdentityOf,
  rules: [
    {
      id: 'song.title',
      dimension: 'validity',
      weight: 5,
      isCritical: true,
      check: (s) => hasText(s.title) && !JUNK_TITLE.test(s.title.trim()),
      fixField: 'title',
    },
    {
      id: 'song.links-valid',
      dimension: 'validity',
      weight: 3,
      isCritical: true,
      appliesTo: (s) => !!(s.spotify_link_url || s.youtube_url || s.ultimate_guitar_link),
      check: linksAreValid,
      fixField: 'spotify_link_url',
    },
    {
      id: 'song.author',
      dimension: 'completeness',
      weight: 3,
      check: (s) => hasText(s.author),
      fixField: 'author',
    },
    {
      id: 'song.level',
      dimension: 'completeness',
      weight: 3,
      check: (s) => !!s.level,
      fixField: 'level',
    },
    {
      id: 'song.chords',
      dimension: 'completeness',
      weight: 3,
      check: (s) => hasText(s.chords) || hasText(s.lyrics_with_chords),
      fixField: 'chords',
    },
    {
      id: 'song.chords-format',
      dimension: 'validity',
      weight: 2,
      appliesTo: (s) => hasText(s.chords),
      check: chordsListIsClean,
      fixField: 'chords',
    },
    { id: 'song.unique', dimension: 'uniqueness', weight: 3, check: isUnique },
    {
      id: 'song.key',
      dimension: 'completeness',
      weight: 2,
      check: hasRealKey,
      fixField: 'key',
    },
    {
      id: 'song.listen-link',
      dimension: 'completeness',
      weight: 2,
      check: (s) => hasText(s.spotify_link_url) || hasText(s.youtube_url),
      fixField: 'youtube_url',
    },
    {
      id: 'song.genre-canonical',
      dimension: 'consistency',
      weight: 2,
      appliesTo: (s) => hasText(s.category),
      check: (s) => isCanonicalGenre((s.category ?? '').trim()),
      fixField: 'category',
    },
    {
      id: 'song.genre',
      dimension: 'completeness',
      weight: 1,
      check: (s) => hasText(s.category),
      fixField: 'category',
    },
    {
      id: 'song.tabs-link',
      dimension: 'completeness',
      weight: 1,
      check: (s) => hasText(s.ultimate_guitar_link),
      fixField: 'ultimate_guitar_link',
    },
    {
      id: 'song.tempo',
      dimension: 'completeness',
      weight: 1,
      check: (s) => s.tempo !== null && s.tempo >= 20 && s.tempo <= 300,
      fixField: 'tempo',
    },
    {
      id: 'song.strumming',
      dimension: 'completeness',
      weight: 1,
      check: (s) => hasText(s.strumming_pattern),
      fixField: 'strumming_pattern',
    },
    {
      id: 'song.stale-draft',
      dimension: 'consistency',
      weight: 1,
      appliesTo: (s) => s.is_draft,
      check: draftIsFresh,
    },
  ],
};
