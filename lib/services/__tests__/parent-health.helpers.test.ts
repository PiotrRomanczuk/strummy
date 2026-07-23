import {
  bucketPracticeDays,
  currentStreak,
  formatPracticeMinutes,
  summarisePracticeWeek,
  type PracticeDay,
} from '../parent-health.helpers';

// Fixed reference "now" so day bucketing is deterministic (UTC).
const NOW = new Date('2026-07-23T12:00:00Z');

describe('bucketPracticeDays', () => {
  it('produces a fixed 7-day window ending on `now`, oldest first', () => {
    const days = bucketPracticeDays([], NOW, 7);
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe('2026-07-17');
    expect(days[6].date).toBe('2026-07-23');
  });

  it('sums same-day sessions and flags days with no practice', () => {
    const days = bucketPracticeDays(
      [
        { createdAt: '2026-07-23T08:00:00Z', minutes: 20 },
        { createdAt: '2026-07-23T18:00:00Z', minutes: 15 },
        { createdAt: '2026-07-21T10:00:00Z', minutes: 40 },
      ],
      NOW,
      7
    );

    const today = days[6];
    const gapDay = days.find((d) => d.date === '2026-07-22')!;
    expect(today.minutes).toBe(35);
    expect(today.hasPractice).toBe(true);
    expect(gapDay.minutes).toBe(0);
    expect(gapDay.hasPractice).toBe(false);
  });

  it('ignores sessions with a null timestamp and clamps negative minutes', () => {
    const days = bucketPracticeDays(
      [
        { createdAt: null, minutes: 99 },
        { createdAt: '2026-07-23T08:00:00Z', minutes: -10 },
      ],
      NOW,
      7
    );
    expect(days[6].minutes).toBe(0);
  });
});

describe('summarisePracticeWeek', () => {
  const build = (minutes: number[]): PracticeDay[] =>
    minutes.map((m, i) => ({ date: `d${i}`, label: 'Mon', minutes: m, hasPractice: m > 0 }));

  it('marks a week on track once it clears 70% of the weekly goal', () => {
    // 130 min over 7 days, goal 20/day → weeklyGoal 140, threshold round(98) = 98.
    const week = summarisePracticeWeek(build([35, 25, 40, 0, 30, 0, 0]), 20);
    expect(week.totalMinutes).toBe(130);
    expect(week.activeDays).toBe(4);
    expect(week.weeklyGoal).toBe(140);
    expect(week.onTrack).toBe(true);
  });

  it('marks a thin week as needs-attention (below threshold)', () => {
    const week = summarisePracticeWeek(build([20, 0, 20, 0, 0, 0, 0]), 20);
    expect(week.totalMinutes).toBe(40);
    expect(week.onTrack).toBe(false);
  });

  it('treats a zero daily goal as trivially on track', () => {
    const week = summarisePracticeWeek(build([0, 0, 0, 0, 0, 0, 0]), 0);
    expect(week.weeklyGoal).toBe(0);
    expect(week.onTrack).toBe(true);
  });
});

describe('currentStreak', () => {
  const build = (flags: boolean[]): PracticeDay[] =>
    flags.map((f, i) => ({ date: `d${i}`, label: 'Mon', minutes: f ? 30 : 0, hasPractice: f }));

  it('counts consecutive practiced days ending on the most recent day', () => {
    expect(currentStreak(build([true, false, true, true, true]))).toBe(3);
  });

  it('is zero when the most recent day has no practice', () => {
    expect(currentStreak(build([true, true, true, false]))).toBe(0);
  });

  it('counts the whole window when every day has practice', () => {
    expect(currentStreak(build([true, true, true]))).toBe(3);
  });
});

describe('formatPracticeMinutes', () => {
  it('formats minutes, whole hours, and mixed hours', () => {
    expect(formatPracticeMinutes(45)).toBe('45m');
    expect(formatPracticeMinutes(60)).toBe('1h');
    expect(formatPracticeMinutes(130)).toBe('2h 10m');
  });
});
