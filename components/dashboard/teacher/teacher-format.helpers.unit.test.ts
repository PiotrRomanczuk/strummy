import {
  formatClock,
  formatHourLabel,
  greetingKeyFor,
  levelLabel,
  narrowWeekday,
} from './teacher-format.helpers';
import { attentionReasonText, buildAttentionFlags } from './teacher-attention.helpers';

// Local-time ISO so the assertions hold in any CI timezone.
const at = (h: number, m = 0) => new Date(2026, 9, 13, h, m).toISOString();

describe('formatClock', () => {
  it('keeps the compact English "4:00p"', () => {
    expect(formatClock(at(16), 'en')).toBe('4:00p');
  });

  it('uses a 24-hour clock for Polish — "4:00p" means nothing there', () => {
    expect(formatClock(at(16), 'pl')).toBe('16:00');
    expect(formatClock(at(9, 5), 'pl')).toBe('09:05');
  });
});

describe('formatHourLabel', () => {
  it('reads 9a / 12p / 1p in English and 9:00 / 13:00 in Polish', () => {
    expect([9, 12, 13].map((h) => formatHourLabel(h, 'en'))).toEqual(['9a', '12p', '1p']);
    expect([9, 13].map((h) => formatHourLabel(h, 'pl'))).toEqual(['9:00', '13:00']);
  });
});

describe('narrowWeekday', () => {
  it('gives the Polish initial for a date (Tuesday → W, Wednesday → Ś)', () => {
    expect(narrowWeekday('2026-10-13', 'pl')).toBe('W');
    expect(narrowWeekday('2026-10-14', 'pl')).toBe('Ś');
    expect(narrowWeekday('2026-10-12', 'en')).toBe('M');
  });
});

describe('greetingKeyFor', () => {
  it.each([
    [3, 'greetingStillHere'],
    [9, 'greetingMorning'],
    [14, 'greetingAfternoon'],
    [19, 'greetingEvening'],
    [23, 'greetingLateNight'],
  ])('%ih → %s', (hour, key) => {
    expect(greetingKeyFor(new Date(2026, 9, 13, hour))).toBe(key);
  });
});

describe('levelLabel', () => {
  const t = (key: string) => `[${key}]`;
  it('translates known levels case-insensitively and passes unknown ones through', () => {
    expect(levelLabel(t, 'Beginner')).toBe('[level.beginner]');
    expect(levelLabel(t, 'virtuoso')).toBe('virtuoso');
  });
});

describe('attention flags', () => {
  const now = new Date(2026, 9, 13, 12);
  const t = (key: string, v?: Record<string, number>) => `${key}:${JSON.stringify(v ?? {})}`;

  it('returns reasons as data and renders them through the translator', () => {
    const flags = buildAttentionFlags(
      [
        {
          studentId: 's1',
          name: 'A',
          email: 'a@x',
          lastPracticedAt: null,
          daysSincePractice: null,
        },
        { studentId: 's2', name: 'B', email: 'b@x', lastPracticedAt: null, daysSincePractice: 9 },
      ],
      [
        {
          id: 'as1',
          title: 'Worksheet',
          studentName: 'C',
          studentEmail: 'c@x',
          dueDate: new Date(2026, 9, 11, 12).toISOString(),
        },
      ],
      now
    );
    expect(flags.map((f) => f.reason)).toEqual([
      { kind: 'noPracticeYet' },
      { kind: 'noPracticeDays', days: 9 },
      { kind: 'overdue', days: 2 },
    ]);
    expect(flags.map((f) => attentionReasonText(t, f.reason))).toEqual([
      'reasonNoPracticeYet:{}',
      'reasonNoPracticeDays:{"days":9}',
      'reasonOverdue:{"days":2}',
    ]);
  });

  it('puts new students to invite first, linking to their profile', () => {
    const flags = buildAttentionFlags(
      [{ studentId: 's2', name: 'B', email: 'b@x', lastPracticedAt: null, daysSincePractice: 9 }],
      [],
      now,
      5,
      [{ studentId: 's9', name: 'Nowa', email: 'n@x', firstLessonAt: '2026-10-12T17:30:00Z' }]
    );
    expect(flags[0]).toMatchObject({
      key: 'i-s9',
      href: '/dashboard/users/s9',
      reason: { kind: 'inviteAfterFirstLesson' },
    });
    expect(attentionReasonText(t, flags[0].reason)).toBe('reasonInviteAfterFirstLesson:{}');
  });
});
