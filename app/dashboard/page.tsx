import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';

function resolveRoleLabel(isAdmin: boolean, isTeacher: boolean, isStudent: boolean): string {
  const roles: string[] = [];
  if (isAdmin) roles.push('Admin');
  if (isTeacher) roles.push('Teacher');
  if (isStudent) roles.push('Student');
  return roles.length > 0 ? roles.join(' · ') : 'No role assigned';
}

export default async function DashboardPage() {
  const { user, isAdmin, isTeacher, isStudent } = await getUserWithRolesSSR();

  return (
    <div className="mx-auto max-w-2xl p-6">
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
    </div>
  );
}
