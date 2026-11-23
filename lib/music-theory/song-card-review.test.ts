import { songCardFromRows } from '@/lib/services/song-card-queries';

import type { SongCard } from './song-card';
import {
  applyReviewPatch,
  codeFromMarks,
  EMPTY_REVIEW,
  isApproved,
  marksFromCode,
  nextChordFor,
  nextMark,
  partOfBar,
  strumOfBar,
} from './song-card-review';
import { CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW } from './song-card.fixture';

const card = songCardFromRows(CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW) as SongCard;

describe('song card review', () => {
  it('approves and withdraws a group of parts', () => {
    const approved = applyReviewPatch(EMPTY_REVIEW, {
      kind: 'approve',
      group: 'verse:I',
      isApproved: true,
    });
    expect(isApproved(approved, card.parts[1])).toBe(true);
    expect(isApproved(approved, card.parts[2])).toBe(false);
    expect(isApproved(approved, null)).toBe(true);
    const again = applyReviewPatch(approved, {
      kind: 'approve',
      group: 'verse:I',
      isApproved: true,
    });
    expect(again.approvedGroups).toEqual(['verse:I']);
    const withdrawn = applyReviewPatch(again, {
      kind: 'approve',
      group: 'verse:I',
      isApproved: false,
    });
    expect(withdrawn.approvedGroups).toEqual([]);
  });

  it('sets and clears a bar chord and a group strum', () => {
    const edited = applyReviewPatch(EMPTY_REVIEW, { kind: 'chord', bar: 4, chord: 'Am' });
    expect(edited.chordEdits).toEqual({ 4: 'Am' });
    expect(applyReviewPatch(edited, { kind: 'chord', bar: 4, chord: null }).chordEdits).toEqual({});
    const code = 'd.u.d.u.d.u.d.u.';
    const strummed = applyReviewPatch(EMPTY_REVIEW, { kind: 'strum', group: 'verse:I', code });
    expect(strummed.strums).toEqual({ 'verse:I': code });
    expect(
      applyReviewPatch(strummed, { kind: 'strum', group: 'verse:I', code: null }).strums
    ).toEqual({});
  });

  it('reads a bar strum from its group, else from the analysis with the rule', () => {
    const review = { ...EMPTY_REVIEW, strums: { 'verse:I': 'dudu............' } };
    expect(strumOfBar(card, review, 4)?.slice(0, 4)).toEqual(['down', 'up', 'down', 'up']);
    expect(strumOfBar(card, review, 0)?.slice(0, 2)).toEqual(['down', null]);
    expect(strumOfBar({ ...card, strum: null }, EMPTY_REVIEW, 0)).toBeNull();
  });

  it('turns marks into the stored code and back, and cycles a cell', () => {
    expect(codeFromMarks(['down', 'up', 'mute', null])).toBe('dum.');
    expect(marksFromCode('dum.')).toEqual(['down', 'up', 'mute', null]);
    expect([nextMark('down'), nextMark('up'), nextMark('mute'), nextMark(null)]).toEqual([
      'up',
      'mute',
      null,
      'down',
    ]);
  });

  it('finds the part of a bar and the next chord to try', () => {
    expect(partOfBar(card, 8)?.kind).toBe('chorus');
    expect(partOfBar({ ...card, parts: [] }, 8)).toBeNull();
    expect(nextChordFor(['Am', 'F', 'C', 'G'], 'G')).toBe('Am');
    expect(nextChordFor([], 'G')).toBe('G');
  });
});
