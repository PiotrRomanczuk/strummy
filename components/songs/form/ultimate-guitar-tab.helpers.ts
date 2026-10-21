/** Telling an Ultimate Guitar "tabs" page apart from a chord sheet. */

/** One string of a staff: `e|--0--|`, `G|--4h5--|`, `D#|--3--` (dropped tunings). */
const STAFF_LINE = /^\s*[A-Ga-g][#b]?\s?\|.*-{3,}/;

/** "<Title> Tab by <Artist>", also "Tabs by", "Bass Tab by", "Guitar Pro Tab by". */
const TAB_HEADING = /\s(?:bass\s+|guitar\s+pro\s+|power\s+)?tabs?\s+by\s/i;
const CHORDS_HEADING = /\s(?:ukulele\s+)?chords\s+by\s/i;

/** A riff written out on six strings takes six lines; one staff is enough proof. */
const MIN_STAFF_LINES = 6;

export const isTabStaffLine = (line: string): boolean => STAFF_LINE.test(line);

/** The heading decides when there is one; otherwise the body has to be mostly staff. */
export const isTabPage = (lines: string[]): boolean => {
  const heading = lines.slice(0, 6).join('\n');
  if (TAB_HEADING.test(heading)) return true;
  if (CHORDS_HEADING.test(heading)) return false;
  return lines.filter(isTabStaffLine).length >= MIN_STAFF_LINES;
};
