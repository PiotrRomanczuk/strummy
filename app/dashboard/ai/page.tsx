import { redirect } from 'next/navigation';

import { AdminDashboardInsights } from '@/components/dashboard/admin/AdminDashboardInsights';
import { EmailDraftGenerator } from '@/components/dashboard/admin/EmailDraftGenerator';
import { StudentProgressInsights } from '@/components/dashboard/admin/StudentProgressInsights';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getPlatformPulse, getRecentUsers } from '@/lib/services/admin-dashboard-queries';
import { getStudentOptions } from '@/lib/services/lesson-form-data';

export const metadata = {
  title: 'AI Assistant',
};

export default async function AIAssistantPage() {
  const { user, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) {
    redirect('/sign-in?redirect=/dashboard/ai');
  }
  // AI tools here are teacher/admin authoring aids; students have no surface yet.
  if (!isAdmin && !isTeacher) {
    redirect('/dashboard');
  }

  const studentOptions = await getStudentOptions(user.id, isAdmin);
  const students = studentOptions.map((s) => ({
    id: s.id,
    full_name: s.name,
    email: s.email ?? '',
  }));

  // Platform-wide intelligence is admin-only.
  const [pulse, recentUsers] = isAdmin
    ? await Promise.all([getPlatformPulse(), getRecentUsers(10)])
    : [null, []];
  const adminStats = pulse ? { ...pulse, recentUsers } : null;

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Assistant</h1>
        <p className="text-sm text-muted-foreground">
          Generate student emails, analyse progress, and surface business insights. Every output is
          recorded in{' '}
          <a href="/dashboard/ai/history" className="underline underline-offset-2">
            AI History
          </a>
          .
        </p>
      </div>

      {adminStats && <AdminDashboardInsights adminStats={adminStats} />}
      <StudentProgressInsights students={students} />
      <EmailDraftGenerator students={students} />
    </div>
  );
}
