import type { SupabaseClient } from '@supabase/supabase-js';

import { decide, getPendingSuggestions, savePending, songsToAsk } from './song-suggestions';

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

type Rows = Record<string, unknown>[];

/**
 * A fake Supabase client: every query on a table resolves to that table's rows (or `maybeSingle` to the first),
 * and every write is recorded.
 */
function fakeClient(tables: Record<string, Rows>, errors: Record<string, boolean> = {}) {
  const writes: { table: string; op: string; payload?: unknown }[] = [];
  const query = (table: string) => {
    const result = () => ({
      data: tables[table] ?? [],
      error: errors[table] ? { code: 'x' } : null,
    });
    const chain: Record<string, unknown> = {};
    for (const name of ['select', 'is', 'order', 'limit', 'eq', 'in']) chain[name] = () => chain;
    chain.then = (resolve: (value: unknown) => void) => resolve(result());
    chain.maybeSingle = () =>
      Promise.resolve({ data: (tables[table] ?? [])[0] ?? null, error: null });
    chain.insert = (payload: unknown) => {
      writes.push({ table, op: 'insert', payload });
      return Promise.resolve({ error: null });
    };
    chain.update = (payload: unknown) => {
      writes.push({ table, op: 'update', payload });
      return chain;
    };
    chain.delete = () => {
      writes.push({ table, op: 'delete' });
      return chain;
    };
    return chain;
  };
  return { client: { from: query } as unknown as SupabaseClient, writes };
}

const song = (id: string, author: string | null) => ({
  id,
  title: `Song ${id}`,
  author,
  category: null,
  level: null,
  chords: null,
  tempo: null,
  key: null,
});

describe('songsToAsk', () => {
  it('walks songs after the cursor that miss the field and have no open proposal', async () => {
    const { client } = fakeClient({
      songs: [
        song('a', null),
        song('b', null),
        song('c', 'Known'),
        song('d', null),
        song('e', null),
      ],
      song_suggestions: [{ song_id: 'd' }],
    });
    await expect(songsToAsk(client, 'author', null, 1)).resolves.toEqual({
      songs: [song('a', null)],
      remaining: 2,
    });
    const next = await songsToAsk(client, 'author', 'a', 10);
    expect(next.songs.map((s) => s.id)).toEqual(['b', 'e']);
  });
});

describe('savePending and getPendingSuggestions', () => {
  it('replaces the open proposals and reads them back', async () => {
    const { client, writes } = fakeClient({
      song_suggestions: [
        {
          id: 'p1',
          song_id: 'a',
          field: 'author',
          value: 'X',
          confidence: '0.9',
          reason: null,
          source: 'local:q',
        },
      ],
    });
    const saved = await savePending(client, [
      {
        songId: 'a',
        field: 'author',
        value: 'X',
        confidence: 0.9,
        reason: null,
        source: 'local:q',
      },
    ]);
    expect(saved).toBe(1);
    expect(writes.map((w) => w.op)).toEqual(['delete', 'insert']);
    await expect(getPendingSuggestions(client)).resolves.toEqual([
      {
        id: 'p1',
        songId: 'a',
        field: 'author',
        value: 'X',
        confidence: 0.9,
        reason: null,
        source: 'local:q',
      },
    ]);
  });
});

describe('decide', () => {
  const suggestion = { id: 'p1', songId: 'a', field: 'author' as const, value: 'Ben E. King' };

  it('writes an accepted value into an empty field and records the decision', async () => {
    const { client, writes } = fakeClient({ songs: [song('a', null)] });
    await expect(decide(client, suggestion, true, 'admin-1')).resolves.toBe('accepted');
    expect(writes[0]).toEqual({ table: 'songs', op: 'update', payload: { author: 'Ben E. King' } });
    expect(writes[1]).toMatchObject({
      table: 'song_suggestions',
      payload: { status: 'accepted', decided_by: 'admin-1' },
    });
  });

  it('sets a proposal aside when the field was filled meanwhile, and only records a rejection', async () => {
    const filled = fakeClient({ songs: [song('a', 'Someone')] });
    await expect(decide(filled.client, suggestion, true, null)).resolves.toBe('stale');
    expect(filled.writes).toEqual([
      expect.objectContaining({
        table: 'song_suggestions',
        payload: expect.objectContaining({ status: 'stale' }),
      }),
    ]);
    const rejected = fakeClient({});
    await expect(decide(rejected.client, suggestion, false, null)).resolves.toBe('rejected');
    expect(rejected.writes.every((w) => w.table === 'song_suggestions')).toBe(true);
  });
});
