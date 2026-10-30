/**
 * @jest-environment node
 */
import { generateLessonTranscriptDraft, lessonTranscriptDraftAgent } from './lesson-transcript-draft';
import { anonymizeTranscript, buildLessonDraftUserMessage } from './lesson-transcript-draft-prompt';
import { lessonTranscriptDraftSchema } from '../schemas/lesson-transcript-draft';

const mockGenerateStructuredOutput = jest.fn();
const mockExecuteAgent = jest.fn();

jest.mock('../providers/vercel-ai-adapter', () => ({
  generateStructuredOutput: (...args: unknown[]) => mockGenerateStructuredOutput(...args),
}));
jest.mock('../agent-registry', () => ({
  executeAgent: (...args: unknown[]) => mockExecuteAgent(...args),
}));
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() } }));

const emptyNotes = { technique: [], theory: [], wentWell: [], needsWork: [], other: [] };

const validDraft = {
  isGuitarLesson: true,
  lessonTitle: 'Power chordy: Queen i Clapton',
  songs: [
    {
      heardTitle: 'Cocaine',
      heardArtist: 'Eric Clapton',
      catalogTitle: 'Cocaine',
      role: 'practiced',
      status: 'slow_tempo',
      sections: ['refren'],
      notes: ['Grać wolniej przy zmianach akordów'],
      songFacts: { capoFret: null, strummingPattern: null, chords: ['E5', 'D5', 'C5', 'B5'] },
      confidence: 0.9,
      evidence: 'Nauczyciel tłumaczy tłumienie w Cocaine',
    },
  ],
  assignment: {
    title: 'Blitzkrieg Bop — rozpracuj',
    description: 'Rozpracuj utwór ze słuchu.',
    checklist: ['Znajdź akordy', 'Ćwicz tłumienie'],
    songTitles: ['Blitzkrieg Bop'],
    dailyTargetMinutes: null,
    submissionType: 'self_report',
    isExplicit: true,
    confidence: 0.85,
    evidence: 'Padło „praca domowa”',
  },
  skills: [],
  notes: emptyNotes,
  teacherCommitments: ['Wysłać materiały'],
  profileHints: [],
  logistics: [],
  questions: [],
};

const promptInput = {
  transcript: 'Speaker 1: Kuba, zagraj Cocaine. Kubie idzie dobrze. Piotr pokazuje riff.',
  summary: null,
  lessonDate: '2026-10-18',
  studentNames: ['Jakub Kowalski', 'Kuba'],
  teacherNames: ['Piotr Romańczuk'],
  knownSongs: [{ title: 'Cocaine', author: 'Eric Clapton' }],
  skillCatalog: ['Palm muting', 'Power chords'],
};

beforeEach(() => jest.clearAllMocks());

describe('lessonTranscriptDraftSchema', () => {
  it('accepts a full draft', () => {
    expect(lessonTranscriptDraftSchema.safeParse(validDraft).success).toBe(true);
  });

  it('degrades bad song fields to values that pre-tick nothing instead of failing the draft', () => {
    const { songFacts: _dropped, ...withoutFacts } = validDraft.songs[0];
    const bad = { ...validDraft, songs: [{ ...withoutFacts, status: 'done', role: 'played', confidence: 3 }] };
    const parsed = lessonTranscriptDraftSchema.parse(bad);
    expect(parsed.songs[0]).toMatchObject({
      status: null,
      role: 'mentioned',
      confidence: 0.3,
      songFacts: { capoFret: null, strummingPattern: null, chords: [] },
    });
  });

  it('still rejects a draft without the required top-level shape', () => {
    expect(lessonTranscriptDraftSchema.safeParse({ isGuitarLesson: true }).success).toBe(false);
  });
});

