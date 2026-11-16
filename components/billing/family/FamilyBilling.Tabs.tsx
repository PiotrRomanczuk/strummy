import Link from 'next/link';
import { useTranslations } from 'next-intl';

export type BillingSubject = { id: string; name: string; href: string };

type Props = { subjects: BillingSubject[]; activeId: string };

/** Whose billing is shown: "Me" and each child, or the children of a parent-only account. */
export const FamilyBillingTabs = ({ subjects, activeId }: Props) => {
  const t = useTranslations('Billing');
  if (subjects.length < 2) return null;

  return (
    <nav className="mb-5 flex flex-wrap gap-2" aria-label={t('familyChildSwitch')}>
      {subjects.map((subject) => (
        <Link
          key={subject.id}
          href={subject.href}
          aria-current={subject.id === activeId ? 'page' : undefined}
          className={`rounded-full border px-3 py-1 text-sm ${
            subject.id === activeId
              ? 'border-[var(--gold-2)] bg-[var(--gold-tint)] text-[var(--ink)]'
              : 'border-[var(--rule)] text-[var(--ink-3)]'
          }`}
        >
          {subject.name}
        </Link>
      ))}
    </nav>
  );
};
