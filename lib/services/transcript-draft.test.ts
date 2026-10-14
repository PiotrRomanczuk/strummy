/**
 * Draft service against a scripted Supabase client and a mocked agent.
 * Covers: transcript → anonymised agent input, song resolution, the stored
 * row shape, regenerate-replaces, read-back, discard and accepted marks.
 */

import {
  discardTranscriptDraft,
  generateTranscriptDraft,
  getTranscriptDraft,
  markDraftItemAccepted,
} from './transcript-draft';

const mockGenerate = jest.fn();
jest.mock('@/lib/ai/agents/transcript-lesson-draft', () => ({
  generateTranscriptLessonDraft: (input: unknown) => mockGenerate(input),
}));
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));

type Row = Record<string, unknown>;

/** Minimal chainable client: each table has a scripted result; writes are recorded. */
function makeClient(tables: Record<string, Row | Row[] | null>, rpcRows: Record<string, Row[]>) {
  const writes: { table: string; op: string; payload: unknown; filters: unknown[] }[] = [];
  const from = (table: string) => {
    const filters: unknown[] = [];
    const result = tables[table] ?? null;
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    Object.assign(chain, {
      select: self,
      eq: (...a: unknown[]) => (filters.push(['eq', ...a]), chain),
      in: (...a: unknown[]) => (filters.push(['in', ...a]), chain),
      maybeSingle: async () => ({
        data: Array.isArray(result) ? (result[0] ?? null) : result,
        error: null,
      }),
      single: async () => ({ data: Array.isArray(result) ? result[0] : result, error: null }),
      insert: (payload: unknown) => {
        writes.push({ table, op: 'insert', payload, filters });
        return {
          select: () => ({ single: async () => ({ data: { id: 'run-new' }, error: null }) }),
        };
      },
      update: (payload: unknown) => {
        writes.push({ table, op: 'update', payload, filters });
        return chain;
      },
      then: (resolve: (v: unknown) => void) => resolve({ data: result, error: null }),
    });
    return chain;
  };
  const rpc = jest.fn(async (_fn: string, args: { search_title: string }) => ({
    data: rpcRows[args.search_title] ?? [],
    error: null,
  }));
  return { client: { from, rpc } as never, writes, rpc };
}

const draft = {
  notes_pl: 'Co ćwiczyliśmy\n- A-D-E',
  songs: [
    {
      title: "Now I'm Here",
      artist: 'Queen',
      confidence: 1,
      sentiment: 'enthusiastic',
      suggested_status: 'started',
      quotes: [],
    },
    {
      title: 'Unknown Tune',
      confidence: 0.5,
      sentiment: 'neutral',
      suggested_status: 'to_learn',
      quotes: [],
    },
  ],
  homework: [],
  next_lesson: [],
};

describe('generateTranscriptDraft', () => {
  beforeEach(() => mockGenerate.mockResolvedValue({ draft, model: 'test-model' }));

  it('returns null when the lesson has no transcript', async () => {
    const { client } = makeClient({ lesson_transcripts: null }, {});
    expect(await generateTranscriptDraft(client, 'lesson-1', 'teacher-1')).toBeNull();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('anonymises, resolves songs and stores an awaiting_review run', async () => {
    const { client, writes, rpc } = makeClient(
      {
        lesson_transcripts: {
          id: 'tr-1',
          summary: 'Lekcja z Emmą',
          body: 'Emma gra. Emmo, super.',
        },
        lessons: { student_id: 's-1', student: { full_name: 'Emma Wright', first_name: 'Emma' } },
        ai_workflow_runs: null,
      },
      { "Now I'm Here": [{ id: 'song-1', title: "Now I'm Here", author: 'Queen', similarity: 1 }] }
    );

    const record = await generateTranscriptDraft(client, 'lesson-1', 'teacher-1');

    expect(mockGenerate).toHaveBeenCalledWith({
      transcriptId: 'tr-1',
      summary: 'Lekcja z Uczeń',
      body: 'Uczeń gra. Uczeń, super.',
    });
    expect(rpc).toHaveBeenCalledWith('find_similar_songs', {
      search_title: "Now I'm Here",
      threshold: 0.3,
      max_results: 3,
    });
    expect(record?.runId).toBe('run-new');
    expect(record?.resolvedSongs).toEqual([
      { match: 'matched', songId: 'song-1', title: "Now I'm Here", author: 'Queen', similarity: 1 },
      { match: 'new' },
    ]);

    // Earlier active draft is closed, then the new row is inserted.
    const [discard, insert] = writes.filter((w) => w.table === 'ai_workflow_runs');
    expect(discard).toMatchObject({ op: 'update', payload: { status: 'done' } });
    expect(insert.payload).toMatchObject({
      workflow_type: 'transcript-draft',
      lesson_id: 'lesson-1',
      created_by: 'teacher-1',
      status: 'awaiting_review',
      step_results: {
        draft: { draft, model: 'test-model', accepted: { notes: false, songs: [] } },
      },
    });
  });
});

describe('getTranscriptDraft / discard / markDraftItemAccepted', () => {
  const stored = {
    draft,
    resolvedSongs: [],
    generatedAt: 'now',
    model: 'm',
    accepted: { notes: false, songs: [], homework: [], nextLesson: [] },
  };

  it('reads the active run back with its id', async () => {
    const { client } = makeClient(
      { ai_workflow_runs: { id: 'run-7', step_results: { draft: stored } } },
      {}
    );
    expect(await getTranscriptDraft(client, 'lesson-1')).toMatchObject({
      runId: 'run-7',
      model: 'm',
    });
  });

  it('returns null when there is no active run', async () => {
    const { client } = makeClient({ ai_workflow_runs: null }, {});
    expect(await getTranscriptDraft(client, 'lesson-1')).toBeNull();
  });

  it('discard marks the active run done', async () => {
    const { client, writes } = makeClient({}, {});
    await discardTranscriptDraft(client, 'lesson-1');
    expect(writes[0]).toMatchObject({
      table: 'ai_workflow_runs',
      op: 'update',
      payload: { status: 'done' },
    });
    expect(writes[0].filters).toEqual(
      expect.arrayContaining([
        ['eq', 'lesson_id', 'lesson-1'],
        ['in', 'status', ['running', 'awaiting_review']],
      ])
    );
  });

  it('markDraftItemAccepted rewrites step_results with the item flagged', async () => {
    const { client, writes } = makeClient(
      { ai_workflow_runs: { id: 'run-7', step_results: { draft: stored } } },
      {}
    );
    await markDraftItemAccepted(client, 'lesson-1', { kind: 'songs', index: 1 });
    expect(writes[0].payload).toEqual({
      step_results: { draft: { ...stored, accepted: { ...stored.accepted, songs: [1] } } },
    });
  });
});
