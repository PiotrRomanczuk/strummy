/**
 * @jest-environment node
 */

/**
 * Ollama — Song Agents (song notes, song normalization)
 * Run: OLLAMA_BASE_URL=http://192.168.1.10:11434 AI_PROVIDER=ollama npx jest --config jest.config.integration.ts --testPathPatterns=ollama.songs
 */

import { executeAgent } from '../registry';
import { generateSongNormalizationAgent } from '../agents/song-normalization';
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

describe('Ollama — Song Agents', () => {
  it('song-notes-assistant', async () => {
    if (!ok) return console.log('[SKIP] Ollama not available');
    const t0 = Date.now();
    const result = await executeAgent(
      'song-notes-assistant',
      {
        title: 'Wonderwall',
        author: 'Oasis',
        level: 'beginner',
        key: 'Em',
        chords: 'Em, G, D, A7sus4',
      },
      ctx,
      { model: OLLAMA_MODEL }
    );
    console.log(`[${Date.now() - t0}ms] song-notes → ${extractContent(result).substring(0, 120)}`);
    expect(result.success).toBe(true);
    expect(extractContent(result).length).toBeGreaterThan(50);
  }, 120_000);

  it('song-normalization: structured JSON output', async () => {
    if (!ok) return console.log('[SKIP] Ollama not available');
    const t0 = Date.now();
    const result = await generateSongNormalizationAgent({
      title: 'knockin on heavens door',
      artist: 'bob dylan',
    });
    const elapsed = Date.now() - t0;
    console.log(
      `[${elapsed}ms] song-normalization → "${result.data?.normalizedTitle}" / "${result.data?.normalizedArtist}" (confidence: ${result.data?.confidence})`
    );
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.normalizedTitle.length).toBeGreaterThan(0);
    expect(typeof result.data!.confidence).toBe('number');
    expect(result.data!.confidence).toBeGreaterThanOrEqual(0);
    expect(result.data!.confidence).toBeLessThanOrEqual(100);
    expect(typeof result.data!.flags.hasFeaturing).toBe('boolean');
    expect(typeof result.data!.flags.needsManualReview).toBe('boolean');
  }, 120_000);
});
