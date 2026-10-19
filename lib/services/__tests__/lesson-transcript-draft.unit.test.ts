/**
 * @jest-environment node
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { generateLessonTranscriptDraft } from '@/lib/ai/agents/lesson-transcript-draft';
import type { LessonTranscriptDraft } from '@/lib/ai/schemas/lesson-transcript-draft';

import { generateLessonDraft } from '../lesson-transcript-draft';
import { loadDraftContext, type DraftContext } from '../lesson-transcript-draft-context';

jest.mock('@/lib/ai/agents/lesson-transcript-draft', () => ({ generateLessonTranscriptDraft: jest.fn() }));
jest.mock('../lesson-transcript-draft-context', () => ({ loadDraftContext: jest.fn() }));
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

const mockedAgent = generateLessonTranscriptDraft as jest.MockedFunction<typeof generateLessonTranscriptDraft>;
const mockedContext = loadDraftContext as jest.MockedFunction<typeof loadDraftContext>;

type Write = { table: string; op: 'update' | 'insert'; payload: Record<string, unknown> };

function createMockSupabase(): { supabase: SupabaseClient; writes: Write[] } {
  const writes: Write[] = [];
  const from = jest.fn((table: string) => ({
    update: (payload: Record<string, unknown>) => {
      writes.push({ table, op: 'update', payload });
      return { eq: () => Promise.resolve({ error: null }) };
    },
    insert: (payload: Record<string, unknown>) => {
      writes.push({ table, op: 'insert', payload });
      return Promise.resolve({ error: null });
    },
  }));
  return { supabase: { from } as unknown as SupabaseClient, writes };
}

const SONG_ID = '22222222-2222-4222-8222-222222222222';
const SKILL_ID = '44444444-4444-4444-8444-444444444444';

const context = (draftStatus = 'none'): DraftContext => ({
  lesson: { id: 'lesson-1', studentId: 'student-1', teacherId: 'teacher-1', scheduledAt: '2026-10-18T09:30:00Z' },
  transcript: { id: 'transcript-1', body: 'Speaker 1: gramy Now I am Here', summary: null, draftStatus },
  studentNames: ['Jakub', 'Kuba'],
  teacherNames: ['Piotr'],
  knownSongs: [{ id: SONG_ID, title: "Now I'm Here", author: 'Queen' }],
  skills: [{ id: SKILL_ID, name: 'Palm muting' }],
});

const agentDraft: LessonTranscriptDraft = {
  isGuitarLesson: true,
  lessonTitle: 'Power chordy',
  songs: [
    {
      heardTitle: 'riff Queenów',
      heardArtist: 'Queen',
      catalogTitle: "Now I'm Here",
      role: 'practiced',
      status: 'started',
      sections: [],
      notes: ['Palm muting lżej'],
      songFacts: { capoFret: null, strummingPattern: null, chords: [] },
      confidence: 0.6,
      evidence: 'riff na D5',
    },
  ],
  assignment: null,
  skills: [
    { skillName: 'palm muting', isFromCatalog: true, status: 'developing', note: 'lżej', confidence: 0.8, evidence: '' },
    { skillName: 'Tłumienie lewą ręką', isFromCatalog: false, status: 'developing', note: '', confidence: 0.7, evidence: '' },
  ],
  notes: { technique: [], theory: [], wentWell: [], needsWork: [], other: [] },
  teacherCommitments: [],
  profileHints: [],
  logistics: [],
  questions: [],
};

beforeEach(() => jest.clearAllMocks());

describe('generateLessonDraft', () => {
  it('returns not_found without calling the model when there is no transcript', async () => {
    mockedContext.mockResolvedValue(null);
    const { supabase } = createMockSupabase();
    const result = await generateLessonDraft(supabase, 'lesson-1', { actorProfileId: 'teacher-1' });
    expect(result).toMatchObject({ ok: false, code: 'not_found' });
    expect(mockedAgent).not.toHaveBeenCalled();
  });

  it('refuses to regenerate an applied draft', async () => {
    mockedContext.mockResolvedValue(context('applied'));
    const { supabase } = createMockSupabase();
    const result = await generateLessonDraft(supabase, 'lesson-1', { actorProfileId: 'teacher-1' });
    expect(result).toMatchObject({ ok: false, code: 'already_applied' });
  });

  it('stores a resolved draft: songs matched to the catalog, skills to the skills table', async () => {
    mockedContext.mockResolvedValue(context());
    mockedAgent.mockResolvedValue({ success: true, data: agentDraft, model: 'test-model' });
    const { supabase, writes } = createMockSupabase();

    const result = await generateLessonDraft(supabase, 'lesson-1', { actorProfileId: 'teacher-1', aliases: ['Kubuś'] });

    expect(result.ok).toBe(true);
    const saved = writes.find((w) => w.table === 'lesson_transcripts');
    expect(saved?.payload).toMatchObject({ draft_status: 'ready', draft_model: 'test-model', draft_error: null });
    const draft = saved?.payload.draft as { songs: { match: { songId: string } }[]; skills: { skillId: string | null }[] };
    expect(draft.songs[0].match.songId).toBe(SONG_ID);
    expect(draft.skills.map((s) => s.skillId)).toEqual([SKILL_ID, null]);
    expect(mockedContext).toHaveBeenCalledWith(supabase, 'lesson-1', ['Kubuś']);
    expect(mockedAgent.mock.calls[0][0]).toMatchObject({ studentNames: ['Jakub', 'Kuba'], lessonDate: '2026-10-18' });
  });

  it('logs the generation without the transcript text', async () => {
    mockedContext.mockResolvedValue(context());
    mockedAgent.mockResolvedValue({ success: true, data: agentDraft, model: 'test-model' });
    const { supabase, writes } = createMockSupabase();
    await generateLessonDraft(supabase, 'lesson-1', { actorProfileId: 'teacher-1' });

    const log = writes.find((w) => w.table === 'ai_generations');
    expect(log?.payload).toMatchObject({ generation_type: 'lesson_transcript_draft', profile_id: 'teacher-1' });
    expect(JSON.stringify(log?.payload.input_params)).not.toContain('Speaker 1');
  });

  it('marks the draft failed when the model fails', async () => {
    mockedContext.mockResolvedValue(context());
    mockedAgent.mockResolvedValue({ success: false, error: 'rate limited', model: 'test-model' });
    const { supabase, writes } = createMockSupabase();

    const result = await generateLessonDraft(supabase, 'lesson-1', { actorProfileId: 'teacher-1' });

    expect(result).toMatchObject({ ok: false, code: 'generation_failed', message: 'rate limited' });
    expect(writes.find((w) => w.table === 'lesson_transcripts')?.payload).toMatchObject({
      draft_status: 'failed',
      draft_error: 'rate limited',
    });
  });
});
