/**
 * @jest-environment node
 */

/**
 * Ollama — Content Agents (lesson notes, assignment, post-lesson summary)
 * Run: OLLAMA_BASE_URL=http://192.168.1.10:11434 AI_PROVIDER=ollama npx jest --config jest.config.integration.ts --testPathPatterns=ollama.content
 */

import { executeAgent } from '../registry';
import { setupOllamaEnv, extractContent, ctx, OLLAMA_MODEL } from './ollama-helpers';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ error: null }),
    }),
  }),
}));

jest.mock('../registry/analytics', () => ({
  logExecution: jest.fn().mockResolvedValue(undefined),
  logAIOperation: jest.fn(),
  getAnalytics: jest.fn().mockReturnValue([]),
  getDatabaseAnalytics: jest.fn().mockResolvedValue([]),
  getPerformanceMetrics: jest.fn().mockReturnValue({}),
  addToExecutionLog: jest.fn(),
  clearExecutionLog: jest.fn(),
  categorizeError: jest.fn().mockReturnValue('UNKNOWN'),
}));

let ok = false;
beforeAll(async () => {
  ok = await setupOllamaEnv();
});

describe('Ollama — Content Agents', () => {
  it('lesson-notes-assistant', async () => {
    if (!ok) return console.log('[SKIP] Ollama not available');
    const t0 = Date.now();
    const result = await executeAgent(
      'lesson-notes-assistant',
      {
        lesson_topic: 'barre chords',
        songs_covered: "Knockin' on Heaven's Door",
        student_name: 'Emma',
      },
      ctx,
      { model: OLLAMA_MODEL }
    );
    console.log(
      `[${Date.now() - t0}ms] lesson-notes → ${extractContent(result).substring(0, 120)}`
    );
    expect(result.success).toBe(true);
    expect(extractContent(result).length).toBeGreaterThan(50);
  }, 120_000);

  it('assignment-generator', async () => {
    if (!ok) return console.log('[SKIP] Ollama not available');
    const t0 = Date.now();
    const result = await executeAgent(
      'assignment-generator',
      {
        song_title: 'Wonderwall',
        song_artist: 'Oasis',
        difficulty_level: 'beginner',
        student_level: 'beginner',
      },
      ctx,
      { model: OLLAMA_MODEL }
    );
    console.log(`[${Date.now() - t0}ms] assignment → ${extractContent(result).substring(0, 120)}`);
    expect(result.success).toBe(true);
    expect(extractContent(result).length).toBeGreaterThan(50);
  }, 120_000);

  it('post-lesson-summary', async () => {
    if (!ok) return console.log('[SKIP] Ollama not available');
    const t0 = Date.now();
    const result = await executeAgent(
      'post-lesson-summary',
      {
        student_name: 'Emma',
        songs_practiced: 'Wonderwall, Hotel California',
        achievements: 'Clean G-to-C transition at 80 BPM',
      },
      ctx,
      { model: OLLAMA_MODEL }
    );
    console.log(`[${Date.now() - t0}ms] post-lesson → ${extractContent(result).substring(0, 120)}`);
    expect(result.success).toBe(true);
    expect(extractContent(result).length).toBeGreaterThan(50);
  }, 120_000);
});
