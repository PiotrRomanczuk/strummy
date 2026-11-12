export interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink: string;
  attendees?: { email?: string; responseStatus?: string }[];
}

export function isGuitarLesson(event: { description?: string | null }): boolean {
  if (!event.description) return false;
  return event.description.includes('Powered by Calendly.com');
}

export function formatEventTime(
  start: { dateTime?: string; date?: string },
  end: { dateTime?: string; date?: string }
) {
  if (start.date) {
    return new Date(start.date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }

  if (start.dateTime && end.dateTime) {
    const startDate = new Date(start.dateTime);
    const endDate = new Date(end.dateTime);

    return `${startDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })} • ${startDate.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })} - ${endDate.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  }

  return '';
}

const MIN_LESSON_MINUTES = 15;
const MAX_LESSON_MINUTES = 180;

/**
 * Length of a calendar event in whole minutes, or null when it cannot be a
 * lesson length. `lessons.duration_minutes` has a CHECK of 15–180, so an
 * all-day or five-minute event must not reach the insert.
 */
export function eventDurationMinutes(
  start: string | null | undefined,
  end: string | null | undefined
): number | null {
  if (!start || !end) return null;
  const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000);
  if (!Number.isFinite(minutes)) return null;
  if (minutes < MIN_LESSON_MINUTES || minutes > MAX_LESSON_MINUTES) return null;
  return minutes;
}
