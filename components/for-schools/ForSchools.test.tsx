/**
 * Shell tests for `/for-schools` — the school-facing marketing page.
 *
 * What is worth pinning here rather than in E2E: that every section renders
 * from the catalogue (a missing key is a render-time throw in next-intl, not a
 * blank), that the page's only conversion step points at an inbox that can
 * actually receive mail, and that the nav's anchors exist on the page.
 */
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderServerTree as render } from '@/lib/testing/intl-test-utils';

import { ForSchools } from './ForSchools';
import { SCHOOL_ANCHORS, SCHOOL_CONTACT, TIER_KEYS } from './for-schools.data';

describe('ForSchools', () => {
  it('renders the hero headline and both hero calls to action', async () => {
    await render(<ForSchools />);

    // By testid as well as by role: signed in, the app shell contributes its own
    // <h1>, so the E2E suite addresses this headline by testid — pin it here.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Who teaches/);
    expect(screen.getByTestId('for-schools-heading')).toHaveTextContent(/Who teaches/);
    // Twice: the hero and the pilot box both open the same conversation.
    expect(screen.getAllByRole('link', { name: /Book a 20-minute call/ })).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'See pricing' })).toBeInTheDocument();
  });

  it('shows the cover lesson: the absence and the teacher taking it', async () => {
    await render(<ForSchools />);

    // The swap is the argument the whole page makes — both halves have to be in
    // the DOM, since the "after" state is reached by CSS, not by React.
    expect(screen.getByText('Anna L. — off sick')).toBeInTheDocument();
    expect(screen.getByText('Cover: Piotr S.')).toBeInTheDocument();
  });

  it('renders every pricing tier with an amount', async () => {
    await render(<ForSchools />);

    for (const name of ['Small', 'School', 'Network']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
    expect(TIER_KEYS).toHaveLength(3);
    expect(screen.getAllByText('199 zł')).toHaveLength(1);
    expect(screen.getByText('Quote')).toBeInTheDocument();
  });

  it('answers all five questions in the FAQ', async () => {
    const { container } = await render(<ForSchools />);
    expect(container.querySelectorAll('details')).toHaveLength(5);
  });

  it('sends the contact CTAs to an inbox that receives mail, and to the phone', async () => {
    await render(<ForSchools />);

    const email = screen.getAllByTestId('for-schools-email-cta');
    expect(email.length).toBeGreaterThanOrEqual(2);
    for (const link of email) {
      // Never an address on strummy.online: the domain is send-only, so mail to
      // it bounces and the lead is lost silently.
      expect(link.getAttribute('href')).toMatch(
        new RegExp(`^mailto:${SCHOOL_CONTACT.email}\\?subject=`)
      );
      expect(link).not.toHaveAttribute('target');
    }

    expect(screen.getByTestId('for-schools-phone-cta')).toHaveAttribute(
      'href',
      SCHOOL_CONTACT.phoneHref
    );
  });

  it('exposes the anchors its own nav links target', async () => {
    const { container } = await render(<ForSchools />);

    for (const id of Object.values(SCHOOL_ANCHORS)) {
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    }
  });
});
