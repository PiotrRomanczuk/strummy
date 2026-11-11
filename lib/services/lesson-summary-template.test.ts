import { buildTemplateSummary } from './lesson-summary-template';

const base = {
  studentFirstName: 'Ania',
  lessonDate: '2026-10-28T15:00:00Z',
  songs: [],
  teacherNotes: null,
  homework: null,
  nextLessonDate: null,
};

describe('buildTemplateSummary', () => {
  it('builds the whole message from the lesson data', () => {
    const text = buildTemplateSummary({
      ...base,
      songs: [
        { title: 'Wonderwall', artist: 'Oasis', status: 'started', notes: null },
        { title: 'Etiuda', artist: null, status: null, notes: null },
      ],
      teacherNotes: 'Pilnuj bicia w refrenie.',
      homework: { title: 'Zmiany Em-G', checklist: ['Metronom 70'] },
      nextLessonDate: '2026-11-04T15:00:00Z',
    });

    expect(text).toBe(
      [
        'Cześć Ania,\nkrótko po lekcji z 28 października.',
        'Piosenki:\n- Wonderwall (Oasis): rozpoczęta\n- Etiuda',
        'Pilnuj bicia w refrenie.',
        'Na następny raz:\n- Zmiany Em-G\n- Metronom 70',
        'Do zobaczenia 4 listopada.',
        'Piotr',
      ].join('\n\n')
    );
  });

  it('leaves out what the lesson does not have', () => {
    expect(buildTemplateSummary({ ...base, teacherNotes: 'Dobra lekcja.' })).toBe(
      'Cześć Ania,\nkrótko po lekcji z 28 października.\n\nDobra lekcja.\n\nPiotr'
    );
  });

  it('drops working markers from the notes', () => {
    const text = buildTemplateSummary({ ...base, teacherNotes: 'seed:lesson-12\nBarre na F.' });

    expect(text).toContain('Barre na F.');
    expect(text).not.toContain('seed:');
  });

  it('shows an unknown status as no status rather than the raw value', () => {
    const songs = [{ title: 'Blackbird', artist: null, status: 'weird', notes: null }];

    expect(buildTemplateSummary({ ...base, songs })).toContain('- Blackbird\n');
  });
});
