/**
 * @jest-environment node
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  dedupeCatalogue,
  isPlaceholderTiktokUrl,
  planImport,
  starsToLevel,
  statusToBucket,
  toInsert,
  type ExistingSong,
  type JmgSong,
} from '@/scripts/database/seeding/import-jmg-songs.helpers';
import {
  assertClusterIdentity,
  assertTarget,
  maskDbUrl,
  SYSTEM_IDENTIFIER,
} from '@/scripts/database/seeding/import-jmg-songs.guard';

const song = (over: Partial<JmgSong> = {}): JmgSong => ({
  title: 'Drive',
  artist: 'Incubus',
  genre: 'Alternative',
  difficulty_stars: '★★★☆☆',
  status: '✅ DONE',
  ...over,
});

const row = (over: Partial<ExistingSong> = {}): ExistingSong => ({
  id: 'id-1',
  title: 'Drive',
  author: 'Incubus',
  level: 'intermediate',
  category: 'Alternative',
  priority_bucket: 'done',
  tiktok_short_url: null,
  deleted_at: null,
  ...over,
});

describe('starsToLevel', () => {
  it.each([
    ['★☆☆☆☆', 'beginner'],
    ['★★☆☆☆', 'beginner'],
    ['★★★☆☆', 'intermediate'],
    ['★★★★☆', 'advanced'],
    ['★★★★★', 'advanced'],
  ])('%s → %s', (stars, level) => expect(starsToLevel(stars)).toBe(level));

  it.each([[''], [null], ['☆☆☆☆☆'], ['3']])('throws on %p', (stars) => {
    expect(() => starsToLevel(stars)).toThrow(/Unmappable/);
  });
});

describe('statusToBucket', () => {
  it.each([
    ['✅ DONE', 'done'],
    ['📅 MAY', 'may'],
    ['📅 JUNE', 'june'],
    ['⏳ LATER', 'later'],
    ['⏳ BACKLOG', 'backlog'],
  ])('%s → %s', (status, bucket) => expect(statusToBucket(status)).toBe(bucket));

  it('fails loudly on an unknown status', () => {
    expect(() => statusToBucket('🎬 FILMING')).toThrow(/Unknown JMG status/);
    expect(() => statusToBucket(null)).toThrow(/Unknown JMG status/);
  });
});

describe('isPlaceholderTiktokUrl', () => {
  it('matches the seeded @strummyapp fakes only', () => {
    expect(isPlaceholderTiktokUrl('https://www.tiktok.com/@strummyapp/video/740004444444444')).toBe(
      true
    );
    expect(isPlaceholderTiktokUrl('https://www.tiktok.com/@justmeandguitars/video/7400')).toBe(
      false
    );
    expect(isPlaceholderTiktokUrl('https://vm.tiktok.com/123')).toBe(false);
    expect(isPlaceholderTiktokUrl(null)).toBe(false);
  });
});

describe('toInsert', () => {
  it('expands content-plan shorthand to canonical song names', () => {
    expect(toInsert(song({ title: 'Hotel Cali Solo', artist: 'Eagles' })).title).toBe(
      'Hotel California'
    );
    expect(toInsert(song({ title: 'Sweet Child O Mine', artist: 'GnR' }))).toMatchObject({
      title: "Sweet Child O' Mine",
      author: "Guns N' Roses",
    });
    expect(toInsert(song({ genre: '  ' })).category).toBeNull();
  });
});

describe('dedupeCatalogue', () => {
  it('collapses duplicates, keeping the most committed bucket', () => {
    const { rows, duplicates } = dedupeCatalogue([
      song({ title: 'Wonderwall', artist: 'Oasis', status: '⏳ LATER' }),
      song({ title: 'Wonderwall', artist: 'Oasis', status: '📅 MAY' }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].priority_bucket).toBe('may');
    expect(duplicates).toEqual(['Wonderwall — Oasis']);
  });
});

describe('planImport', () => {
  it('inserts unknown songs with mapped fields', () => {
    const plan = planImport([song()], []);
    expect(plan.inserts).toEqual([
      {
        title: 'Drive',
        author: 'Incubus',
        level: 'intermediate',
        category: 'Alternative',
        priority_bucket: 'done',
      },
    ]);
    expect(plan.updates).toEqual([]);
  });

  it('matches case-insensitively and ignores a leading "The"', () => {
    const plan = planImport(
      [song({ title: 'norwegian wood', artist: 'Beatles' })],
      [
        row({
          title: 'Norwegian Wood',
          author: 'The Beatles',
          priority_bucket: null,
          level: null,
          category: null,
        }),
      ]
    );
    expect(plan.inserts).toEqual([]);
    expect(plan.updates[0].set).toEqual({
      priority_bucket: 'done',
      level: 'intermediate',
      category: 'Alternative',
    });
  });

  it('keeps curated level/category, clears a placeholder URL, and is idempotent', () => {
    const fake = 'https://www.tiktok.com/@strummyapp/video/740005555555555';
    const plan = planImport(
      [song({ difficulty_stars: '★★★★★' })],
      [row({ tiktok_short_url: fake })]
    );
    expect(plan.updates[0].set).toEqual({ tiktok_short_url: null });
    expect(planImport([song()], [row()]).unchanged).toBe(1);
  });

  it('clears placeholder URLs on rows outside the catalogue and skips deleted matches', () => {
    const plan = planImport(
      [song()],
      [
        row({ id: 'gone', deleted_at: '2026-01-01' }),
        row({
          id: 'x',
          title: 'Hotel California',
          author: 'Eagles',
          tiktok_short_url: 'https://www.tiktok.com/@strummyapp/video/740003333333333',
        }),
      ]
    );
    expect(plan.inserts).toHaveLength(1);
    expect(plan.updates).toEqual([
      expect.objectContaining({
        id: 'x',
        set: { tiktok_short_url: null },
        reason: 'placeholder-url',
      }),
    ]);
  });
});

describe('assertTarget', () => {
  const dev = 'postgresql://postgres:pw@192.168.1.75:55322/postgres';
  const prod = 'postgresql://postgres:pw@192.168.1.75:54322/postgres';

  it('accepts the dev stack for --target dev', () => {
    expect(assertTarget({ target: 'dev', dbUrl: dev })).toBe('dev');
  });

  it.each([
    [undefined, dev, /--target is required/],
    ['dev', prod, /Refusing/],
    ['dev', 'postgresql://u:p@db.strummy.online:5432/postgres', /Refusing/],
    ['dev', 'postgresql://u:p@127.0.0.1:54322/postgres', /PRODUCTION/],
    ['dev', 'postgresql://u:p@10.0.0.5:55322/postgres', /Refusing/],
    ['dev', undefined, /No database URL/],
    ['prod', dev, /Refusing/],
    ['prod', prod, /without --backup/],
  ])('refuses target=%p url=%p', (target, dbUrl, msg) => {
    expect(() => assertTarget({ target, dbUrl })).toThrow(msg);
  });

  it('accepts a localhost SSH tunnel at layer 1 (layer 2 verifies the cluster)', () => {
    expect(
      assertTarget({ target: 'dev', dbUrl: 'postgresql://u:p@127.0.0.1:55322/postgres' })
    ).toBe('dev');
  });

  it('allows prod only with a fresh, non-empty backup', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'jmg-')), 'dump.sql');
    fs.writeFileSync(file, '-- dump');
    expect(assertTarget({ target: 'prod', dbUrl: prod, backupPath: file })).toBe('prod');
    const later = Date.now() + 7 * 60 * 60 * 1000;
    expect(() =>
      assertTarget({ target: 'prod', dbUrl: prod, backupPath: file, now: later })
    ).toThrow(/older than 6h/);
  });

  it('verifies the connected cluster identity', () => {
    expect(() => assertClusterIdentity('dev', SYSTEM_IDENTIFIER.dev)).not.toThrow();
    expect(() => assertClusterIdentity('dev', SYSTEM_IDENTIFIER.prod)).toThrow(
      /cluster is PROD, not DEV/
    );
    expect(() => assertClusterIdentity('prod', '123')).toThrow(/unknown \(123\)/);
  });

  it('masks credentials', () => {
    expect(maskDbUrl(dev)).toBe('postgresql://***@192.168.1.75:55322/postgres');
  });
});
