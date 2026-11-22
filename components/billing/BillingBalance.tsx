import { useTranslations } from 'next-intl';

import { balanceState } from '@/lib/services/billing/student-billing.helpers';

type Props = { balance: number; className?: string };

/** "3 lessons left" / "No paid lessons" / "1 lesson to pay for" — in red when owed. */
export const BillingBalance = ({ balance, className = 'text-[32px]' }: Props) => {
  const t = useTranslations('Billing');
  const state = balanceState(balance);

  return (
    <p
      className={`font-[var(--serif)] leading-tight ${className} ${
        state.kind === 'due' ? 'text-destructive' : 'text-[var(--ink)]'
      }`}
      data-testid="student-billing-balance"
      data-balance={balance}
    >
      {state.kind === 'credit' && t('balanceCredit', { count: state.lessons })}
      {state.kind === 'zero' && t('balanceZero')}
      {state.kind === 'due' && t('balanceDue', { count: state.lessons })}
    </p>
  );
};
