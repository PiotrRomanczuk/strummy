import '@/app/design-tokens.css';

import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { redirect } from 'next/navigation';

import {
  Notifications,
  NOTIFICATIONS_PAGE_SIZE,
} from '@/components/notifications/Notifications';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getInAppNotifications } from '@/app/actions/in-app-notifications';

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

export default async function NotificationsPage() {
  const { user, profileId } = await getUserWithRolesSSR();
  if (!user || !profileId) {
    redirect('/sign-in?redirect=/dashboard/notifications');
  }

  // Rows are keyed by profiles.id, not the auth id (S2) — see the actions file.
  const now = new Date();
  const notifications = await getInAppNotifications(profileId, {
    limit: NOTIFICATIONS_PAGE_SIZE,
  });

  return (
    <div className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <Notifications notifications={notifications} userId={profileId} now={now} />
    </div>
  );
}
