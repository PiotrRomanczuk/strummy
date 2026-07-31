import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { CourseList } from '@/components/theory';
import { getTheoryCourses } from './actions';

export default async function TheoryPage() {
  const [courses, { isAdmin, isTeacher }] = await Promise.all([
    getTheoryCourses(),
    getUserWithRolesSSR(),
  ]);

  return <CourseList courses={courses} isStaff={isAdmin || isTeacher} />;
}