describe('anonymizeTranscript', () => {
  it('replaces student names with their Polish inflections and the teacher name', () => {
    const out = anonymizeTranscript(promptInput.transcript, promptInput.studentNames, promptInput.teacherNames);
    expect(out).not.toMatch(/Kub|Piotr|Jakub/);
    expect(out).toContain('Uczeń, zagraj Cocaine');
    expect(out).toContain('Nauczyciel pokazuje');
  });

  it('leaves words that only contain the name untouched and ignores 2-letter names', () => {
    expect(anonymizeTranscript('Kubeczek i Al', ['Al'], [])).toBe('Kubeczek i Al');
    expect(anonymizeTranscript('Rakuba gra', ['Kuba'], [])).toBe('Rakuba gra');
  });
});

describe('buildLessonDraftUserMessage', () => {
  it('lists known songs and skills and sends no names', () => {
    const message = buildLessonDraftUserMessage(promptInput);
    expect(message).toContain('- Cocaine — Eric Clapton');
    expect(message).toContain('- Palm muting');
    expect(message).not.toMatch(/Kuba|Piotr/);
  });
});

describe('generateLessonTranscriptDraft', () => {
  it('returns structured output when the adapter succeeds', async () => {
    mockGenerateStructuredOutput.mockResolvedValue({ data: validDraft });
    const result = await generateLessonTranscriptDraft(promptInput);
    expect(result).toMatchObject({ success: true, data: validDraft });
    expect(mockExecuteAgent).not.toHaveBeenCalled();
  });

  it('falls back to the registry and validates the JSON', async () => {
    mockGenerateStructuredOutput.mockRejectedValue(new Error('no json mode'));
    mockExecuteAgent.mockResolvedValue({ success: true, result: { content: JSON.stringify(validDraft) } });
    const result = await generateLessonTranscriptDraft(promptInput);
    expect(result.success).toBe(true);
  });

  it('fails when the fallback output does not match the schema', async () => {
    mockGenerateStructuredOutput.mockRejectedValue(new Error('no json mode'));
    mockExecuteAgent.mockResolvedValue({ success: true, result: { content: '{"isGuitarLesson":true}' } });
    const result = await generateLessonTranscriptDraft(promptInput);
    expect(result.success).toBe(false);
    expect(result).toMatchObject({ error: expect.stringContaining('did not match the draft schema') });
  });

  it('accepts fallback JSON wrapped in prose', async () => {
    mockGenerateStructuredOutput.mockRejectedValue(new Error('No object generated'));
    mockExecuteAgent.mockResolvedValue({ success: true, result: { content: `Oto szkic:\n${JSON.stringify(validDraft)}\nKoniec.` } });
    const result = await generateLessonTranscriptDraft(promptInput);
    expect(result.success).toBe(true);
  });

  it('asks the structured path for a capped reasoning budget and room for the JSON', async () => {
    mockGenerateStructuredOutput.mockResolvedValue({ data: validDraft });
    await generateLessonTranscriptDraft(promptInput);
    expect(mockGenerateStructuredOutput).toHaveBeenCalledWith(
      expect.objectContaining({ reasoningMaxTokens: 3000, maxOutputTokens: 12000 })
    );
  });

  it('records the raw answer of every attempt, on the same model', async () => {
    const structuredError = Object.assign(new Error('No object generated'), { text: 'Oto notatki: ...' });
    mockGenerateStructuredOutput.mockRejectedValue(structuredError);
    mockExecuteAgent.mockResolvedValue({ success: true, result: { content: 'still not json' } });
    const result = await generateLessonTranscriptDraft(promptInput);

    expect(result.attempts).toEqual([
      expect.objectContaining({ path: 'structured', raw: 'Oto notatki: ...', error: 'No object generated' }),
      expect.objectContaining({ path: 'fallback', raw: 'still not json', error: 'Failed to parse JSON response' }),
    ]);
    expect(mockExecuteAgent).toHaveBeenCalledWith('lesson-transcript-draft', expect.anything(), {}, { model: result.model });
  });

  it('accepts the whole transcript in the registry input limit', () => {
    expect(lessonTranscriptDraftAgent.inputValidation.maxLength).toBeGreaterThan(60_000);
  });
});
