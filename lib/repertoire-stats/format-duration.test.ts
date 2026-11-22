import { formatDuration } from './mismatches';

describe('formatDuration', () => {
  it('formats minutes and seconds', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(258_000)).toBe('4:18');
  });

  it('carries rounded seconds into the minute', () => {
    expect(formatDuration(59_600)).toBe('1:00');
    expect(formatDuration(119_600)).toBe('2:00');
    expect(formatDuration(119_400)).toBe('1:59');
  });
});
