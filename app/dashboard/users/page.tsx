import '@/app/design-tokens.css';

import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { redirect } from 'next/navigation';

import { UsersList } from '@/components/users/UsersList';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getUsersList, type UserListFilters } from '@/lib/services/users-list-queries';

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

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

export default async function UsersListPage({ searchParams }: { searchParams: SearchParams }) {
  const { user, profileId, isAdmin, isTeacher, isStudent } = await getUserWithRolesSSR();
  if (!user) {
    redirect('/sign-in?redirect=/dashboard/users');
  }
  if (!isAdmin && !isTeacher) {
    redirect('/dashboard');
  }

  const sp = await searchParams;
  const filters: UserListFilters = {
    search: first(sp.search),
    role: first(sp.role),
    studentStatus: first(sp.studentStatus),
    active: first(sp.active),
  };

  const rows = await getUsersList({ profileId, isAdmin, isTeacher, isStudent }, filters);

  return (
    <div className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      {/* A teacher's list holds only students they teach, so they may edit
          every row (#1178); people, roles and invites stay admin-only. */}
      <UsersList rows={rows} filters={filters} canEdit={isAdmin || isTeacher} isAdmin={isAdmin} />
    </div>
  );
}
