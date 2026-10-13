import {
  formatLessonClockShort,
  formatLessonDateParts,
  formatLessonMonthWeekday,
} from './lesson-format.helpers';

// Local time so the assertions hold in any CI timezone: Sat 17 Oct 2026, 18:30.
const iso = new Date(2026, 9, 17, 18, 30).toISOString();

describe('lesson-format helpers', () => {
  it('keep the English Claude Design shapes by default', () => {
    expect(formatLessonClockShort(iso)).toBe('6:30p');
    expect(formatLessonMonthWeekday(iso)).toEqual({ month: 'OCT', weekday: 'SAT' });
    expect(formatLessonDateParts(iso)).toEqual({ monthDay: 'OCT 17', weekdayYear: 'SAT · 2026' });
  });

  it('give Polish month/weekday names, day-first order and a 24-hour clock', () => {
    expect(formatLessonClockShort(iso, 'pl')).toBe('18:30');
    expect(formatLessonMonthWeekday(iso, 'pl')).toEqual({ month: 'PAŹ', weekday: 'SOB' });
    expect(formatLessonDateParts(iso, 'pl')).toEqual({
      monthDay: '17 PAŹ',
      weekdayYear: 'SOB · 2026',
    });
  });
});
