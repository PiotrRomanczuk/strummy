/**
 * Shell tests for the editorial landing page composition — the signed-out
 * marketing page behind `/`. Covers: hero headline + CTA wiring (sign-up /
 * sign-in), section anchors the nav points at, honest-numbers strip, and the
 * footer's external links carrying rel="noopener".
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { LandingEditorial } from './LandingEditorial';

describe('LandingEditorial', () => {
  it('renders the hero headline and beta badge', () => {
    render(<LandingEditorial />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Never wonder/);
    expect(screen.getAllByText('Public beta').length).toBeGreaterThan(0);
  });

  it('wires primary CTAs to /sign-up and sign-in links to /sign-in', () => {
    render(<LandingEditorial />);
    const signUps = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href') === '/sign-up');
    expect(signUps.length).toBeGreaterThanOrEqual(3);
    const signIns = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href') === '/sign-in');
    expect(signIns.length).toBeGreaterThanOrEqual(2);
  });

  it('exposes the section anchors the nav links target', () => {
    const { container } = render(<LandingEditorial />);
    for (const id of ['features', 'how-it-works', 'for-teachers']) {
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it('renders all four feature rows and the metrics strip', () => {
    render(<LandingEditorial />);
    expect(screen.getByText('Every student, their whole journey.')).toBeInTheDocument();
    expect(screen.getByText('Schedule it. Run it. Move on.')).toBeInTheDocument();
    expect(screen.getByText('Hundreds of songs, tabs already found.')).toBeInTheDocument();
    expect(screen.getByText('A fretboard that plays back.')).toBeInTheDocument();
    expect(screen.getByText('releases shipped')).toBeInTheDocument();
  });

  it('marks external links with rel="noopener noreferrer"', () => {
    render(<LandingEditorial />);
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
