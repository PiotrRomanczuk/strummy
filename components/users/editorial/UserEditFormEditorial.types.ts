export type StudentStatus = 'lead' | 'trial' | 'active' | 'inactive' | 'churned';

export type EditableUser = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isActive: boolean;
  studentStatus: StudentStatus;
  // Student intake metadata (see 20260723120200_profiles_student_fields.sql).
  studentEmail: string | null;
  skillLevel: string | null;
  instrument: string | null;
  startDate: string | null;
  avatarColor: string | null;
  parentName: string | null;
  parentEmail: string | null;
  /** ISO 8601 weekday, 1 = Monday … 7 = Sunday (profiles.lesson_day_of_week). */
  lessonDayOfWeek: number | null;
  /** Postgres time as HH:MM:SS (profiles.lesson_time_local). */
  lessonTimeLocal: string | null;
  lessonDurationMinutes: number | null;
  lessonRate: number | null;
  billingCycle: string | null;
  goals: string | null;
};
