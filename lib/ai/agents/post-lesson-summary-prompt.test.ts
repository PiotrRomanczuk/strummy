import { buildSummaryUserMessage, polishDate } from './post-lesson-summary-prompt';

const input = {
  studentFirstName: 'Ola',
  lessonDate: '2026-10-20T15:30:00+00:00',
  songs: [{ title: "Don't Panic", artist: 'Coldplay', status: 'slow_tempo', notes: 'palec wraca\ndopiero na raz' }],
  teacherNotes: '## Technika\n- kciuk tłumi 6. strunę',
  homework: null,
  nextLessonDate: '2026-10-27T15:30:00+00:00',
};

describe('polishDate', () => {
  it('writes the day and the Polish month in the genitive', () => {
    expect(polishDate('2026-10-27T15:30:00Z')).toBe('27 października');
    expect(polishDate('2026-01-05')).toBe('5 stycznia');
  });
});

describe('buildSummaryUserMessage', () => {
  it('gives the model the lesson facts with Polish statuses and spoken dates', () => {
    const message = buildSummaryUserMessage(input);
    expect(message).toContain("Don't Panic – Coldplay (wolne tempo; palec wraca dopiero na raz)");
    expect(message).toContain('lesson_date: 20 października');
    expect(message).toContain('next_lesson: 27 października');
    expect(message).not.toMatch(/2026-10-/);
  });

  it('says there is no homework instead of leaving the model to invent it', () => {
    expect(buildSummaryUserMessage(input)).toContain('homework: brak pracy domowej');
  });

  it('lists the homework checklist when there is one', () => {
    const message = buildSummaryUserMessage({ ...input, homework: { title: 'Zwrotka', checklist: ['5 minut dziennie'] } });
    expect(message).toContain('homework: Zwrotka: 5 minut dziennie');
  });
});
