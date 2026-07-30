/**
 * LessonSchema Tests
 *
 * Tests validation for lesson-related Zod schemas:
 * - LessonSchema (full lesson validation)
 * - LessonInputSchema (create operations)
 * - LessonStatusEnum (status values)
 * - SongStatusEnum (song status in lessons)
 * - LessonSongSchema (lesson-song relationship)
 *
 * @see schemas/LessonSchema.ts
 */

import {
  LessonSchema,
  LessonInputSchema,
  LessonStatusEnum,
  SongStatusEnum,
  LessonSongSchema,
  LessonWithProfilesSchema,
} from '../LessonSchema';

describe('LessonSchema', () => {
  const validStudentId = '550e8400-e29b-41d4-a716-446655440001';
  const validTeacherId = '550e8400-e29b-41d4-a716-446655440002';

  describe('LessonStatusEnum', () => {
    it('should accept SCHEDULED status', () => {
      const result = LessonStatusEnum.safeParse('SCHEDULED');
      expect(result.success).toBe(true);
    });

    it('should accept IN_PROGRESS status', () => {
      const result = LessonStatusEnum.safeParse('IN_PROGRESS');
      expect(result.success).toBe(true);
    });

    it('should accept COMPLETED status', () => {
      const result = LessonStatusEnum.safeParse('COMPLETED');
      expect(result.success).toBe(true);
    });

    it('should accept CANCELLED status', () => {
      const result = LessonStatusEnum.safeParse('CANCELLED');
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = LessonStatusEnum.safeParse('INVALID');
      expect(result.success).toBe(false);
    });

    it('should reject lowercase status', () => {
      const result = LessonStatusEnum.safeParse('scheduled');
      expect(result.success).toBe(false);
    });
  });

  describe('SongStatusEnum', () => {
    const validStatuses = ['to_learn', 'started', 'remembered', 'with_author', 'mastered'];

    it('should accept all valid song statuses', () => {
      for (const status of validStatuses) {
        const result = SongStatusEnum.safeParse(status);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid song status', () => {
      const result = SongStatusEnum.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('LessonInputSchema', () => {
    const validLessonInput = {
      student_id: validStudentId,
      teacher_id: validTeacherId,
      scheduled_at: '2024-01-15T10:00:00Z',
    };

    it('should validate a valid lesson input', () => {
      const result = LessonInputSchema.safeParse(validLessonInput);
      expect(result.success).toBe(true);
    });

    it('should require student_id', () => {
      const result = LessonInputSchema.safeParse({
        ...validLessonInput,
        student_id: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Validation.selectStudent');
      }
    });

    it('should require teacher_id', () => {
      const result = LessonInputSchema.safeParse({
        ...validLessonInput,
        teacher_id: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Validation.selectTeacher');
      }
    });

    it('should require scheduled_at', () => {
      const result = LessonInputSchema.safeParse({
        student_id: validStudentId,
        teacher_id: validTeacherId,
        scheduled_at: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Validation.scheduledDateTimeRequired');
      }
    });

    it('should validate student_id is UUID', () => {
      const result = LessonInputSchema.safeParse({
        ...validLessonInput,
        student_id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Validation.studentMustBeValidUser');
      }
    });

    it('should validate teacher_id is UUID', () => {
      const result = LessonInputSchema.safeParse({
        ...validLessonInput,
        teacher_id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Validation.teacherMustBeValidUser');
      }
    });

    it('should accept optional title', () => {
      const result = LessonInputSchema.safeParse({
        ...validLessonInput,
        title: 'Guitar Basics Lesson 1',
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional notes', () => {
      const result = LessonInputSchema.safeParse({
        ...validLessonInput,
        notes: 'Focus on chord transitions',
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional status', () => {
      const result = LessonInputSchema.safeParse({
        ...validLessonInput,
        status: 'SCHEDULED',
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional song_ids array', () => {
      const result = LessonInputSchema.safeParse({
        ...validLessonInput,
        song_ids: [
          '550e8400-e29b-41d4-a716-446655440003',
          '550e8400-e29b-41d4-a716-446655440004',
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should validate song_ids are UUIDs', () => {
      const result = LessonInputSchema.safeParse({
        ...validLessonInput,
        song_ids: ['not-a-uuid'],
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional date and start_time', () => {
      const result = LessonInputSchema.safeParse({
        ...validLessonInput,
        date: '2024-01-15',
        start_time: '10:00',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('LessonSchema', () => {
    it('should validate a complete lesson', () => {
      const result = LessonSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        student_id: validStudentId,
        teacher_id: validTeacherId,
        lesson_number: 1,
        title: 'First Lesson',
        notes: 'Introduction',
        status: 'SCHEDULED',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('should allow optional id', () => {
      const result = LessonSchema.safeParse({
        student_id: validStudentId,
        teacher_id: validTeacherId,
        status: 'SCHEDULED',
      });
      expect(result.success).toBe(true);
    });

    it('should default status to SCHEDULED', () => {
      const result = LessonSchema.safeParse({
        student_id: validStudentId,
        teacher_id: validTeacherId,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('SCHEDULED');
      }
    });

    it('should allow null lesson_number', () => {
      const result = LessonSchema.safeParse({
        student_id: validStudentId,
        teacher_id: validTeacherId,
        lesson_number: null,
        status: 'SCHEDULED',
      });
      expect(result.success).toBe(true);
    });

    it('should validate lesson_number is positive', () => {
      const result = LessonSchema.safeParse({
        student_id: validStudentId,
        teacher_id: validTeacherId,
        lesson_number: 0,
        status: 'SCHEDULED',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('LessonSongSchema', () => {
    const validLessonSong = {
      lesson_id: '550e8400-e29b-41d4-a716-446655440000',
      song_id: '550e8400-e29b-41d4-a716-446655440001',
    };

    it('should validate a lesson-song relationship', () => {
      const result = LessonSongSchema.safeParse(validLessonSong);
      expect(result.success).toBe(true);
    });

    it('should default song_status to to_learn', () => {
      const result = LessonSongSchema.safeParse(validLessonSong);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.song_status).toBe('to_learn');
      }
    });

    it('should accept custom song_status', () => {
      const result = LessonSongSchema.safeParse({
        ...validLessonSong,
        song_status: 'mastered',
      });
      expect(result.success).toBe(true);
    });

    it('should validate lesson_id is UUID', () => {
      const result = LessonSongSchema.safeParse({
        ...validLessonSong,
        lesson_id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should validate song_id is UUID', () => {
      const result = LessonSongSchema.safeParse({
        ...validLessonSong,
        song_id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('LessonWithProfilesSchema', () => {
    const baseLesson = {
      student_id: validStudentId,
      teacher_id: validTeacherId,
      status: 'SCHEDULED',
    };

    it('should validate lesson with profiles', () => {
      const result = LessonWithProfilesSchema.safeParse({
        ...baseLesson,
        profile: {
          id: validStudentId,
          full_name: 'John Doe',
          email: 'john@example.com',
        },
        teacher_profile: {
          id: validTeacherId,
          full_name: 'Teacher Name',
          email: 'teacher@example.com',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should allow null profiles', () => {
      const result = LessonWithProfilesSchema.safeParse({
        ...baseLesson,
        profile: null,
        teacher_profile: null,
      });
      expect(result.success).toBe(true);
    });

    it('should validate lesson with songs', () => {
      const result = LessonWithProfilesSchema.safeParse({
        ...baseLesson,
        lesson_songs: [
          { song: { title: 'Wonderwall' } },
          { song: { title: 'Hotel California' } },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should validate lesson with assignments', () => {
      const result = LessonWithProfilesSchema.safeParse({
        ...baseLesson,
        assignments: [
          { title: 'Practice chord transitions' },
          { title: 'Learn new song' },
        ],
      });
      expect(result.success).toBe(true);
    });
  });
});
