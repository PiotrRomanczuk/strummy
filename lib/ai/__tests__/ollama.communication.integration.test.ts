/**
 * @jest-environment node
 */

/**
 * Ollama — Communication Agents (email draft, chat assistant)
 * Run: OLLAMA_BASE_URL=http://192.168.1.10:11434 AI_PROVIDER=ollama npx jest --config jest.config.integration.ts --testPathPatterns=ollama.communication
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

describe('Ollama — Communication Agents', () => {
  it('email-draft-generator', async () => {
    if (!ok) return console.log('[SKIP] Ollama not available');
    const t0 = Date.now();
    const result = await executeAgent(
      'email-draft-generator',
      { template_type: 'lesson_reminder', student_name: 'Emma', lesson_date: 'Monday at 4pm' },
      ctx,
      { model: OLLAMA_MODEL }
    );
    console.log(`[${Date.now() - t0}ms] email-draft → ${extractContent(result).substring(0, 120)}`);
    expect(result.success).toBe(true);
    expect(extractContent(result).length).toBeGreaterThan(50);
  }, 120_000);

  it('chat-assistant', async () => {
    if (!ok) return console.log('[SKIP] Ollama not available');
    const t0 = Date.now();
    const result = await executeAgent(
      'chat-assistant',
      { prompt: 'What are the best beginner songs for a student who just learned open chords?' },
      ctx,
      { model: OLLAMA_MODEL }
    );
    console.log(`[${Date.now() - t0}ms] chat → ${extractContent(result).substring(0, 120)}`);
    expect(result.success).toBe(true);
    expect(extractContent(result).length).toBeGreaterThan(50);
  }, 120_000);
});
