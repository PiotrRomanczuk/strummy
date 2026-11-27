import { hasTechnique, isMainTechnique, songTechniques, strengthOf } from './song-techniques';

describe('hasTechnique', () => {
  it('needs 8 marks and 1% of the notes', () => {
    expect(hasTechnique(8, 800)).toBe(true);
    expect(hasTechnique(7, 100)).toBe(false);
    expect(hasTechnique(8, 801)).toBe(false);
  });
  it('accepts 25 marks whatever the share', () => {
    expect(hasTechnique(25, 100000)).toBe(true);
    expect(hasTechnique(24, 100000)).toBe(false);
  });
  it('rejects empty input', () => {
    expect(hasTechnique(0, 100)).toBe(false);
    expect(hasTechnique(10, 0)).toBe(false);
  });
});

describe('strengthOf', () => {
  it('steps at 3% and 10%', () => {
    expect(strengthOf(0.029)).toBe('little');
    expect(strengthOf(0.03)).toBe('regular');
    expect(strengthOf(0.099)).toBe('regular');
    expect(strengthOf(0.1)).toBe('lot');
  });
});

describe('songTechniques', () => {
  it('orders by density and leaves out strokes and minor techniques', () => {
    const result = songTechniques(
      { hammer_pull: 32, slide: 30, dead_note: 541, stroke_down: 383, ghost: 90, bend: 3 },
      4552
    );
    expect(result.map((t) => t.key)).toEqual(['dead_note', 'hammer_pull', 'slide']);
    expect(result[0].strength).toBe('lot');
    expect(result[1].strength).toBe('little');
    expect(songTechniques({ bend: 50 }, 1000)[0].strength).toBe('regular');
  });
  it('ignores non-numeric values', () => {
    expect(songTechniques({ slide: 'x' }, 100)).toEqual([]);
  });
});

describe('isMainTechnique', () => {
  it('knows the catalogue', () => {
    expect(isMainTechnique('slide')).toBe(true);
    expect(isMainTechnique('stroke_up')).toBe(false);
  });
});
