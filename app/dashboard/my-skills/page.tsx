import '@/app/design-tokens.css';

import { redirect } from 'next/navigation';

import { getSkills, getStudentSkills } from '@/app/actions/student-skills';
import { SkillsChecklist } from '@/components/curriculum';
import { themeFontClass } from '@/components/shared/fonts.constants';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';

/**
 * A student's own skill checklist (SKL-1).
 *
 * The data and the permission to read it already existed — RLS grants
 * `Students can view their own skills`, and `SkillsChecklist` has rendered a
 * read-only variant since it was written. What was missing was a way in: the
 * only route to this view was `/dashboard/users/<your own id>`, which a student
 * had to guess. So the teacher has been assessing into a screen the student
 * could not see.
 *
 * Read-only by construction, three times over: `canEdit={false}` renders badges
 * instead of selects, `upsertStudentSkill` refuses a non-teacher caller, and
 * `student_skills` has no student UPDATE policy at all (ADR-0001 — the DB is the
 * boundary). See docs/app-blueprint/11-skills-assessment.md.
 */
export default async function MySkillsPage() {
  const { user, profileId, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) redirect('/sign-in?redirect=/dashboard/my-skills');

  // Staff assess per student, from the roster — there is no "my skills" for a
  // teacher, and rendering an empty checklist would be a worse answer than
  // sending them where the assessments actually live.
  if (isAdmin || isTeacher) redirect('/dashboard/users');

  // `profileId`, never `user.id`: every `*_id` column is in profile-id space.
  // Passing the auth id here returns an empty list rather than an error — the
  // exact mistake that shipped an empty repertoire for every claimed shadow
  // student. This page takes no id from the URL, so there is nothing to forge.
  const [studentSkills, availableSkills] = await Promise.all([
    getStudentSkills(profileId),
    getSkills(),
  ]);

  return (
    <div className={themeFontClass} style={{ minHeight: '100%' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 22px 40px' }}>
        <SkillsChecklist
          studentId={profileId}
          studentSkills={studentSkills}
          availableSkills={availableSkills}
          canEdit={false}
          variant="student"
          assessedOnly
        />
      </div>
    </div>
  );
}
