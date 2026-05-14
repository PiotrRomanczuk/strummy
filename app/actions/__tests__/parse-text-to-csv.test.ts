import { parseTextToCsvRows } from '../parse-text-to-csv';
import { AIAuthError } from '@/lib/ai/auth';

const mockRequireAIAuth = jest.fn();
jest.mock('@/lib/ai/auth', () => ({
  requireAIAuth: (...args: unknown[]) => mockRequireAIAuth(...args),
  AIAuthError: class AIAuthError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string) {
      super(message);
      this.name = 'AIAuthError';
      this.code = code;
      this.status = code === 'UNAUTHENTICATED' ? 401 : 403;
    }
  },
}));

const mockCheckRateLimit = jest.fn();
jest.mock('@/lib/ai/rate-limiter', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

const mockComplete = jest.fn();
jest.mock('@/lib/ai', () => ({
  getAIProvider: jest.fn(() => Promise.resolve({ complete: mockComplete })),
  isAIError: (v: unknown) => typeof v === 'object' && v !== null && 'error' in v,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireAIAuth.mockResolvedValue({ id: 'teacher-1', role: 'teacher', email: 't@test.com' });
  mockCheckRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 99,
    resetTime: Date.now() + 60000,
    limit: 100,
  });
});

describe('parseTextToCsvRows — auth + input validation', () => {
  it('rejects unauthenticated callers', async () => {
    mockRequireAIAuth.mockRejectedValueOnce(
      new AIAuthError('UNAUTHENTICATED', 'Authentication required')
    );
    expect(await parseTextToCsvRows('29.02.2024: Stand by me')).toEqual({
      success: false,
      error: 'Unauthorized',
    });
  });

  it('rejects students (only teachers and admins may parse)', async () => {
    mockRequireAIAuth.mockResolvedValueOnce({
      id: 'student-1',
      role: 'student',
      email: 's@test.com',
    });
    expect(await parseTextToCsvRows('text')).toEqual({
      success: false,
      error: 'Unauthorized',
    });
  });

  it('rejects when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 30000,
      retryAfter: 30,
      limit: 100,
    });
    expect(await parseTextToCsvRows('text')).toEqual({
      success: false,
      error: 'Rate limit exceeded. Please try again in 30 seconds.',
    });
  });

  it('rejects empty / whitespace-only text', async () => {
    expect(await parseTextToCsvRows('   ')).toEqual({
      success: false,
      error: 'Text is empty',
    });
  });

  it('rejects text over 10,000 characters', async () => {
    expect(await parseTextToCsvRows('a'.repeat(10001))).toEqual({
      success: false,
      error: 'Text is too long (max 10,000 characters)',
    });
  });
});

describe('parseTextToCsvRows — AI response handling', () => {
  it('parses a valid AI JSON response into CsvSongRow objects', async () => {
    mockComplete.mockResolvedValueOnce({
      content: `[
        {"date":"29.02.2024","title":"Stand by Me","author":"Ben E. King"},
        {"date":"","title":"Wonderwall","author":"Oasis"}
      ]`,
    });
    const result = await parseTextToCsvRows('29.02.2024: Stand by me');
    expect(result.success).toBe(true);
    expect(result.rows).toEqual([
      { date: '29.02.2024', title: 'Stand by Me', author: 'Ben E. King' },
      { date: '', title: 'Wonderwall', author: 'Oasis' },
    ]);
  });

  it('extracts a JSON array even when surrounded by markdown / prose', async () => {
    mockComplete.mockResolvedValueOnce({
      content:
        'Here you go!\n```json\n[{"date":"","title":"X","author":""}]\n```\nHope this helps!',
    });
    const result = await parseTextToCsvRows('X');
    expect(result.success).toBe(true);
    expect(result.rows).toHaveLength(1);
  });

  it('reports an error if the AI returned no JSON array', async () => {
    mockComplete.mockResolvedValueOnce({
      content: 'I cannot help with that.',
    });
    const result = await parseTextToCsvRows('something');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid format/);
  });

  it('reports an error when the AI returns an empty array', async () => {
    mockComplete.mockResolvedValueOnce({ content: '[]' });
    const result = await parseTextToCsvRows('something');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No songs/);
  });

  it('passes through AI provider errors', async () => {
    mockComplete.mockResolvedValueOnce({ error: 'rate limited' });
    const result = await parseTextToCsvRows('text');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/AI parsing failed: rate limited/);
  });

  it('coerces missing / non-string fields and trims whitespace on output rows', async () => {
    mockComplete.mockResolvedValueOnce({
      content: '[{"date":"  29.02.2024 ","title":null,"author":12345}]',
    });
    const result = await parseTextToCsvRows('text');
    expect(result.success).toBe(true);
    expect(result.rows).toEqual([{ date: '29.02.2024', title: '', author: '12345' }]);
  });

  it('catches JSON.parse explosions and surfaces a generic error', async () => {
    // Bracketed content matches the /\[[\s\S]*\]/ regex but fails JSON.parse.
    mockComplete.mockResolvedValueOnce({ content: '[not, valid, json]' });
    const result = await parseTextToCsvRows('text');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Failed to parse text/);
  });
});
