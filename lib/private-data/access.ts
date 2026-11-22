import { NextResponse } from 'next/server';
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

/** API guard: a response to return early, or null when the admin may read the hub. */
export async function labApiGuard(): Promise<NextResponse | null> {
  if (!isPrivateDataAvailable()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const { user, isAdmin } = await getUserWithRolesSSR();
  if (!user || !isAdmin) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  return null;
}
