import type { UltimateGuitarDraft } from './ultimate-guitar.types';
import {
  keyFromChord,
  parseCapo,
  parseHeader,
  parseKeyMeta,
  parseLevel,
} from './ultimate-guitar-meta.helpers';
import { isTabPage } from './ultimate-guitar-tab.helpers';

/** A chord token, anchored end-to-end so ordinary words never match.
 * Accepts C, Em, Am7, Fm, Bmadd4, Cmaj7, Csus4, Bm7b5, G5, D/F#. */
const CHORD =
  /^[A-G][#b]?(?:m|maj|min|M|dim|aug|sus|add|alt)?\d*(?:(?:sus|add|maj|min|dim|aug|no|b|#|\+|-)\d*)*(?:\/[A-G][#b]?)?$/;

const UG_URL = /https?:\/\/(?:[\w-]+\.)*ultimate-guitar\.com\/\S+/i;
const SECTION_HEADER = /^\s*\[.+\]\s*$/;
/** Page metadata lines that precede the tab on a paste without section headers. */
const META_LINE = /^(?:difficulty|tuning|key|capo|author)\s*:/i;
const HEADING = /\s(?:chords|tabs?)\s+by\s/i;

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

  // UG repeats the title and artist above the tab itself — drop that echo,
  // and, on a page with no [Section] header, the heading and meta lines too.
  const echo = [header.title, header.author].filter(Boolean).map((v) => v!.toLowerCase());
  const isPreamble = (line: string): boolean =>
    line === '' || echo.includes(line.toLowerCase()) || META_LINE.test(line) || HEADING.test(line);
  let first = 0;
  while (first < body.length && isPreamble(body[first].trim())) first++;

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

  // A "tabs" page carries tablature, not a chord sheet: it gets its own field
  // so riffs never land in lyrics_with_chords. Chords and key are still read
  // when the page states them; the teacher judges them per song.
  const isTab = isTabPage(lines);

  return {
    ...header,
    pageType: isTab ? 'tab' : 'chords',
    level: parseLevel(lines),
    key: parseKeyMeta(lines) ?? (opening ? keyFromChord(opening) : undefined),
    capoFret: parseCapo(lines),
    chords: [...new Set(harvested)],
    lyricsWithChords: isTab ? undefined : lyricsWithChords || undefined,
    tabNotation: isTab ? lyricsWithChords || undefined : undefined,
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
  !draft.tabNotation &&
  !draft.lyricsWithChords &&
  !draft.ultimateGuitarLink;
