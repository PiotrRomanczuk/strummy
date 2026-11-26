import { isGuitarLesson } from './calendar-utils';

const calendly = 'Event Name: Pierwsza lekcja\n\nPowered by Calendly.com\n';

describe('isGuitarLesson', () => {
  it('accepts a Calendly booking', () => {
    expect(isGuitarLesson({ summary: 'Ada Student and Teacher', description: calendly })).toBe(
      true
    );
  });

  it.each(['Ang Ada Student and Teacher', 'angielski Ada', 'English: Ada', '  ANG Ada'])(
    'skips a booking titled for another subject: %s',
    (summary) => {
      expect(isGuitarLesson({ summary, description: calendly })).toBe(false);
    }
  );

  it('keeps a name that only starts with the same letters', () => {
    expect(isGuitarLesson({ summary: 'Angela Student and Teacher', description: calendly })).toBe(
      true
    );
  });

  it.each([
    ['no description', { summary: 'Guitar lesson' }],
    ['a hand-typed event', { summary: 'Concert', description: 'Bring tickets' }],
    ['a Cal.com booking (its webhook makes the lesson)', { description: 'Booked via Cal.com' }],
  ])('skips %s', (_label, event) => {
    expect(isGuitarLesson(event)).toBe(false);
  });
});
