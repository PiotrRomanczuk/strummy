/** Pure checks behind the song quality profile. */
import type { RuleContext } from './quality.types';
import type { SongQualityRecord } from './song-profile';

export const DRAFT_MAX_AGE_DAYS = 30;

/** Titles that are placeholders or test fixtures, not songs. */
export const JUNK_TITLE =
  /^(e2e\b|rls |nieznan|nie pami)|fixture|^(test|untitled|unknown|bez tytułu)\s*\d*$|^[\p{P}\p{S}\s]*$/iu;

export const hasText = (value: string | null): boolean => !!value && value.trim().length > 0;

const hasChordContent = (song: SongQualityRecord): boolean =>
  hasText(song.chords) || hasText(song.lyrics_with_chords);

/**
 * The song form used to preselect "C", so 275 of 431 production songs carried
 * key = 'C' and 260 of them had no chords at all (2026-10-21). "C" on a song
 * with no chords is the placeholder, not a key.
 */
export const hasRealKey = (song: SongQualityRecord): boolean =>
  !!song.key && !(song.key === 'C' && !hasChordContent(song));

/** `chords` is a short list ("Am, F, C, G"); tablature or lyrics belong elsewhere. */
export const chordsListIsClean = (song: SongQualityRecord): boolean => {
  const chords = song.chords ?? '';
  return !chords.includes('\n') && !/\|.*-{3,}/.test(chords) && chords.length <= 300;
};

function hostOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.hostname : null;
  } catch {
    return null;
  }
}

const hostMatches = (url: string, domains: string[]): boolean => {
  const host = hostOf(url);
  return !!host && domains.some((d) => host === d || host.endsWith(`.${d}`));
};

export function linksAreValid(song: SongQualityRecord): boolean {
  if (song.spotify_link_url && !hostMatches(song.spotify_link_url, ['spotify.com', 'spotify.link']))
    return false;
  if (song.youtube_url && !hostMatches(song.youtube_url, ['youtube.com', 'youtu.be'])) return false;
  // Tabs come from several sites (Ultimate Guitar, wywrota, …) — any web URL is fine.
  if (song.ultimate_guitar_link && !hostOf(song.ultimate_guitar_link)) return false;
  return true;
}

/** Lowercase, no diacritics, no "(Live)"/"- Remastered" tails, no punctuation. */
export function normaliseSongText(value: string | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\s-\s.*(remaster|live|version|edit).*$/, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/^the\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const songIdentityOf = (song: SongQualityRecord): string | null => {
  const title = normaliseSongText(song.title);
  return title ? `${title}|${normaliseSongText(song.author)}` : null;
};

export const isUnique = (song: SongQualityRecord, ctx: RuleContext): boolean => {
  const key = songIdentityOf(song);
  return !key || (ctx.identityCounts.get(key) ?? 0) <= 1;
};

export const draftIsFresh = (song: SongQualityRecord, ctx: RuleContext): boolean => {
  const ageDays = (ctx.now.getTime() - new Date(song.created_at).getTime()) / 86_400_000;
  return ageDays <= DRAFT_MAX_AGE_DAYS;
};
