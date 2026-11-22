import { notFound, redirect } from 'next/navigation';

import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';

import { isPrivateDataAvailable } from './config';

/**
 * Page guard for every Lab page: 404 when the hub is not on this machine (Vercel, a colleague's
 * checkout), sign-in when logged out, home for anyone but the admin.
 */
export async function requireLabAdmin(path: string): Promise<void> {
  if (!isPrivateDataAvailable()) notFound();
  const { user, isAdmin } = await getUserWithRolesSSR();
  if (!user) redirect(`/sign-in?redirect=${encodeURIComponent(path)}`);
  if (!isAdmin) redirect('/dashboard');
}
