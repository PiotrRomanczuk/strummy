import '@/app/design-tokens.css';

import Link from 'next/link';
import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { FamilyBilling } from '@/components/billing/family/FamilyBilling';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getFamilyBilling } from '@/lib/services/billing/family-billing-queries';
import { getParentChildren, resolveActiveChildId } from '@/lib/services/parent-dashboard-queries';

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

type SearchParams = Promise<{ child?: string }>;

/**
 * A student's own billing, or a parent's view of one child's (`?child=`).
 * Teachers manage billing on each student's page, so they are sent there.
 */
export default async function BillingPage({ searchParams }: { searchParams: SearchParams }) {
  const { user, profileId, isAdmin, isTeacher, isStudent, isParent } = await getUserWithRolesSSR();
  if (!user) redirect('/sign-in?redirect=/dashboard/billing');
  if (isTeacher || isAdmin) redirect('/dashboard/users');

  const { child: childParam } = await searchParams;
  const children = !isStudent && isParent ? await getParentChildren(profileId) : [];
  const subjectId = isStudent ? profileId : resolveActiveChildId(children, childParam);
  if (!subjectId) redirect('/dashboard');

  const [t, billing] = await Promise.all([getTranslations('Billing'), getFamilyBilling(subjectId)]);
  const childName = children.find((c) => c.id === subjectId)?.name;

  return (
    <div className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <div className="min-h-full bg-[var(--ivory)] px-4 pb-16 pt-7 text-[var(--ink)] sm:px-8">
        <p className="font-[var(--mono)] text-[11px] uppercase tracking-[.16em] text-[var(--ink-4)]">
          {t('familyEyebrow')}
        </p>
        <h1 className="mb-1.5 mt-1 font-[var(--serif)] text-[34px] italic leading-tight tracking-tight sm:text-[40px]">
          {childName ? t('familyTitleChild', { name: childName }) : t('familyTitle')}
        </h1>
        <p className="mb-6 text-sm text-[var(--ink-3)]">{t('familySubtitle')}</p>

        {children.length > 1 && (
          <nav className="mb-5 flex flex-wrap gap-2" aria-label={t('familyChildSwitch')}>
            {children.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/billing?child=${c.id}`}
                aria-current={c.id === subjectId ? 'page' : undefined}
                className={`rounded-full border px-3 py-1 text-sm ${
                  c.id === subjectId
                    ? 'border-[var(--gold-2)] bg-[var(--gold-tint)] text-[var(--ink)]'
                    : 'border-[var(--rule)] text-[var(--ink-3)]'
                }`}
              >
                {c.name}
              </Link>
            ))}
          </nav>
        )}

        <FamilyBilling billing={billing} />
      </div>
    </div>
  );
}
