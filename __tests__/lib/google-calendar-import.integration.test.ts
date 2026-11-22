/**
 * Integration tests for Google Calendar Import (Journey 6)
 *
 * Tests bulk import utilities: month chunking, lesson status and conflict
 * detection/resolution. Student resolution lives in calendar-attendee.test.ts.
 */

import { generateMonthChunks, determineLessonStatus } from '@/lib/services/calendar-bulk-import';
import {
  detectConflict,
  resolveConflict,
  DEFAULT_CONFLICT_CONFIG,
  type LessonData,
  type GoogleEventData,
} from '@/lib/services/sync-conflict-resolver';

describe('Google Calendar Import (Journey 6)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateMonthChunks', () => {
    it('splits a 3-month range into 3 chunks with correct boundaries', () => {
      const start = new Date('2025-01-15');
      const end = new Date('2025-03-20');
      const chunks = generateMonthChunks(start, end);

      expect(chunks).toHaveLength(3);
      expect(chunks[0].start.getMonth()).toBe(0);
      expect(chunks[0].start.getDate()).toBe(1);
      expect(chunks[0].label).toContain('Jan');
      expect(chunks[1].start.getMonth()).toBe(1);
      expect(chunks[1].label).toContain('Feb');
      expect(chunks[2].start.getMonth()).toBe(2);
      expect(chunks[2].end.getTime()).toBeLessThanOrEqual(end.getTime());
    });
  });

  describe('determineLessonStatus', () => {
    it('returns COMPLETED for past events, SCHEDULED for future', () => {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      const future = new Date();
      future.setDate(future.getDate() + 7);

      expect(determineLessonStatus(past.toISOString())).toBe('COMPLETED');
      expect(determineLessonStatus(future.toISOString())).toBe('SCHEDULED');
    });
  });

  describe('detectConflict', () => {
    const baseLessonData: LessonData = {
      id: 'lesson-1',
      title: 'Guitar Lesson',
      scheduled_at: '2025-03-01T10:00:00Z',
      notes: 'Practice scales',
      updated_at: '2025-03-01T08:00:00Z',
    };
    const baseEventData: GoogleEventData = {
      id: 'event-1',
      summary: 'Guitar Lesson',
      description: 'Practice scales',
      start: { dateTime: '2025-03-01T10:00:00Z' },
      updated: '2025-03-01T08:00:00Z',
    };

    it('returns null when local and remote are identical', () => {
      expect(detectConflict(baseLessonData, baseEventData)).toBeNull();
    });

    it('returns ConflictInfo with fields.title when title differs', () => {
      const modifiedEvent: GoogleEventData = {
        ...baseEventData,
        summary: 'Updated Title',
        updated: '2025-03-01T09:00:00Z',
      };
      const result = detectConflict(baseLessonData, modifiedEvent);
      expect(result).not.toBeNull();
      expect(result!.fields.title).toEqual({ local: 'Guitar Lesson', remote: 'Updated Title' });
      expect(result!.lessonId).toBe('lesson-1');
    });
  });

  describe('resolveConflict', () => {
    it('returns use_remote when event is newer than lesson', () => {
      const conflict = {
        lessonId: 'lesson-1',
        lessonUpdated: new Date('2025-03-01T08:00:00Z'),
        eventUpdated: new Date('2025-03-01T10:00:00Z'),
        timeDifferenceMs: 2 * 60 * 60 * 1000,
        fields: { title: { local: 'Old', remote: 'New' } },
      };
      expect(resolveConflict(conflict, DEFAULT_CONFLICT_CONFIG)).toBe('use_remote');
    });

    it('returns use_local when lesson is newer than event', () => {
      const conflict = {
        lessonId: 'lesson-1',
        lessonUpdated: new Date('2025-03-01T10:00:00Z'),
        eventUpdated: new Date('2025-03-01T08:00:00Z'),
        timeDifferenceMs: 2 * 60 * 60 * 1000,
        fields: { title: { local: 'New', remote: 'Old' } },
      };
      expect(resolveConflict(conflict, DEFAULT_CONFLICT_CONFIG)).toBe('use_local');
    });

    it('returns manual_review when updates are within simultaneous threshold', () => {
      const conflict = {
        lessonId: 'lesson-1',
        lessonUpdated: new Date('2025-03-01T10:00:00Z'),
        eventUpdated: new Date('2025-03-01T10:00:30Z'),
        timeDifferenceMs: 30_000,
        fields: { title: { local: 'A', remote: 'B' } },
      };
      expect(resolveConflict(conflict, DEFAULT_CONFLICT_CONFIG)).toBe('manual_review');
    });
  });
});
