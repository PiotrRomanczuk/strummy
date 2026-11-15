import React from 'react';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import type { FamilyBilling as FamilyBillingData } from '@/lib/services/billing/family-billing-queries';
import type { StudentPurchase } from '@/lib/services/billing/student-billing.helpers';
import { renderWithIntl } from '@/lib/testing/intl-test-utils';

import { FamilyBilling } from './FamilyBilling';

const pending = (overrides: Partial<StudentPurchase> = {}): StudentPurchase => ({
  id: 'p1',
  description: 'Karnet 4',
  lessonCount: 4,
  amountCents: 48000,
  status: 'pending',
  paymentMethod: null,
  paymentUrl: null,
  dueOn: '2026-11-21',
  paidAt: null,
  createdAt: '2026-11-14T10:00:00Z',
  ...overrides,
});

const billing = (overrides: Partial<FamilyBillingData> = {}): FamilyBillingData => ({
  balance: 0,
  ledger: [],
  purchases: [],
  lessonRate: null,
  hasActivity: true,
  priceList: [],
  ...overrides,
});

describe('FamilyBilling', () => {
  it('says so plainly when the teacher does not use billing', () => {
    renderWithIntl(<FamilyBilling billing={billing({ hasActivity: false })} />);
    expect(screen.getByTestId('family-billing-empty')).toHaveTextContent(
      'does not handle billing in Strummy yet'
    );
    expect(screen.queryByTestId('student-billing-balance')).not.toBeInTheDocument();
  });

  it('shows lessons owed with a hint, and an unpaid package without a pay link yet', () => {
    renderWithIntl(<FamilyBilling billing={billing({ balance: -2, purchases: [pending()] })} />);
    expect(screen.getByTestId('student-billing-balance')).toHaveTextContent('2 lessons to pay for');
    expect(screen.getByText(/settled with your teacher on the next package/)).toBeInTheDocument();
    const row = screen.getByTestId('family-open-purchase');
    expect(row).toHaveTextContent('Karnet 4 · 4 lessons');
    expect(row).toHaveTextContent(/PLN\s?480\.00/);
    expect(row).toHaveTextContent('Online payment will appear here soon');
    expect(screen.queryByRole('link', { name: 'Pay' })).not.toBeInTheDocument();
  });

  it('offers the inFakt payment link once a package has one', () => {
    renderWithIntl(
      <FamilyBilling
        billing={billing({ purchases: [pending({ paymentUrl: 'https://www.infakt.pl/pay/x' })] })}
      />
    );
    const link = screen.getByRole('link', { name: 'Pay' });
    expect(link).toHaveAttribute('href', 'https://www.infakt.pl/pay/x');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('lists the price list and leaves out paid packages from what is due', () => {
    renderWithIntl(
      <FamilyBilling
        billing={billing({
          balance: 4,
          purchases: [pending({ status: 'paid' })],
          priceList: [{ id: 'k8', name: 'Karnet 8', lessonCount: 8, priceCents: 90000 }],
        })}
      />
    );
    expect(screen.queryByTestId('family-open-purchase')).not.toBeInTheDocument();
    expect(screen.getByText('Karnet 8 · 8 lessons')).toBeInTheDocument();
  });
});
