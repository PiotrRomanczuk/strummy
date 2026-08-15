import type { SongKey, SongLevel, UltimateGuitarDraft } from './ultimate-guitar.types';

/** A chord token, anchored end-to-end so ordinary words never match.
 * Accepts C, Em, Am7, Fm, Bmadd4, Cmaj7, Csus4, Bm7b5, G5, D/F#. */
const CHORD =
  /^[A-G][#b]?(?:m|maj|min|M|dim|aug|sus|add|alt)?\d*(?:(?:sus|add|maj|min|dim|aug|no|b|#|\+|-)\d*)*(?:\/[A-G][#b]?)?$/;

/** "<Title> Chords by <Artist>" — also Tab / Ukulele Chords / Bass Tab variants. */
const HEADER =
  /^(.+?)\s+(?:ukulele\s+|bass\s+|guitar\s+pro\s+|power\s+)?(?:chords|tabs?)\s+by\s+(.+?)\s*$/i;
const VERSION_SUFFIX = /\s*\(ver\s*\d+\)\s*$/i;
const UG_URL = /https?:\/\/(?:[\w-]+\.)*ultimate-guitar\.com\/\S+/i;
const SECTION_HEADER = /^\s*\[.+\]\s*$/;

const LEVELS: Record<string, SongLevel> = {
  novice: 'beginner',
  beginner: 'beginner',
  easy: 'beginner',
  intermediate: 'intermediate',
  medium: 'intermediate',
  advanced: 'advanced',
  expert: 'advanced',
  hard: 'advanced',
};

/** The key dropdown offers sharps only, so flat roots have to be respelled. */
const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
};

/** Chord → key, e.g. Bmadd4 → Bm, Cmaj7 → C, Bbm → A#m.
 * A first chord is a hint, not analysis: plenty of songs open off the tonic,
 * so this is a starting guess the teacher can correct in one click. */
