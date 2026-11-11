import type { SupabaseClient } from '@supabase/supabase-js';

import { generateLessonSummary } from './lesson-summary';

const mockGenerate = jest.fn();
jest.mock('@/lib/ai/providers/text-output', () => ({
  generateTextOutput: (...args: unknown[]) => mockGenerate(...args),
}));
jest.mock('@/lib/services/notification-service', () => ({
  sendNotification: jest.fn(),
  cancelPendingQueueEntries: jest.fn(),
}));

const LESSON = {
  id: 'l1',
  student_id: 's1',
  scheduled_at: '2026-10-28T15:00:00Z',
  title: null,
  notes: 'Pilnuj bicia.',
  summary: null,
};

/** Every read resolves through maybeSingle/await; writes are recorded per table. */
function fakeClient() {
  const inserts: Record<string, Record<string, unknown>> = {};
  const updates: Record<string, Record<string, unknown>> = {};

  const client = {
    from(table: string) {
      const single =
        table === 'lessons' ? LESSON : table === 'profiles' ? { first_name: 'Ania' } : null;
      const result = { data: table === 'lesson_songs' ? [] : single, error: null };
      const query: Record<string, unknown> = {
        select: () => query,
        eq: () => query,
        is: () => query,
        gt: () => query,
        order: () => query,
        limit: () => query,
        maybeSingle: async () => result,
        then: (resolve: (value: typeof result) => void) => resolve(result),
        insert: async (row: Record<string, unknown>) => {
          inserts[table] = row;
          return { error: null };
        },
        update: (row: Record<string, unknown>) => {
          updates[table] = row;
          return query;
        },
      };
      return query;
    },
  };
  return { supabase: client as unknown as SupabaseClient, inserts, updates };
}

beforeEach(() => jest.clearAllMocks());

describe('generateLessonSummary', () => {
  it('saves the AI text when the model answers', async () => {
    mockGenerate.mockResolvedValue({ text: 'Cześć Ania, super lekcja.' });
    const { supabase, updates } = fakeClient();

    const result = await generateLessonSummary(supabase, 'l1', 'p1');

    expect(result).toEqual({ ok: true, summary: 'Cześć Ania, super lekcja.' });
    expect(updates.lessons.summary).toBe('Cześć Ania, super lekcja.');
  });

  it.each([
    ['throws', () => mockGenerate.mockRejectedValue(new Error('402'))],
    [
      'answers with nothing',
      () => mockGenerate.mockResolvedValue({ text: ' ', finishReason: 'length' }),
    ],
  ])('falls back to the template when the model %s', async (_name, arrange) => {
    arrange();
    const { supabase, inserts, updates } = fakeClient();

    const result = await generateLessonSummary(supabase, 'l1', 'p1');

    expect(result).toMatchObject({ ok: true, isTemplate: true });
    expect(updates.lessons.summary).toContain('Pilnuj bicia.');
    expect(inserts.ai_generations.is_successful).toBe(false);
    expect(inserts.ai_generations.error_message).toBeTruthy();
  });
});
