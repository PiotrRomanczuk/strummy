import { useTranslations } from 'next-intl';

import { SectionLabel } from './parent-dashboard.shared';

/** A parent with no child linked yet: what to ask the teacher for. */
export const ParentDashboardEmpty = () => {
  const t = useTranslations('ParentHome');
  return (
    <div className="min-h-full bg-[var(--ivory)] px-8 pb-16 pt-7 text-[13px] leading-[1.4] text-[var(--ink)]">
      <div className="mx-auto my-12 max-w-[460px] text-center">
        <SectionLabel>{t('portalLabel')}</SectionLabel>
        <h1 className="mx-0 mb-2.5 mt-2.5 font-serif text-[30px] font-medium italic tracking-[-0.02em]">
          {t('noChildTitle')}
        </h1>
        <p className="text-sm leading-relaxed text-[var(--ink-3)]">{t('noChildBody')}</p>
      </div>
    </div>
  );
};
