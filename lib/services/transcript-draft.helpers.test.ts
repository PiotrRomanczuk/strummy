import {
  anonymiseTranscript,
  appendNotes,
  EMPTY_ACCEPTED,
  markAccepted,
  resolveSongMatch,
  STUDENT_PLACEHOLDER,
} from './transcript-draft.helpers';

describe('anonymiseTranscript', () => {
  const names = { fullName: 'Piotr Kowalski', firstName: 'Piotr' };

  it('replaces the full name, the first name and the surname with the placeholder', () => {
    const out = anonymiseTranscript(
      'Piotr Kowalski gra. Piotr, zagraj. Kowalski, super. piotr też.',
      names
    );
    expect(out).toBe(
      `${STUDENT_PLACEHOLDER} gra. ${STUDENT_PLACEHOLDER}, zagraj. ${STUDENT_PLACEHOLDER}, super. ${STUDENT_PLACEHOLDER} też.`
    );
  });

  it('covers Polish declension of names with four or more letters', () => {
    const out = anonymiseTranscript('Mówię do Piotra. Piotrze, graj! Z Kubą. Ani się udało.', {
      fullName: 'Kuba Nowak',
      firstName: 'Ania',
    });
    expect(out).toContain('Z Uczeń.');
    expect(out).toContain('Uczeń się udało.');
    // Piotr is not the student here — untouched.
    expect(out).toContain('Piotra');
  });

  it('matches short names whole-word only', () => {
    const out = anonymiseTranscript('Ewa gra. Ewangelia nie.', {
      fullName: 'Ewa Lis',
      firstName: 'Ewa',
    });
    expect(out).toBe('Uczeń gra. Ewangelia nie.');
  });

  it('leaves the text alone when there is no name', () => {
    expect(anonymiseTranscript('Nic tu nie ma.', { fullName: null, firstName: null })).toBe(
      'Nic tu nie ma.'
    );
  });

  it('does not touch words that merely contain the name', () => {
    expect(
      anonymiseTranscript('Jan i Janusz i trojan.', { fullName: 'Jan', firstName: 'Jan' })
    ).toBe('Uczeń i Janusz i trojan.');
  });
});

describe('resolveSongMatch', () => {
  const row = (title: string, similarity: number) => ({
    id: `id-${title}`,
    title,
    author: 'Queen',
    similarity,
  });

  it('is "new" without hits', () => {
    expect(resolveSongMatch([])).toEqual({ match: 'new' });
    expect(resolveSongMatch(null)).toEqual({ match: 'new' });
  });

  it('is "matched" at or above 0.6, taking the best hit', () => {
    const res = resolveSongMatch([row('Hammer', 0.4), row('Now', 0.6)]);
    expect(res).toMatchObject({ match: 'matched', songId: 'id-Now', similarity: 0.6 });
  });

  it('is a candidate list below 0.6, best first', () => {
    const res = resolveSongMatch([row('A', 0.35), row('B', 0.5)]);
    expect(res.match).toBe('candidates');
    if (res.match === 'candidates') {
      expect(res.candidates.map((c) => c.songId)).toEqual(['id-B', 'id-A']);
    }
  });

  it('turns an empty author into null', () => {
    const res = resolveSongMatch([{ id: 'x', title: 'T', author: '', similarity: 0.9 }]);
    expect(res).toMatchObject({ match: 'matched', author: null });
  });
});

describe('markAccepted', () => {
  it('flags notes and appends indexes once, sorted', () => {
    let acc = markAccepted(EMPTY_ACCEPTED, { kind: 'notes' });
    acc = markAccepted(acc, { kind: 'songs', index: 2 });
    acc = markAccepted(acc, { kind: 'songs', index: 0 });
    acc = markAccepted(acc, { kind: 'songs', index: 2 });
    expect(acc).toEqual({ notes: true, songs: [0, 2], homework: [], nextLesson: [] });
  });
});

describe('appendNotes', () => {
  it('returns the block alone when there are no notes', () => {
    expect(appendNotes(null, '  nowe  ')).toBe('nowe');
    expect(appendNotes('   ', 'nowe')).toBe('nowe');
  });

  it('appends after a --- rule, never overwriting', () => {
    expect(appendNotes('stare', 'nowe')).toBe('stare\n\n---\n\nnowe');
  });
});
