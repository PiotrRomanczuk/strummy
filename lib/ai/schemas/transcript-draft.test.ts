import {
  formatDraftNotes,
  toTranscriptDraft,
  TranscriptDraftOutputSchema,
  TranscriptDraftSchema,
} from './transcript-draft';

const output = {
  notes: {
    practised: ['Zmiany A-D-E z metronomem 60', "- Riff z Now I'm Here"],
    went_well: ['Riff brzmi dobrze'],
    watch_out: [],
  },
  songs: [
    {
      title: "Now I'm Here",
      artist: 'Queen',
      confidence: 1,
      sentiment: 'enthusiastic',
      suggested_status: 'started',
      quotes: ['to brzmi sztos'],
    },
  ],
  homework: [{ title: 'Codziennie A-D-E', description: '5 minut z metronomem' }],
  next_lesson: ["Zwrotka Now I'm Here"],
};

describe('TranscriptDraftOutputSchema', () => {
  it('accepts a full model answer', () => {
    expect(TranscriptDraftOutputSchema.safeParse(output).success).toBe(true);
  });

  it('rejects a status outside the progress enum and more than 8 songs', () => {
    const badStatus = { ...output, songs: [{ ...output.songs[0], suggested_status: 'done' }] };
    expect(TranscriptDraftOutputSchema.safeParse(badStatus).success).toBe(false);
    const tooMany = { ...output, songs: Array(9).fill(output.songs[0]) };
    expect(TranscriptDraftOutputSchema.safeParse(tooMany).success).toBe(false);
  });
});

describe('formatDraftNotes', () => {
  it('renders the three headings in order, skips empty sections, normalises bullets', () => {
    expect(formatDraftNotes(output.notes)).toBe(
      "Co ćwiczyliśmy\n- Zmiany A-D-E z metronomem 60\n- Riff z Now I'm Here\n\nCo poszło\n- Riff brzmi dobrze"
    );
  });

  it('caps at 2000 characters', () => {
    const long = { practised: Array(10).fill('x'.repeat(290)), went_well: [], watch_out: [] };
    expect(formatDraftNotes(long).length).toBe(2000);
  });
});

describe('toTranscriptDraft', () => {
  it('produces the stored shape, valid against TranscriptDraftSchema', () => {
    const parsed = TranscriptDraftOutputSchema.parse(output);
    const draft = toTranscriptDraft(parsed);
    expect(TranscriptDraftSchema.safeParse(draft).success).toBe(true);
    expect(draft.notes_pl.startsWith('Co ćwiczyliśmy')).toBe(true);
    expect(draft.songs).toHaveLength(1);
  });
});
