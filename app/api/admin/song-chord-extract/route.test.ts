/**
 * @jest-environment node
 */

import { POST } from './route';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { generateSongChordExtractionAgent } from '@/lib/ai/agents/song-chord-extraction';

jest.mock('@/lib/getUserWithRolesSSR');
jest.mock('@/lib/ai/agents/song-chord-extraction');
jest.mock('@/lib/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

const mockGetUser = getUserWithRolesSSR as jest.MockedFunction<typeof getUserWithRolesSSR>;
const mockGenerate = generateSongChordExtractionAgent as jest.MockedFunction<
  typeof generateSongChordExtractionAgent
>;

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/admin/song-chord-extract', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/admin/song-chord-extract', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejects unauthenticated requests', async () => {
    mockGetUser.mockResolvedValue({
      user: null,
      isAdmin: false,
      isTeacher: false,
      isStudent: false,
      isParent: false,
      isDevelopment: false,
    });

    const res = await POST(makeRequest({ title: 'X', chordSheetText: 'G C D' }));
    expect(res.status).toBe(403);
  });

  it('rejects students', async () => {
    mockGetUser.mockResolvedValue({
      user: { id: 'u1' } as never,
      isAdmin: false,
      isTeacher: false,
      isStudent: true,
      isParent: false,
      isDevelopment: false,
    });

    const res = await POST(makeRequest({ title: 'X', chordSheetText: 'G C D' }));
    expect(res.status).toBe(403);
  });

  it('requires title and chordSheetText', async () => {
    mockGetUser.mockResolvedValue({
      user: { id: 'u1' } as never,
      isAdmin: true,
      isTeacher: false,
      isStudent: false,
      isParent: false,
      isDevelopment: false,
    });

    const res = await POST(makeRequest({ title: 'X' }));
    expect(res.status).toBe(400);
  });

  it('returns extracted data for a teacher on success', async () => {
    mockGetUser.mockResolvedValue({
      user: { id: 'u1' } as never,
      isAdmin: false,
      isTeacher: true,
      isStudent: false,
      isParent: false,
      isDevelopment: false,
    });
    mockGenerate.mockResolvedValue({
      success: true,
      data: {
        capoFret: 4,
        strummingPattern: 'D DU UDU',
        timeSignature: 4,
        chordsUsed: ['G', 'C', 'D', 'Em'],
        confidence: 92,
        reasoning: 'Capo and pattern explicitly stated',
        needsManualReview: false,
      },
    });

    const res = await POST(makeRequest({ title: 'Wonderwall', artist: 'Oasis', chordSheetText: 'Capo 4\nG C D Em' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.capoFret).toBe(4);
    expect(body.chordsUsed).toEqual(['G', 'C', 'D', 'Em']);
    expect(mockGenerate).toHaveBeenCalledWith({
      title: 'Wonderwall',
      artist: 'Oasis',
      chordSheetText: 'Capo 4\nG C D Em',
    });
  });

  it('returns 502 when the agent fails', async () => {
    mockGetUser.mockResolvedValue({
      user: { id: 'u1' } as never,
      isAdmin: true,
      isTeacher: false,
      isStudent: false,
      isParent: false,
      isDevelopment: false,
    });
    mockGenerate.mockResolvedValue({ success: false, error: 'model unavailable' });

    const res = await POST(makeRequest({ title: 'X', chordSheetText: 'G C D' }));
    expect(res.status).toBe(502);
  });
});
