import '@/app/design-tokens.css';

import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { NotificationPreferences } from '@/components/settings/notification-preferences';
import { SettingsShell } from '@/components/settings/Settings.Shell';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';

export const metadata = {
  title: 'Notification preferences',
};

export default async function Page() {
  const { user, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) {
    redirect('/sign-in?redirect=/dashboard/settings/notifications');
  }
  const t = await getTranslations('Settings');

  return (
    <div className="theme-strummy">
      <SettingsShell
        active="notifications"
        showOperatorTabs={isAdmin || isTeacher}
        sub={t('notificationsSub')}
      >
        <div style={{ maxWidth: 720 }}>
          <NotificationPreferences userId={user.id} />
        </div>
      </SettingsShell>
    </div>
  );
}
