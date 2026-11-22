import { needsValue, normaliseValue, songChange, type SuggestSong } from './fields';
import { suggestBatch } from './generate';
import { buildMessages, parseAnswer } from './prompt';

const song = (overrides: Partial<SuggestSong> = {}): SuggestSong => ({
  id: 's1',
  title: 'Stand by me',
  author: null,
  category: null,
  level: null,
  chords: 'A, F#m, D, E',
  tempo: 118,
  key: 'A',
  ...overrides,
});

describe('fields', () => {
  it('asks only for an empty or non-standard field', () => {
    expect(needsValue(song(), 'author')).toBe(true);
    expect(needsValue(song({ author: 'Ben E. King' }), 'author')).toBe(false);
    expect(needsValue(song({ category: 'rock n roll' }), 'category')).toBe(true);
    expect(needsValue(song({ category: 'Pop' }), 'category')).toBe(false);
    expect(needsValue(song({ level: 'beginner' }), 'level')).toBe(false);
  });

  it('keeps only values Strummy stores', () => {
    expect(normaliseValue('category', 'classic rock')).toBe('Classic Rock');
    expect(normaliseValue('category', 'Shoegaze')).toBeNull();
    expect(normaliseValue('level', 'Intermediate')).toBe('intermediate');
    expect(normaliseValue('level', 'expert')).toBeNull();
    expect(normaliseValue('author', '  Ben E. King ')).toBe('Ben E. King');
    expect(normaliseValue('author', 'x'.repeat(101))).toBeNull();
    expect(normaliseValue('author', 'Nieznany')).toBeNull();
    expect(songChange('level', 'starter')).toEqual({ level: 'starter' });
  });
});

describe('prompt', () => {
  it('lists the allowed genres and the songs, nothing about students', () => {
    const [system, user] = buildMessages('category', [song({ category: 'rock n roll' })]);
    expect(system.content).toMatch(/JSON only/);
    expect(user.content).toContain('Classic Rock');
    expect(user.content).toContain('"current_genre":"rock n roll"');
    expect(user.content).not.toMatch(/student/i);
  });

  it('keeps usable answers: a known song, an allowed value, once, confidence clamped', () => {
    const songs = [song(), song({ id: 's2', category: 'Pop' })];
    const content =
      'Sure!\n```json\n[{"i":0,"value":"pop","confidence":1.4,"reason":" Klasyk soul "},' +
      '{"i":0,"value":"Rock","confidence":0.5},{"i":1,"value":"Pop","confidence":0.9},' +
      '{"i":5,"value":"Rock","confidence":0.9},{"i":1,"value":"Shoegaze","confidence":0.9}]\n```';
    expect(parseAnswer('category', content, songs)).toEqual([
      { songId: 's1', field: 'category', value: 'Pop', confidence: 1, reason: 'Klasyk soul' },
    ]);
    expect(parseAnswer('category', 'no idea', songs)).toEqual([]);
  });
});

describe('suggestBatch', () => {
  it('tags the proposals with their source and passes a model error through', async () => {
    const ask = jest
      .fn()
      .mockResolvedValue({ content: '[{"i":0,"value":"Ben E. King","confidence":0.95}]' });
    await expect(suggestBatch('author', [song()], ask, 'claude:haiku')).resolves.toEqual({
      suggestions: [
        {
          songId: 's1',
          field: 'author',
          value: 'Ben E. King',
          confidence: 0.95,
          reason: null,
          source: 'claude:haiku',
        },
      ],
      error: null,
    });
    const failing = jest.fn().mockResolvedValue({ error: 'offline' });
    await expect(suggestBatch('author', [song()], failing, 'local:qwen')).resolves.toEqual({
      suggestions: [],
      error: 'offline',
    });
    await expect(suggestBatch('author', [], ask, 'x')).resolves.toEqual({
      suggestions: [],
      error: null,
    });
  });
});
