import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingCard } from '@/components/dashboard/states';
import { TodayLessons } from '@/components/dashboard/cards';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';

function resolveRoleLabel(isAdmin: boolean, isTeacher: boolean, isStudent: boolean): string {
  const roles: string[] = [];
  if (isAdmin) roles.push('Admin');
  if (isTeacher) roles.push('Teacher');
  if (isStudent) roles.push('Student');
  return roles.length > 0 ? roles.join(' · ') : 'No role assigned';
}

function resolveActiveView(
  view: string | undefined,
  isAdmin: boolean,
  isTeacher: boolean,
  isStudent: boolean
): 'admin' | 'teacher' | 'student' {
  if (view === 'admin' && isAdmin) return 'admin';
  if (view === 'student' && isStudent) return 'student';
  if (view === 'teacher' && isTeacher) return 'teacher';
  if (isTeacher) return 'teacher';
  if (isStudent) return 'student';
  if (isAdmin) return 'admin';
  return 'teacher';
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { view } = await searchParams;
  const { user, isAdmin, isTeacher, isStudent } = await getUserWithRolesSSR();
  const activeView = resolveActiveView(
    typeof view === 'string' ? view : undefined,
    isAdmin,
    isTeacher,
    isStudent
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">Dashboard rebuild in progress.</p>
          <p>
            <span className="font-medium">Signed in as:</span>{' '}
            <span className="text-muted-foreground">{user?.email ?? 'unknown'}</span>
          </p>
          <p>
            <span className="font-medium">Role:</span>{' '}
            <span className="text-muted-foreground">
              {resolveRoleLabel(isAdmin, isTeacher, isStudent)}
            </span>
          </p>
        </CardContent>
      </Card>

      {activeView === 'teacher' && user && (
        <Suspense fallback={<LoadingCard />}>
          <TodayLessons teacherId={user.id} />
        </Suspense>
      )}
    </div>
  );
}
