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
function fakeClient(
  tables: Record<string, Rows>,
  errors: Record<string, boolean> = {},
  failingUpdates: string[] = []
) {
  const writes: { table: string; op: string; payload?: unknown }[] = [];
  const query = (table: string) => {
    let from = 0;
    let to = Infinity;
    let isUpdate = false;
    const result = () => ({
      data: (tables[table] ?? []).slice(from, to + 1),
      error: errors[table] || (isUpdate && failingUpdates.includes(table)) ? { code: 'x' } : null,
    });
    const chain: Record<string, unknown> = {};
    for (const name of ['select', 'is', 'order', 'limit', 'eq', 'in']) chain[name] = () => chain;
    chain.range = (start: number, end: number) => {
      from = start;
      to = end;
      return chain;
    };
    chain.then = (resolve: (value: unknown) => void) => resolve(result());
    chain.maybeSingle = () =>
      Promise.resolve({ data: (tables[table] ?? [])[0] ?? null, error: null });
    chain.insert = (payload: unknown) => {
      writes.push({ table, op: 'insert', payload });
      return Promise.resolve({ error: null });
    };
    chain.update = (payload: unknown) => {
      writes.push({ table, op: 'update', payload });
      isUpdate = true;
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

  it('sees songs past the 1000-row response cap', async () => {
    const many = Array.from({ length: 2300 }, (_, index) =>
      song(`s${String(index).padStart(4, '0')}`, null)
    );
    const { client } = fakeClient({ songs: many });
    const result = await songsToAsk(client, 'author', 's1999', 5);
    expect(result.songs.map((s) => s.id)).toEqual(['s2000', 's2001', 's2002', 's2003', 's2004']);
    expect(result.remaining).toBe(295);
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

describe('getPendingSuggestions paging', () => {
  it('reads every open proposal past the 1000-row response cap', async () => {
    const rows = Array.from({ length: 1500 }, (_, index) => ({
      id: `p${index}`,
      song_id: `s${index}`,
      field: 'author',
      value: 'X',
      confidence: '0.9',
      reason: null,
      source: 'local:q',
    }));
    const { client } = fakeClient({ song_suggestions: rows });
    await expect(getPendingSuggestions(client)).resolves.toHaveLength(1500);
  });
});

describe('decide', () => {
  const suggestion = { id: 'p1', songId: 'a', field: 'author' as const, value: 'Ben E. King' };
  const open = [{ id: 'p1' }];

  it('claims the proposal, then writes an accepted value into an empty field', async () => {
    const { client, writes } = fakeClient({ songs: [song('a', null)], song_suggestions: open });
    await expect(decide(client, suggestion, true, 'admin-1')).resolves.toBe('accepted');
    expect(writes[0]).toMatchObject({
      table: 'song_suggestions',
      payload: { status: 'accepted', decided_by: 'admin-1' },
    });
    expect(writes[1]).toEqual({ table: 'songs', op: 'update', payload: { author: 'Ben E. King' } });
  });

  it('writes nothing when another session already closed the proposal', async () => {
    const { client, writes } = fakeClient({ songs: [song('a', null)], song_suggestions: [] });
    await expect(decide(client, suggestion, true, 'admin-1')).resolves.toBe('stale');
    expect(writes.every((w) => w.table === 'song_suggestions')).toBe(true);
  });

  it('gives the proposal back to the queue when the song write fails', async () => {
    const { client, writes } = fakeClient(
      { songs: [song('a', null)], song_suggestions: open },
      {},
      ['songs']
    );
    await expect(decide(client, suggestion, true, 'admin-1')).resolves.toBe('failed');
    expect(writes[2]).toMatchObject({
      table: 'song_suggestions',
      payload: { status: 'pending', decided_at: null, decided_by: null },
    });
  });

  it('sets a proposal aside when the field was filled meanwhile, and only records a rejection', async () => {
    const filled = fakeClient({ songs: [song('a', 'Someone')], song_suggestions: open });
    await expect(decide(filled.client, suggestion, true, null)).resolves.toBe('stale');
    expect(filled.writes).toEqual([
      expect.objectContaining({
        table: 'song_suggestions',
        payload: expect.objectContaining({ status: 'stale' }),
      }),
    ]);
    const rejected = fakeClient({ song_suggestions: open });
    await expect(decide(rejected.client, suggestion, false, null)).resolves.toBe('rejected');
    expect(rejected.writes.every((w) => w.table === 'song_suggestions')).toBe(true);
  });
});
