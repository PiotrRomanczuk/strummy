import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { cn } from '@/lib/utils';

import { LAB_PATH } from './lab.helpers';

const SECTIONS = [
  { id: 'sources', href: LAB_PATH },
  { id: 'songs', href: `${LAB_PATH}/songs` },
] as const;

type Props = { active: (typeof SECTIONS)[number]['id'] };

export async function LabNav({ active }: Props) {
  const t = await getTranslations('Lab.nav');
  return (
    <nav className="flex gap-2 text-sm" aria-label={t('label')}>
      {SECTIONS.map((section) => (
        <Link
          key={section.id}
          href={section.href}
          aria-current={section.id === active ? 'page' : undefined}
          className={cn(
            'rounded-full px-3 py-1',
            section.id === active
              ? 'bg-foreground text-background'
              : 'border text-muted-foreground hover:text-foreground'
          )}
        >
          {t(section.id)}
        </Link>
      ))}
    </nav>
  );
}
