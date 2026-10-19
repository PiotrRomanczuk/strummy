/**
 * @jest-environment node
 */

import type { DraftSong } from '@/lib/ai/schemas/lesson-transcript-draft';

import {
  bestMatch,
  normalizeTitle,
  similarity,
  type CatalogSong,
} from '../lesson-transcript-draft-matching';
import { withDiminutives } from '../lesson-transcript-draft-context';

const song = (overrides: Partial<DraftSong>): DraftSong => ({
  heardTitle: 'Song',
  heardArtist: null,
  catalogTitle: null,
  role: 'practiced',
  status: 'started',
  sections: [],
  notes: [],
  songFacts: { capoFret: null, strummingPattern: null, chords: [] },
  confidence: 0.8,
  evidence: '',
  ...overrides,
});

const CATALOG: CatalogSong[] = [
  { id: '11111111-1111-4111-8111-111111111111', title: 'Blitzkrieg Bop', author: 'Ramones' },
  { id: '22222222-2222-4222-8222-222222222222', title: "Now I'm Here", author: 'Queen' },
  { id: '33333333-3333-4333-8333-333333333333', title: 'Cocaine', author: 'Eric Clapton' },
];

describe('normalizeTitle / similarity', () => {
  it('drops case, diacritics, punctuation and a leading "the"', () => {
    expect(normalizeTitle("The Now I'm Here!")).toBe('now i m here');
    expect(normalizeTitle('Łąka')).toBe('laka');
  });

  it('scores misheard titles high and unrelated ones low', () => {
    expect(similarity('Blitzkrieg Pub', 'Blitzkrieg Bop')).toBeGreaterThan(0.7);
    expect(similarity('Cocaine', 'Blitzkrieg Bop')).toBeLessThan(0.2);
  });
});

describe('bestMatch', () => {
  it('fixes a speech-recognition mishearing with the artist as a tie-breaker', () => {
    const match = bestMatch(song({ heardTitle: 'Blitzkrieg Pub', heardArtist: 'Ramones' }), CATALOG);
    expect(match).toMatchObject({ songId: CATALOG[0].id, title: 'Blitzkrieg Bop' });
  });

  it('trusts catalogTitle when the agent picked a known song', () => {
    const match = bestMatch(song({ heardTitle: 'riff Queenów', catalogTitle: "Now I'm Here" }), CATALOG);
    expect(match).toEqual({ songId: CATALOG[1].id, title: "Now I'm Here", author: 'Queen', score: 1 });
  });

  it('ignores the artist when the model glued it onto the title', () => {
    const match = bestMatch(song({ heardTitle: 'Cocaine Clapton', heardArtist: 'Eric Clapton' }), CATALOG);
    expect(match).toMatchObject({ songId: CATALOG[2].id, title: 'Cocaine' });
  });

  it('returns no song below the threshold but keeps the best score', () => {
    const match = bestMatch(song({ heardTitle: 'Smoke on the Water' }), CATALOG);
    expect(match.songId).toBeNull();
    expect(match.score).toBeLessThan(0.6);
  });

  it('handles an empty candidate list', () => {
    expect(bestMatch(song({}), [])).toEqual({ songId: null, title: null, author: null, score: 0 });
  });
});

describe('withDiminutives', () => {
  it('adds spoken forms of Polish first names', () => {
    expect(withDiminutives(['Jakub Nowak'])).toEqual(['Jakub Nowak', 'Kuba', 'Kubuś']);
    expect(withDiminutives(['Zenon'])).toEqual(['Zenon']);
  });
});