const keyFromChord = (chord: string): SongKey | undefined => {
  const parts = /^([A-G][#b]?)(.*)$/.exec(chord);
  if (!parts) return undefined;

  const root = FLAT_TO_SHARP[parts[1]] ?? parts[1];
  const isMinor = /^(?:m(?!aj)|min)/.test(parts[2]);
  return (isMinor ? `${root}m` : root) as SongKey;
};

const metaValue = (lines: string[], field: string): string | undefined => {
  const pattern = new RegExp(`^${field}\\s*:\\s*(.*)$`, 'i');
  for (const line of lines) {
    const match = pattern.exec(line.trim());
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return undefined;
};

const parseHeader = (lines: string[]): Pick<UltimateGuitarDraft, 'title' | 'author'> => {
  // Only the first handful of lines — a lyric line could otherwise contain "by".
  for (const line of lines.slice(0, 6)) {
    const match = HEADER.exec(line.trim());
    if (match) {
      return { title: match[1].replace(VERSION_SUFFIX, '').trim(), author: match[2].trim() };
    }
  }
  return {};
};

const parseCapo = (lines: string[]): number | undefined => {
  const raw = metaValue(lines, 'capo');
  if (!raw) return undefined;
  if (/no\s*capo/i.test(raw)) return 0;
  const fret = /(\d+)/.exec(raw);
  if (!fret) return undefined;
  const value = parseInt(fret[1], 10);
  return value >= 0 && value <= 20 ? value : undefined;
};

const parseLevel = (lines: string[]): SongLevel | undefined => {
  const raw = metaValue(lines, 'difficulty');
  return raw ? LEVELS[raw.toLowerCase().trim()] : undefined;
};

/** UG lists the chord set as one token per line under a bare "Chords" heading. */
const chordsFromBlock = (lines: string[]): string[] => {
  const start = lines.findIndex((line) => line.trim().toLowerCase() === 'chords');
  if (start === -1) return [];

  const found: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const token = lines[i].trim();
    if (!CHORD.test(token)) break;
    found.push(token);
  }
  return found;
};

const isChordOnlyLine = (line: string): boolean => {
  const tokens = line
    .trim()
    .split(/\s+/)
    .filter((token) => token !== '-' && token !== '–');
  return tokens.length > 0 && tokens.every((token) => CHORD.test(token));
};

/** Fallback for pastes with no "Chords" block: harvest the tab's own chord lines. */
const chordsFromBody = (body: string): string[] =>
  body
    .split('\n')
    .filter(isChordOnlyLine)
    .flatMap((line) => line.trim().split(/\s+/))
    .filter((token) => CHORD.test(token));

/** The chord the song actually opens on. UG's "Chords" block is NOT in order of
 * appearance — a page can list a bridge-only chord first — so the tab body is
 * the only place the opening chord can be read from. */
const firstChordInBody = (body: string): string | undefined =>
  body.split('\n').find(isChordOnlyLine)?.trim().split(/\s+/)[0];

/** One cell of UG's strumming grid, rendered one per line.
 *
 * Originally this matched digits only, which was enough for a page counting
 * "1 2 3 4". Pages that count "1 & 2 &" — or "1 e & a" for sixteenths — put a
 * beat marker on its own line between the numbers, and the skip loop stopped at
 * the first one, spilling the entire grid into the lyrics field.
 *
 * Bounded by length: every cell is one or two characters, while whatever
 * follows the widget (a section header, the title echo, the author's notes) is
 * always longer. */
const isStrummingWidgetNoise = (line: string): boolean => {
  const trimmed = line.trim();
  if (trimmed === '' || /^edit/i.test(trimmed)) return true;
  return trimmed.length <= 2 && /^(?:\d+|[&+ea])$/.test(trimmed);
};

/** The tab starts after the strumming widget, or at the first [Section] header. */
const bodyStart = (lines: string[]): number => {
  const strumming = lines.findIndex((line) => /^strumming$/i.test(line.trim()));
  if (strumming !== -1) {
    let i = strumming + 1;
    while (i < lines.length && isStrummingWidgetNoise(lines[i])) i++;
    return i;
  }

  const section = lines.findIndex((line) => SECTION_HEADER.test(line));
  return section === -1 ? 0 : section;
};

const parseBody = (lines: string[], header: { title?: string; author?: string }): string => {
  const body = lines.slice(bodyStart(lines));

  // UG repeats the title and artist above the tab itself — drop that echo.
  const echo = [header.title, header.author].filter(Boolean).map((v) => v!.toLowerCase());
  let first = 0;
  while (first < body.length) {
    const trimmed = body[first].trim();
    if (trimmed !== '' && !echo.includes(trimmed.toLowerCase())) break;
    first++;
  }

  return body
    .slice(first)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
};

/** Turns a copy-paste of an Ultimate Guitar tab page into song form values.
 * Tolerant by design: a bare tab with no page chrome still yields its body. */
export const parseUltimateGuitarPaste = (raw: string): UltimateGuitarDraft => {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const header = parseHeader(lines);
  const lyricsWithChords = parseBody(lines, header);

  const chords = chordsFromBlock(lines);
  const harvested = chords.length > 0 ? chords : chordsFromBody(lyricsWithChords);
  const opening = firstChordInBody(lyricsWithChords) ?? harvested[0];

  return {
    ...header,
    level: parseLevel(lines),
    key: opening ? keyFromChord(opening) : undefined,
    capoFret: parseCapo(lines),
    chords: [...new Set(harvested)],
    lyricsWithChords: lyricsWithChords || undefined,
    ultimateGuitarLink: UG_URL.exec(raw)?.[0],
  };
};

/** True when a parse found nothing worth applying. */
export const isEmptyDraft = (draft: UltimateGuitarDraft): boolean =>
  !draft.title &&
  !draft.author &&
  !draft.level &&
  !draft.key &&
  draft.capoFret === undefined &&
  draft.chords.length === 0 &&
  !draft.lyricsWithChords &&
  !draft.ultimateGuitarLink;
