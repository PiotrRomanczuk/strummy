import { redirect } from 'next/navigation';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { CourseForm } from '@/components/theory';

export default async function NewCoursePage() {
  const { isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!isAdmin && !isTeacher) redirect('/dashboard/theory');

  return <CourseForm mode="create" />;
}
