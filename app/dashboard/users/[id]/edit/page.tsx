import '@/app/design-tokens.css';

import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { notFound, redirect } from 'next/navigation';

import { UserEditForm, type EditableUser } from '@/components/users/UserEditForm';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { canEditStudent } from '@/lib/services/teacher-student-edit';
import { createClient } from '@/lib/supabase/server';

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

type PageProps = { params: Promise<{ id: string }> };

export default async function UserEditPage({ params }: PageProps) {
  const { id } = await params;
  const { user, profileId, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) {
    redirect(`/sign-in?redirect=/dashboard/users/${id}/edit`);
  }
  // Admins edit anyone; a teacher only a student they teach (#1178). The RPC
  // behind the save enforces the same rule in the database.
  if (!(await canEditStudent({ profileId, isAdmin, isTeacher }, id))) {
    redirect(`/dashboard/users/${id}`);
  }

  const supabase = await createClient();
  // Teacher notes live in the staff-only student_private_notes (#1096).
  const [{ data }, { data: privateNote, error: noteError }] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'id, full_name, email, phone, invite_email, is_admin, is_teacher, is_student, is_active, student_status, skill_level, instrument, start_date, avatar_color, parent_name, parent_email, lesson_day_of_week, lesson_time_local, lesson_duration_minutes, lesson_rate, billing_cycle'
      )
      .eq('id', id)
      .single(),
    supabase.from('student_private_notes').select('notes').eq('profile_id', id).maybeSingle(),
  ]);

  if (!data) {
    notFound();
  }
  // Never open the form with an empty note because the query failed: saving it
  // would clear the real one.
  if (noteError) {
    throw new Error(`Could not load the private note: ${noteError.message}`);
  }

  const editable: EditableUser = {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    phone: data.phone ?? null,
    isAdmin: data.is_admin ?? false,
    isTeacher: data.is_teacher ?? false,
    isStudent: data.is_student ?? false,
    isActive: data.is_active ?? true,
    studentStatus: data.student_status ?? 'active',
    studentEmail: data.invite_email ?? null,
    skillLevel: data.skill_level ?? null,
    instrument: data.instrument ?? null,
    startDate: data.start_date ?? null,
    avatarColor: data.avatar_color ?? null,
    parentName: data.parent_name ?? null,
    parentEmail: data.parent_email ?? null,
    lessonDayOfWeek: data.lesson_day_of_week ?? null,
    lessonTimeLocal: data.lesson_time_local ?? null,
    lessonDurationMinutes: data.lesson_duration_minutes ?? null,
    lessonRate: data.lesson_rate ?? null,
    billingCycle: data.billing_cycle ?? null,
    goals: privateNote?.notes ?? null,
  };

  return (
    <div className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <UserEditForm user={editable} canManageAccount={isAdmin} />
    </div>
  );
}
