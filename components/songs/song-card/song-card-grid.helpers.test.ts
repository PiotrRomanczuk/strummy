import { songCardFromRows } from '@/lib/services/song-card-queries';
import type { SongCard } from '@/lib/music-theory/song-card';
import { CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW } from '@/lib/music-theory/song-card.fixture';

import { bassCells, chordCells, coversSlot, hitCells, strumCells } from './song-card-grid.helpers';

const card = songCardFromRows(CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW) as SongCard;
const shown = (cells: { slot: number; text: string; tone: string }[]) =>
  cells.filter((cell) => cell.tone !== 'empty').map((cell) => [cell.slot, cell.text]);

describe('song card grid cells', () => {
  it('writes the chord on the first sixteenth and again mid-bar only when it changes', () => {
    expect(shown(chordCells(card, 3))).toEqual([[0, 'C']]);
    expect(shown(chordCells(card, 8))).toEqual([
      [0, 'F'],
      [8, 'G'],
    ]);
  });

  it('draws the strum marks and greys the weak hits', () => {
    const cells = strumCells(['down', 'up', null, 'mute'], 'Xx.X');
    expect(cells.slice(0, 4).map((cell) => [cell.text, cell.isWeak])).toEqual([
      ['↓', false],
      ['↑', true],
      ['', false],
      ['×', false],
    ]);
    expect(cells).toHaveLength(16);
  });

  it('tells hits from ghosts in a drum pattern', () => {
    expect(shown(hitCells('X...x.......X...'))).toEqual([
      [0, '●'],
      [4, '•'],
      [12, '●'],
    ]);
  });

  it('spans a bass note over its length and drops the octave from its name', () => {
    const cells = bassCells([
      { slot: 0, sixteenths: 6, note: 'C2', degree: '1' },
      { slot: 8, sixteenths: 4, note: 'G2', degree: '5' },
    ]);
    expect(cells.filter((cell) => cell.tone === 'note')).toEqual([
      { slot: 0, span: 6, tone: 'note', text: 'C' },
      { slot: 8, span: 4, tone: 'note', text: 'G' },
    ]);
    expect(cells.reduce((sum, cell) => sum + cell.span, 0)).toBe(16);
    expect(coversSlot(cells[0], 5)).toBe(true);
    expect(coversSlot(cells[0], 6)).toBe(false);
  });
});
