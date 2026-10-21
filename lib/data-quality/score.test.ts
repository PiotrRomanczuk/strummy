import { CRITICAL_CAP, bandFor, scoreCollection, scoreRecord, buildContext } from './score';
import type { QualityProfile } from './quality.types';

type Item = { id: string; name: string | null; size: number | null; isDraft: boolean };

const profile: QualityProfile<Item> = {
  entity: 'song',
  identityOf: (i) => i.name?.toLowerCase() ?? null,
  rules: [
    { id: 'name', dimension: 'validity', weight: 5, isCritical: true, check: (i) => !!i.name },
    { id: 'size', dimension: 'completeness', weight: 3, check: (i) => i.size !== null },
    {
      id: 'draft-only',
      dimension: 'consistency',
      weight: 2,
      appliesTo: (i) => i.isDraft,
      check: () => false,
    },
    {
      id: 'unique',
      dimension: 'uniqueness',
      weight: 2,
      check: (i, ctx) => (ctx.identityCounts.get(i.name?.toLowerCase() ?? '') ?? 0) <= 1,
    },
  ],
};

const item = (overrides: Partial<Item> = {}): Item => ({
  id: 'a',
  name: 'Wonderwall',
  size: 1,
  isDraft: false,
  ...overrides,
});

const score = (i: Item, all: Item[] = [i]) => scoreRecord(profile, i, buildContext(profile, all));

describe('scoreRecord', () => {
  it('scores a complete record 100 and skips rules that do not apply', () => {
    const result = score(item());
    expect(result.score).toBe(100);
    expect(result.failedRuleIds).toEqual([]);
    expect(result.band).toBe('good');
  });

  it('weights failures: missing size costs 3 of 10 applicable points', () => {
    expect(score(item({ size: null })).score).toBe(70);
  });

  it('counts a rule that applies (draft) in the denominator', () => {
    // 12 applicable, 10 passed.
    expect(score(item({ isDraft: true })).score).toBe(83);
  });

  it('caps the score when a critical rule fails', () => {
    const result = score(item({ name: null }));
    expect(result.hasCriticalFailure).toBe(true);
    expect(result.score).toBeLessThanOrEqual(CRITICAL_CAP);
    expect(result.failedRuleIds[0]).toBe('name');
  });

  it('flags duplicates using collection context', () => {
    const a = item({ id: 'a' });
    const b = item({ id: 'b', name: 'WONDERWALL' });
    expect(score(a, [a, b]).failedRuleIds).toContain('unique');
  });
});

describe('scoreCollection', () => {
  it('summarises bands, average and an impact-ordered fix queue', () => {
    const records = [
      item({ id: '1' }),
      item({ id: '2', name: 'A', size: null }),
      item({ id: '3', name: 'B', size: null }),
      item({ id: '4', name: null }),
    ];
    const result = scoreCollection(profile, records);

    expect(result.total).toBe(4);
    expect(result.bands).toEqual({ good: 1, fair: 2, poor: 1 });
    expect(result.records[0].id).toBe('4');
    // One critical failure (5 × 10) outranks two size failures (2 × 3).
    expect(result.fixQueue.map((r) => r.ruleId)).toEqual(['name', 'size']);
    expect(result.fixQueue[1]).toMatchObject({ failing: 2, applicable: 4 });
  });

  it('handles an empty collection', () => {
    expect(scoreCollection(profile, []).averageScore).toBe(100);
  });
});

describe('bandFor', () => {
  it.each([
    [85, 'good'],
    [84, 'fair'],
    [60, 'fair'],
    [59, 'poor'],
  ])('%i → %s', (value, band) => {
    expect(bandFor(value)).toBe(band);
  });
});
