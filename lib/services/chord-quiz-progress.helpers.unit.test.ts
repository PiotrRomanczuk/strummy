import {
  bestStreak,
  heartsLeft,
  levelFor,
  quizStreak,
  sessionCount,
  xpFor,
} from './chord-quiz-progress.helpers';

const at = (d: string) => new Date(`${d}T18:00:00`).toISOString();
const NOW = new Date('2026-10-10T20:00:00');

describe('chord quiz progress helpers', () => {
  it('turns correct answers into XP and levels', () => {
    expect(xpFor(12)).toBe(120);
    expect(levelFor(0)).toEqual({ level: 1, toNext: 250 });
    expect(levelFor(260)).toEqual({ level: 2, toNext: 240 });
  });

  it('counts hearts down and never below zero', () => {
    expect(heartsLeft(0)).toBe(5);
    expect(heartsLeft(2)).toBe(3);
    expect(heartsLeft(9)).toBe(0);
  });

  it('keeps a streak alive until midnight', () => {
    expect(quizStreak([at('2026-10-10'), at('2026-10-09'), at('2026-10-08')], NOW)).toBe(3);
    expect(quizStreak([at('2026-10-09'), at('2026-10-08')], NOW)).toBe(2);
    expect(quizStreak([at('2026-10-07')], NOW)).toBe(0);
  });

  it('finds the longest run and counts sessions by timestamp', () => {
    const history = [at('2026-10-01'), at('2026-10-02'), at('2026-10-03'), at('2026-10-09')];
    expect(bestStreak(history)).toBe(3);
    expect(sessionCount([history[0], history[0], history[1]])).toBe(2);
  });
});
