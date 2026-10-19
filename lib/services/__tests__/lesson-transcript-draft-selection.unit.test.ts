/**
 * @jest-environment node
 */

import type { ResolvedLessonDraft } from '@/lib/ai/schemas/lesson-transcript-draft';
import { LessonDraftApplySchema } from '@/schemas/LessonDraftApplySchema';

import { composeLessonNotes, defaultSelection } from '../lesson-transcript-draft-selection';

const QUEEN = '22222222-2222-4222-8222-222222222222';
const CLAPTON = '33333333-3333-4333-8333-333333333333';
const SKILL = '44444444-4444-4444-8444-444444444444';

type Song = ResolvedLessonDraft['songs'][number];
const song = (o: Partial<Song>): Song => ({
  heardTitle: 'X',
  heardArtist: null,
  catalogTitle: null,
  role: 'practiced',
  status: 'started',
  sections: [],
  notes: [],
  songFacts: { capoFret: null, strummingPattern: null, chords: [] },
  confidence: 0.9,
  evidence: '',
  match: { songId: null, title: null, author: null, score: 0 },
  ...o,
});

// The 2026-10-18 lesson from the CNT-8 brief, as the agent would see it.
const draft: ResolvedLessonDraft = {
  isGuitarLesson: true,
  lessonTitle: 'Power chordy: Queen i Clapton',
  songs: [
    song({ heardTitle: 'riff Queenów', status: 'started', sections: ['intro', 'riff 2'], notes: ['Palm muting lżej'], match: { songId: QUEEN, title: "Now I'm Here", author: 'Queen', score: 1 } }),
    song({ heardTitle: 'Cocaine', status: 'slow_tempo', notes: ['Refren wolniej'], match: { songId: CLAPTON, title: 'Cocaine', author: 'Eric Clapton', score: 1 } }),
    song({ heardTitle: 'Blitzkrieg Bop', heardArtist: 'Ramones', role: 'homework', status: null, confidence: 0.85 }),
    song({ heardTitle: 'Smoke on the Water', role: 'mentioned' }),
    song({ heardTitle: 'Coś z radia', confidence: 0.4 }),
  ],
  assignment: {
    title: 'Blitzkrieg Bop',
    description: 'Rozpracuj ze słuchu.',
    checklist: ['Znajdź akordy'],
    songTitles: ['Cocaine'],
    dailyTargetMinutes: null,
    submissionType: 'self_report',
    isExplicit: true,
    confidence: 0.6,
    evidence: '',
  },
  skills: [
    { skillName: 'Palm muting', isFromCatalog: true, status: 'developing', note: 'lżej', confidence: 0.8, evidence: '', skillId: SKILL },
    { skillName: 'Tłumienie', isFromCatalog: false, status: 'developing', note: '', confidence: 0.9, evidence: '', skillId: null },
  ],
  notes: { technique: ['Tłumienie lewą ręką'], theory: [], wentWell: ['Riff zagrany czysto'], needsWork: [], other: [] },
  teacherCommitments: ['Wysłać tabulatury'],
  profileHints: [],
  logistics: [],
  questions: [],
};

describe('defaultSelection', () => {
  const selection = defaultSelection(draft, '2026-10-19');

  it('produces a valid apply payload', () => {
    expect(LessonDraftApplySchema.safeParse(selection).success).toBe(true);
  });

  it('keeps matched songs, adds a confident unmatched homework song as new, drops mentions and guesses', () => {
    expect(selection.songs).toEqual([
      { songId: QUEEN, newSong: null, status: 'started', notes: 'Palm muting lżej' },
      { songId: CLAPTON, newSong: null, status: 'slow_tempo', notes: 'Refren wolniej' },
      { songId: null, newSong: { title: 'Blitzkrieg Bop', author: 'Ramones' }, status: 'to_learn', notes: '' },
    ]);
  });

  it('includes explicit homework linked to its matched song, never marks the lesson completed', () => {
    expect(selection.assignment).toMatchObject({ title: 'Blitzkrieg Bop', songId: CLAPTON, dueDate: null });
    expect(selection.markCompleted).toBe(false);
  });

  it('only takes skills that exist in the catalog', () => {
    expect(selection.skills).toEqual([{ skillId: SKILL, status: 'developing', note: 'lżej' }]);
  });

  it('skips homework that was neither explicit nor confident', () => {
    const vague = { ...draft, assignment: { ...draft.assignment!, isExplicit: false, confidence: 0.5 } };
    expect(defaultSelection(vague, '2026-10-19').assignment).toBeNull();
  });
});

describe('composeLessonNotes', () => {
  it('writes the blueprint structure with catalog titles and Polish status labels', () => {
    const notes = composeLessonNotes(draft, '2026-10-19');
    expect(notes).toContain("### Now I'm Here (Queen) — rozpoczęta");
    expect(notes).toContain('- Zakres: intro, riff 2');
    expect(notes).toContain('### Cocaine (Eric Clapton) — wolne tempo');
    expect(notes).toContain('## Technika\n- Tłumienie lewą ręką');
    expect(notes).toContain('## Ocena\n- Dobrze: Riff zagrany czysto');
    expect(notes).not.toContain('Smoke on the Water');
    expect(notes).not.toContain('## Teoria');
    expect(notes.endsWith('_Źródło: nagranie lekcji, szkic zatwierdzony 2026-10-19_')).toBe(true);
  });

  it('returns an empty string for an empty draft', () => {
    const empty = { ...draft, songs: [], notes: { technique: [], theory: [], wentWell: [], needsWork: [], other: [] } };
    expect(composeLessonNotes(empty, '2026-10-19')).toBe('');
  });
});
