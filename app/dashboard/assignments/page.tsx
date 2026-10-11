import '@/app/design-tokens.css';

import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { redirect } from 'next/navigation';

import { AssignmentsList } from '@/components/assignments/AssignmentsList';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getAssignmentsList, parseAssignmentListParams } from '@/lib/services/assignments-queries';
import { getSongOptions, getStudentOptions } from '@/lib/services/lesson-form-data';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  weight: ['400', '500'],
  display: 'swap',
});
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['opsz'],
  display: 'swap',
});

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user, profileId, isAdmin, isTeacher, isStudent } = await getUserWithRolesSSR();
  if (!user) {
    redirect('/sign-in?redirect=/dashboard/assignments');
  }

  const asStudent = isStudent && !isTeacher && !isAdmin;
  const parsed = parseAssignmentListParams(await searchParams);
  const canManage = isTeacher || isAdmin;
  // The teacher board always sits on a tab (Open by default), as in the mockup.
  const params = asStudent ? parsed : { ...parsed, tab: parsed.tab ?? 'open' };

  // assignments.teacher_id / student_id and teacher_students.teacher_id are all
  // profile-id columns. Passing `user.id` matched zero rows, so the list was
  // empty for every account and no student was ever selectable.
  const [{ rows, counts }, students, songs] = await Promise.all([
    getAssignmentsList(profileId, asStudent, params),
    canManage ? getStudentOptions(profileId, isAdmin) : Promise.resolve(undefined),
    canManage ? getSongOptions() : Promise.resolve(undefined),
  ]);

  return (
    <div className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <AssignmentsList
        rows={rows}
        counts={counts}
        asStudent={asStudent}
        canCreate={canManage}
        students={students}
        selected={params.selected}
        tab={params.tab}
        songs={songs}
      />
    </div>
  );
}
