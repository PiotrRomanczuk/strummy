/** An unclosed past lesson is "overdue" to staff, neutral to the student. */
import { lessonStatusColour, lessonStatusLabel } from './lessons-queries';

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));

const messages: Record<string, string> = {
  statusOverdue: 'Overdue',
  statusScheduled: 'Scheduled',
  statusCompleted: 'Completed',
  statusAwaitingConfirmation: 'Awaiting confirmation',
};
const t = (key: string) => messages[key] ?? key;
const past = new Date(Date.now() - 3 * 86_400_000).toISOString();
const future = new Date(Date.now() + 3 * 86_400_000).toISOString();

describe('lessonStatusLabel / lessonStatusColour', () => {
  it('keeps "overdue" for the teacher view', () => {
    expect(lessonStatusLabel('SCHEDULED', t, past)).toBe('Overdue');
    expect(lessonStatusColour('SCHEDULED', past)).toBe('var(--warn)');
  });

  it('shows the student a neutral "awaiting confirmation"', () => {
    expect(lessonStatusLabel('SCHEDULED', t, past, true)).toBe('Awaiting confirmation');
    expect(lessonStatusColour('SCHEDULED', past, true)).toBe('var(--ink-4)');
  });

  it('does not touch upcoming or closed lessons in the student view', () => {
    expect(lessonStatusLabel('SCHEDULED', t, future, true)).toBe('Scheduled');
    expect(lessonStatusLabel('COMPLETED', t, past, true)).toBe('Completed');
  });
});
