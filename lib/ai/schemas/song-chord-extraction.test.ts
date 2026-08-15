import { songChordExtractionSchema } from './song-chord-extraction';

describe('songChordExtractionSchema', () => {
  it('accepts a fully populated valid payload', () => {
    const result = songChordExtractionSchema.safeParse({
      capoFret: 4,
      strummingPattern: 'D DU UDU',
      timeSignature: 4,
      chordsUsed: ['G', 'C', 'D', 'Em'],
      confidence: 90,
      reasoning: 'Explicit capo and pattern in the text',
      needsManualReview: false,
    });
    expect(result.success).toBe(true);
  });

  it('accepts nulls for fields not present in the source text', () => {
    const result = songChordExtractionSchema.safeParse({
      capoFret: null,
      strummingPattern: null,
      timeSignature: null,
      chordsUsed: [],
      confidence: 20,
      reasoning: 'No capo/pattern/time signature stated',
      needsManualReview: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects capoFret outside 0-20', () => {
    const result = songChordExtractionSchema.safeParse({
      capoFret: 21,
      strummingPattern: null,
      timeSignature: null,
      chordsUsed: [],
      confidence: 50,
      reasoning: 'x',
      needsManualReview: false,
    });
    expect(result.success).toBe(false);
  });

  it('rejects confidence outside 0-100', () => {
    const result = songChordExtractionSchema.safeParse({
      capoFret: null,
      strummingPattern: null,
      timeSignature: null,
      chordsUsed: [],
      confidence: 150,
      reasoning: 'x',
      needsManualReview: false,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing chordsUsed field', () => {
    const result = songChordExtractionSchema.safeParse({
      capoFret: null,
      strummingPattern: null,
      timeSignature: null,
      confidence: 50,
      reasoning: 'x',
      needsManualReview: false,
    });
    expect(result.success).toBe(false);
  });
});
