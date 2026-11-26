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

/**
 * A lesson of another subject booked through the same Calendly page: the
 * teacher marks its title ("Ang …", "Angielski …", "English …").
 */
const OTHER_SUBJECT_TITLE = /^\s*(ang|angielski|english)\b/i;

/**
 * Which calendar events are guitar lessons (#1097): those booked through
 * Calendly, where every recurring lesson lives, minus the ones titled for
 * another subject. Cal.com bookings are not read here — its own webhook makes
 * their lessons (`calcom_booking_id`), so importing its calendar copy too
 * would double them. Anything typed into the calendar by hand stays out.
 */
export function isGuitarLesson(event: {
  summary?: string | null;
  description?: string | null;
}): boolean {
  if (!event.description?.includes('Powered by Calendly.com')) return false;
  return !OTHER_SUBJECT_TITLE.test(event.summary ?? '');
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
