import { redirect } from 'next/navigation';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getStudentRepertoireAction } from '@/app/actions/repertoire';
import { Repertoire } from '@/components/repertoire';

/**
 * Repertoire page (spec 05). Shows the signed-in student's repertoire via
 * RLS-scoped `getStudentRepertoireAction`. Students may edit own notes +
 * difficulty inline (the action whitelists those keys for non-staff callers).
 */
export default async function RepertoirePage() {
  const { user, profileId, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) redirect('/sign-in');

  // student_repertoire.student_id is a PROFILE id. Passing `user.id` (the auth
  // id) returned an empty repertoire for every account created after S2 —
  // including every claimed shadow student, whose songs were sitting right
  // there in the table.
  const result = await getStudentRepertoireAction(profileId);
  const entries = 'data' in result ? result.data : [];

  // Staff viewing their OWN /dashboard/repertoire is rare; the per-student
  // teacher edit-all flow lives on the student profile. Here a non-staff viewer
  // (student) gets inline self-edit of notes + difficulty.
  const canEdit = !isAdmin && !isTeacher;

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <Repertoire entries={entries} canEdit={canEdit} />
    </div>
  );
}
