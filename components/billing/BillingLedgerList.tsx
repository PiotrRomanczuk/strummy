import { useLocale, useTranslations } from 'next-intl';

import type { LedgerEntry } from '@/lib/services/billing/student-billing.helpers';

type Props = { ledger: LedgerEntry[]; emptyNote: string };

/**
 * Every change to a balance, newest first: packages paid, lessons held,
 * corrections. Shared by the teacher's student tab and the family page.
 */
export const BillingLedgerList = ({ ledger, emptyNote }: Props) => {
  const t = useTranslations('Billing');
  const locale = useLocale();
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale);

  const describe = (entry: LedgerEntry): string => {
    if (entry.reason === 'lesson' && entry.lessonAt) {
      return t('ledgerLesson', { date: date(entry.lessonAt) });
    }
    if (entry.reason === 'purchase' && entry.purchaseDescription) {
      return t('ledgerPurchase', { name: entry.purchaseDescription });
    }
    return entry.note ?? t(`ledgerReason.${entry.reason}`);
  };

  if (ledger.length === 0) {
    return (
      <p className="px-6 py-7 text-center font-[var(--serif)] text-sm italic text-[var(--ink-4)]">
        {emptyNote}
      </p>
    );
  }

  return (
    <ul className="m-0 list-none divide-y divide-[var(--rule-2)] p-0">
      {ledger.map((entry) => (
        <li
          key={entry.id}
          className="flex items-baseline justify-between gap-4 px-6 py-3"
          data-testid="ledger-row"
        >
          <span className="min-w-0 text-sm text-[var(--ink-2)]">{describe(entry)}</span>
          <span
            className={`shrink-0 text-sm font-medium tabular-nums ${
              entry.delta > 0 ? 'text-[var(--ink)]' : 'text-[var(--ink-3)]'
            }`}
          >
            {entry.delta > 0 ? `+${entry.delta}` : `−${-entry.delta}`}
          </span>
        </li>
      ))}
    </ul>
  );
};
