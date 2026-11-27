/**
 * @jest-environment node
 */
import { parseTechniqueLine, planTechniques } from '../song-techniques-core';

const ID = '2f1c3d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const text = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    song_id: ID,
    notes: 4552,
    techniques: { hammer_pull: 32, slide: 3, dead_note: 541, stroke_down: 383 },
    ...overrides,
  });

describe('parseTechniqueLine', () => {
  it('accepts a well-formed line', () => {
    const { line, problem } = parseTechniqueLine(text(), 1);
    expect(problem).toBeNull();
    expect(line?.notes).toBe(4552);
  });
  it.each([
    ['not json', '{oops'],
    ['bad id', text({ song_id: 'abc' })],
    ['zero notes', text({ notes: 0 })],
    ['unknown technique', text({ techniques: { flying: 3 } })],
    ['non-integer count', text({ techniques: { slide: 1.5 } })],
    ['zero count', text({ techniques: { slide: 0 } })],
  ])('rejects %s', (_name, input) => {
    const result = parseTechniqueLine(input, 7);
    expect(result.line).toBeNull();
    expect(result.problem).toContain('line 7');
  });
});

describe('planTechniques', () => {
  const line = parseTechniqueLine(text(), 1).line!;

  it('plans a row for a live song', () => {
    const planned = planTechniques(line, { id: ID, deleted_at: null });
    expect(planned.row).toEqual({
      song_id: ID,
      note_count: 4552,
      techniques: { hammer_pull: 32, slide: 3, dead_note: 541, stroke_down: 383 },
      source: 'tab',
    });
  });
  it('skips an unknown song', () => {
    expect(planTechniques(line, null).skip).toBe('unknown_song');
  });
  it('skips a soft-deleted song', () => {
    expect(planTechniques(line, { id: ID, deleted_at: '2026-11-01T00:00:00Z' }).skip).toBe(
      'deleted'
    );
  });
});
