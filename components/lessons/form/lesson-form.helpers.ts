/**
 * The form keeps one `datetime-local` string ("2026-04-30T16:00") but the
 * Claude Design form asks for Date and Time separately. These convert between
 * the two without losing a half-filled value.
 */
export const splitLocal = (local: string): { date: string; time: string } => {
  const [date = '', time = ''] = local.split('T');
  return { date, time: time.slice(0, 5) };
};

export const joinLocal = (date: string, time: string): string =>
  date || time ? `${date}T${time}` : '';
