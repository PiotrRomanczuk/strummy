/**
 * Features a teacher turns on per student, so a beginner is not overwhelmed.
 * A new student-facing feature gets a key here and starts hidden for everyone.
 * Staff always see it. Stored in `student_feature_access`.
 */

export const STUDENT_FEATURES = ['song-harmony'] as const;

export type StudentFeature = (typeof STUDENT_FEATURES)[number];

export const isStudentFeature = (value: string): value is StudentFeature =>
  (STUDENT_FEATURES as readonly string[]).includes(value);
