import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { AIGenerationHistory } from '@/components/ai/AIGenerationHistory';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';

export async function generateMetadata() {
  const t = await getTranslations('AI');
  return { title: t('pageHistoryTitle') };
}

export default async function Page() {
  const { user, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) {
    redirect('/sign-in?redirect=/dashboard/ai/history');
  }
  if (!isAdmin && !isTeacher) {
    redirect('/dashboard');
  }

  const t = await getTranslations('AI');

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('pageHistoryTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('pageHistoryIntro')}</p>
      </div>
      <AIGenerationHistory />
    </div>
  );
}
