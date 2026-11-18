/**
 * @jest-environment node
 */
import type { SongChordReview } from '@/schemas/SongChordReviewSchema';

import { planChordFill, type ChordFillSong } from '../song-chord-fill-core';

const review: SongChordReview = {
  version: 1,
  status: 'no_sheet',
  reference: 'chord-id',
  sources: ['chord-id', 'analyze'],
  sheet_chords: [],
  heard_chords: ['Fm', 'Cm', 'Db', 'Eb'],
  main_chords: ['Fm', 'Cm', 'Db', 'Eb'],
  keys: { analyze: 'Fm', 'chord-id': 'Fm' },
  key_sources_agree: true,
  sounding_key: { tonic: 'F', scale: 'minor' },
};

const empty: ChordFillSong = { id: 'song-1', chords: null, capo_fret: null, key: null };

describe('planChordFill', () => {
  it('fills empty chords from Chord ID and the agreed sounding key', () => {
    expect(planChordFill(empty, review)).toEqual({ chords: 'Fm, Cm, Db, Eb', key: 'Fm' });
  });

  it('never replaces what a person wrote', () => {
    const written = { ...empty, chords: 'Am, G', capo_fret: 0, key: 'C' };
    expect(planChordFill(written, { ...review, capo_hint: 2 })).toEqual({});
  });

  it('does not fill chords from analyze alone, nor from a near-empty Chord ID', () => {
    expect(planChordFill(empty, { ...review, reference: 'analyze' }).chords).toBeUndefined();
    expect(planChordFill(empty, { ...review, main_chords: ['Fm'] }).chords).toBeUndefined();
  });

  it('fills the capo but leaves the key to the teacher when the chords are written for a capo', () => {
    const sheet = { ...empty, chords: 'Em, C, D' };
    const capoReview = { ...review, status: 'agree' as const, transpose: 1, capo_hint: 1 };
    expect(planChordFill(sheet, capoReview)).toEqual({ capo_fret: 1 });
  });

  it('trusts a capo only from Chord ID agreeing with the sheet', () => {
    const sheet = { ...empty, chords: 'Em, C, D' };
    const fromAnalyze = { ...review, reference: 'analyze' as const, status: 'check' as const };
    expect(planChordFill(sheet, { ...fromAnalyze, transpose: 4, capo_hint: 4 })).toEqual({});
  });

  it('leaves the key empty when the sources disagree', () => {
    expect(planChordFill(empty, { ...review, key_sources_agree: false }).key).toBeUndefined();
  });

  it('spells Ab minor the way music_key has it', () => {
    const abMinor = { ...review, sounding_key: { tonic: 'Ab', scale: 'minor' as const } };
    expect(planChordFill(empty, abMinor).key).toBe('G#m');
  });
});
