import { FretboardPresetSchema } from '../FretboardPresetSchema';

describe('FretboardPresetSchema', () => {
  it('accepts a named shareable-link query', () => {
    const r = FretboardPresetSchema.safeParse({
      name: '  A minor box ',
      query: '?key=A&mode=scale&scale=pentatonic_minor&caged=E',
    });
    expect(r.success).toBe(true);
    expect(r.success && r.data.name).toBe('A minor box');
  });

  it('rejects an empty name and an over-long one', () => {
    expect(FretboardPresetSchema.safeParse({ name: '   ', query: '?key=A' }).success).toBe(false);
    expect(FretboardPresetSchema.safeParse({ name: 'x'.repeat(61), query: '?key=A' }).success).toBe(
      false
    );
  });

  it('rejects anything that is not a plain query string', () => {
    for (const query of ['key=A', '?key=<script>', 'https://evil.example/?key=A', '?']) {
      expect(FretboardPresetSchema.safeParse({ name: 'x', query }).success).toBe(false);
    }
  });
});
