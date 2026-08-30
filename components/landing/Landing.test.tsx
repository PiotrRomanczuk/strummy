/**
 * Shell tests for the landing page composition — the signed-out
 * marketing page behind `/`. Covers: hero headline + CTA wiring (sign-up /
 * sign-in), section anchors the nav points at, honest-numbers strip, and the
 * footer's external links carrying rel="noopener".
 */
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderServerTree as render } from '@/lib/testing/intl-test-utils';
import { Landing } from './Landing';

describe('Landing', () => {
  it('renders the hero headline and beta badge', async () => {
    await render(<Landing />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Never wonder/);
    expect(screen.getAllByText('Public beta').length).toBeGreaterThan(0);
  });

  it('offers only the demo and the interest form — never self-service sign-up', async () => {
    await render(<Landing />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));

    // Registration is closed during the beta. A /sign-up link here would send
    // a visitor to a redirect and, worse, promise something the product no
    // longer does — this page sells the demo and the form, nothing else.
    expect(hrefs).not.toContain('/sign-up');

    expect(hrefs.filter((h) => h === '/sign-in?demo=true').length).toBeGreaterThanOrEqual(2);
    expect(hrefs.filter((h) => h === '/for-teachers').length).toBeGreaterThanOrEqual(2);

    // Existing teachers and their students still need a way in.
    expect(hrefs).toContain('/sign-in');
  });

  it('exposes the section anchors the nav links target', async () => {
    const { container } = await render(<Landing />);
    for (const id of ['features', 'how-it-works', 'for-teachers']) {
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it('renders all four feature rows and the metrics strip', async () => {
    await render(<Landing />);
    expect(screen.getByText('Every student, their whole journey.')).toBeInTheDocument();
    expect(screen.getByText('Schedule it. Run it. Move on.')).toBeInTheDocument();
    expect(screen.getByText('Hundreds of songs, tabs already found.')).toBeInTheDocument();
    expect(screen.getByText('A fretboard that teaches theory.')).toBeInTheDocument();
    expect(screen.getByText('releases shipped')).toBeInTheDocument();
  });

  it('marks external links with rel="noopener noreferrer"', async () => {
    await render(<Landing />);
    const external = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href')?.startsWith('http'));
    expect(external.length).toBeGreaterThan(0);
    for (const a of external) {
      expect(a).toHaveAttribute('rel', 'noopener noreferrer');
      expect(a).toHaveAttribute('target', '_blank');
    }
  });
});
