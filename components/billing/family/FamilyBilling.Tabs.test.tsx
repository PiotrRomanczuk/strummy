import React from 'react';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderWithIntl } from '@/lib/testing/intl-test-utils';

import { FamilyBillingTabs } from './FamilyBilling.Tabs';

const me = { id: 'me', name: 'Me', href: '/dashboard/billing' };
const ola = { id: 'ola', name: 'Ola', href: '/dashboard/billing?child=ola' };

describe('FamilyBillingTabs', () => {
  it('is not shown when there is only one billing to look at', () => {
    renderWithIntl(<FamilyBillingTabs subjects={[me]} activeId="me" />);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it("lets a student who is a parent switch between their own and the child's billing", () => {
    renderWithIntl(<FamilyBillingTabs subjects={[me, ola]} activeId="ola" />);
    expect(screen.getByRole('link', { name: 'Me' })).toHaveAttribute('href', '/dashboard/billing');
    expect(screen.getByRole('link', { name: 'Ola' })).toHaveAttribute('aria-current', 'page');
  });
});
