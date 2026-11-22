export interface MonthChunk {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Generate month-boundary chunks between two dates for paginated fetching.
 */
export function generateMonthChunks(startDate: Date, endDate: Date): MonthChunk[] {
  const chunks: MonthChunk[] = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  while (current < endDate) {
    const monthStart = new Date(current);
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);
    const effectiveEnd = monthEnd > endDate ? endDate : monthEnd;

    chunks.push({
      start: monthStart,
      end: effectiveEnd,
      label: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    });

    current.setMonth(current.getMonth() + 1);
  }

  return chunks;
}

/**
 * Determine lesson status based on whether the event is in the past or future.
 */
export function determineLessonStatus(eventStartTime: string): 'COMPLETED' | 'SCHEDULED' {
  return new Date(eventStartTime) < new Date() ? 'COMPLETED' : 'SCHEDULED';
}
