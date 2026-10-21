import { generateLessonRecapHtml } from '../lesson-recap';

describe('lesson recap with the teacher summary', () => {
  const html = generateLessonRecapHtml({
    studentName: 'Ola',
    lessonDate: '20 października',
    summary: 'Cześć Ola,\n\nzwrotka <b>idzie</b> coraz lepiej.\n\nPiotr',
    lessonId: 'lesson-1',
    locale: 'pl',
  });

  it('puts the teacher message in place of the generic greeting, escaped', () => {
    expect(html).toContain('Cześć Ola,');
    expect(html).toContain('&lt;b&gt;idzie&lt;/b&gt;');
    expect(html).not.toContain('Oto podsumowanie Twojej lekcji');
  });

  it('links the button to the lesson and uses the Polish subject', () => {
    expect(html).toContain('/dashboard/lessons/lesson-1');
    expect(html).toContain('Otwórz lekcję');
    expect(html).toContain('Podsumowanie lekcji z 20 października');
  });
});
