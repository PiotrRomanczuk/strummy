import { generateLessonCancellationHtml } from './lesson-cancellation';
import { generateLessonRecapHtml } from './lesson-recap';
import { generateLessonReminderHtml } from './lesson-reminder';
import { generateLessonRescheduledHtml } from './lesson-rescheduled-notification';

describe('lesson emails sent to a parent', () => {
  it('say whose lesson it is, in the email language', () => {
    const pl = generateLessonReminderHtml({
      studentName: 'Anna',
      lessonDate: 'poniedziałek',
      lessonTime: '17:00',
      locale: 'pl',
      guardianFor: 'Emma',
    });
    expect(pl).toContain('Ta wiadomość dotyczy lekcji ucznia: <strong>Emma</strong>');
    expect(pl).toContain('Cześć Anna,');
  });

  it('show the notice in every lesson template, and only when sent to a parent', () => {
    const forParent = [
      generateLessonRecapHtml({
        studentName: 'Anna',
        lessonDate: 'x',
        lessonTitle: 't',
        guardianFor: 'Emma',
      }),
      generateLessonCancellationHtml({
        studentName: 'Anna',
        teacherName: 'T',
        lessonDate: 'x',
        lessonTime: 'y',
        guardianFor: 'Emma',
      }),
      generateLessonRescheduledHtml({
        studentName: 'Anna',
        teacherName: 'T',
        oldDate: 'a',
        oldTime: 'b',
        newDate: 'c',
        newTime: 'd',
        guardianFor: 'Emma',
      }),
    ];
    for (const html of forParent) expect(html).toContain('<strong>Emma</strong>');

    const forStudent = generateLessonCancellationHtml({
      studentName: 'Emma',
      teacherName: 'T',
      lessonDate: 'x',
      lessonTime: 'y',
    });
    expect(forStudent).not.toContain('parent or guardian');
  });

  it('word the cancellation and reschedule as the lesson of the child, in the notice language', () => {
    const cancelled = generateLessonCancellationHtml({
      studentName: 'Anna',
      teacherName: 'T',
      lessonDate: 'x',
      lessonTime: 'y',
      locale: 'pl',
      guardianFor: 'Emma',
    });
    expect(cancelled).toContain('lesson for Emma has been cancelled');
    expect(cancelled).not.toContain('your upcoming guitar lesson');
    expect(cancelled).toContain('Ta wiadomość dotyczy lekcji ucznia: <strong>Emma</strong>');

    const moved = generateLessonRescheduledHtml({
      studentName: 'Anna',
      teacherName: 'T',
      oldDate: 'a',
      oldTime: 'b',
      newDate: 'c',
      newTime: 'd',
      locale: 'pl',
      guardianFor: 'Emma',
    });
    expect(moved).toContain('guitar lesson for Emma has been changed');
    expect(moved).toContain('Ta wiadomość dotyczy lekcji ucznia: <strong>Emma</strong>');
  });

  it("escapes the child's name", () => {
    const html = generateLessonReminderHtml({
      studentName: 'Anna',
      lessonDate: 'x',
      lessonTime: 'y',
      guardianFor: '<img src=x onerror=alert(1)>',
    });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});
