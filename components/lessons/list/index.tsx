import { createClient } from '@/lib/supabase/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { LessonListClient } from '@/components/lessons/list/Client';
import { LessonWithProfiles } from '@/schemas/LessonSchema';
import { transformLessonData } from '@/app/api/(curriculum)/lessons/utils';
import { logger } from '@/lib/logger';

interface LessonListProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function LessonList({ searchParams }: LessonListProps) {
  const { user, isAdmin, isTeacher, isStudent } = await getUserWithRolesSSR();

  if (!user) {
    return <div data-testid="lesson-list-error">Not authenticated</div>;
  }

  const supabase = await createClient();

  const studentId =
    typeof searchParams?.studentId === 'string' ? searchParams.studentId : undefined;
  const search = typeof searchParams?.search === 'string' ? searchParams.search : undefined;
  const status = typeof searchParams?.status === 'string' ? searchParams.status : undefined;

  // Base query with profile joins
  let lessonQuery = supabase.from('lessons').select(`
      *,
      profile:profiles!lessons_student_id_fkey(id, full_name, email),
      teacher_profile:profiles!lessons_teacher_id_fkey(id, full_name, email),
      lesson_songs(
        song:songs(title)
      ),
      assignments(title)
    `);

  // Role-based filtering
  if (isAdmin) {
    // Admin sees all lessons
  } else if (isTeacher) {
    // Teacher sees only their students' lessons
    lessonQuery = lessonQuery.eq('teacher_id', user.id);
  } else if (isStudent) {
    // Student sees only their own lessons
    lessonQuery = lessonQuery.eq('student_id', user.id);
  }

  // Apply filters
  if (studentId) {
    lessonQuery = lessonQuery.eq('student_id', studentId);
  }

  if (search) {
    lessonQuery = lessonQuery.or(`title.ilike.%${search}%,notes.ilike.%${search}%`);
  }

  if (status && status !== 'all') {
    lessonQuery = lessonQuery.eq('status', status.toUpperCase());
  }

  // Order by scheduled_at descending
  lessonQuery = lessonQuery.order('scheduled_at', { ascending: false });
  lessonQuery = lessonQuery.order('created_at', { ascending: false });

  const { data: rawLessons, error } = await lessonQuery;

  if (error) {
    logger.error('Error fetching lessons:', error);
    return <div data-testid="lesson-list-error">Error loading lessons: {error.message}</div>;
  }

  // Transform lessons to include date and start_time from scheduled_at
  const lessons = (rawLessons || []).map((lesson) =>
    transformLessonData(lesson as LessonWithProfiles & { scheduled_at?: string })
  ) as LessonWithProfiles[];

  // Fetch students for filter (only if admin or teacher)
  let students: { id: string; full_name: string | null; email: string }[] = [];

  if (isAdmin || isTeacher) {
    let studentsQuery = supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('is_student', true)
      .order('full_name');

    // If teacher, only get their students
    if (isTeacher && !isAdmin) {
      const { data: teacherLessons } = await supabase
        .from('lessons')
        .select('student_id')
        .eq('teacher_id', user.id);

      const studentIds = Array.from(
        new Set(teacherLessons?.map((l) => l.student_id).filter(Boolean))
      );

      if (studentIds.length > 0) {
        studentsQuery = studentsQuery.in('id', studentIds);
      } else {
        students = [];
      }
    }

    if (isAdmin || students.length === 0) {
      const { data: studentsData } = await studentsQuery;
      students = studentsData || [];
    }
  }

  // Fetch teachers for filter (only if admin)
  let teachers: { id: string; full_name: string | null; email: string }[] = [];

  if (isAdmin) {
    const { data: teachersData } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('is_teacher', true)
      .order('full_name');

    teachers = teachersData || [];
  }

  const role = isAdmin ? 'admin' : isTeacher ? 'teacher' : 'student';

  return (
    <LessonListClient
      initialLessons={lessons}
      role={role}
      students={students}
      teachers={teachers}
      selectedStudentId={studentId}
    />
  );
}
