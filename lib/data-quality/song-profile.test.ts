import { scoreCollection } from './score';
import { songQualityProfile, type SongQualityRecord } from './song-profile';
import { normaliseSongText } from './song-checks';
import { suggestCanonicalGenre } from './song-genres';

const NOW = new Date('2026-10-21T12:00:00Z');

const song = (overrides: Partial<SongQualityRecord> = {}): SongQualityRecord => ({
  id: 's1',
  title: 'Wonderwall',
  author: 'Oasis',
  level: 'beginner',
  key: 'F#m',
  chords: 'Em7 G Dsus4 A7sus4',
  lyrics_with_chords: null,
  spotify_link_url: 'https://open.spotify.com/track/abc',
  youtube_url: null,
  ultimate_guitar_link: 'https://tabs.ultimate-guitar.com/tab/oasis/wonderwall',
  tempo: 87,
  strumming_pattern: 'D DU UDU',
  category: 'Britpop',
  is_draft: false,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const failed = (s: SongQualityRecord, others: SongQualityRecord[] = []) =>
  scoreCollection(songQualityProfile, [s, ...others], NOW).records.find((r) => r.id === s.id)!;

describe('songQualityProfile', () => {
  it('gives a fully described song 100', () => {
    expect(failed(song()).score).toBe(100);
  });

  it.each(['RLS fixture song', 'E2E song 123', 'Nieznany riff Queen', 'Nie pamiętam', '???', '  '])(
    'treats "%s" as a junk title (critical)',
    (title) => {
      const result = failed(song({ title }));
      expect(result.failedRuleIds[0]).toBe('song.title');
      expect(result.score).toBeLessThanOrEqual(40);
    }
  );

  it.each(['Żółć', 'Unknown Pleasures', 'Test Drive', '1979', 'Łódź'])(
    'keeps the real title "%s"',
    (title) => {
      expect(failed(song({ title })).failedRuleIds).not.toContain('song.title');
    }
  );

  it('flags a YouTube link pasted into the Spotify field as critical', () => {
    const result = failed(song({ spotify_link_url: 'https://youtu.be/xyz' }));
    expect(result.failedRuleIds).toContain('song.links-valid');
    expect(result.hasCriticalFailure).toBe(true);
  });

  it('accepts tab links from sites other than Ultimate Guitar', () => {
    const s = song({ ultimate_guitar_link: 'https://spiewnik.wywrota.pl/koledy/lulajze-jezuniu' });
    expect(failed(s).failedRuleIds).not.toContain('song.links-valid');
  });

  it('accepts lyrics_with_chords instead of chords', () => {
    const s = song({ chords: null, lyrics_with_chords: '[G]Lulajże [D]Jezuniu' });
    expect(failed(s).failedRuleIds).not.toContain('song.chords');
  });

  it('only checks genre spelling when a genre is set', () => {
    expect(failed(song({ category: null })).failedRuleIds).toEqual(['song.genre']);
    expect(failed(song({ category: 'Folk/Rock' })).failedRuleIds).toEqual(['song.genre-canonical']);
  });

  it('detects duplicates despite case, diacritics and "(Live)" tails', () => {
    const a = song({ id: 'a', title: 'Wonderwall' });
    const b = song({ id: 'b', title: 'WONDERWALL (Live)', author: 'oasis' });
    expect(failed(a, [b]).failedRuleIds).toContain('song.unique');
  });

  it('flags a draft older than 30 days but not a fresh one', () => {
    expect(failed(song({ is_draft: true })).failedRuleIds).toContain('song.stale-draft');
    const fresh = song({ is_draft: true, created_at: '2026-10-15T00:00:00Z' });
    expect(failed(fresh).failedRuleIds).not.toContain('song.stale-draft');
  });

  it('rejects an out-of-range tempo', () => {
    expect(failed(song({ tempo: 0 })).failedRuleIds).toContain('song.tempo');
  });
});

describe('normaliseSongText', () => {
  it('strips diacritics, brackets, punctuation and a leading "the"', () => {
    expect(normaliseSongText('The Kolędy: Lulajże (2011 Remaster)')).toBe('koledy lulajze');
    expect(normaliseSongText('Hey Jude - Remastered 2015')).toBe('hey jude');
  });
});

describe('suggestCanonicalGenre', () => {
  it('maps aliases and casing to the canonical spelling', () => {
    expect(suggestCanonicalGenre('folk/rock')).toBe('Folk Rock');
    expect(suggestCanonicalGenre('classic rock')).toBe('Classic Rock');
    expect(suggestCanonicalGenre('Shoegaze')).toBeNull();
  });
});
