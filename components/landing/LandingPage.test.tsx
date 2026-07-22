/**
 * LandingPage — the public marketing page mounted at `/` (app/page.tsx).
 *
 * This composes ~11 real `sections/*` components (Header, Hero, SubBand,
 * LogoCloud, Reality, Capabilities, Efficiency, WorkflowTimeline, Pricing,
 * FAQ, FinalCTA, Footer). Nothing here is mocked away except the pieces that
 * legitimately can't run in jsdom or would hit the network: `next/navigation`
 * (per the project's global next/jest mock in jest.setup.js) and `next/image`
 * (jsdom has no real layout engine, so next/image's built-in loader warnings
 * are irrelevant noise — we still render the real <img> it produces).
 *
 * The goal is to prove the real landing page composes and renders end to
 * end, and that its key conversion surfaces (hero headline, primary CTAs,
 * nav links, footer links) are present with the right hrefs.
 */
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LandingPage } from './LandingPage';

describe('LandingPage', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders the full page without throwing or logging console errors', () => {
    expect(() => render(<LandingPage />)).not.toThrow();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('renders the hero headline as the page h1', () => {
    render(<LandingPage />);

    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'Stop juggling spreadsheets and start teaching',
    });
    expect(heading).toBeInTheDocument();
    expect(
      screen.getByText(/Strummy brings your entire studio into one place/i)
    ).toBeInTheDocument();
  });

  it('renders the hero primary CTAs linking to sign-up and the live demo', () => {
    render(<LandingPage />);

    const heroSection = screen.getByRole('heading', { level: 1 }).closest('section');
    expect(heroSection).not.toBeNull();
    const hero = within(heroSection as HTMLElement);

    expect(hero.getByRole('link', { name: 'Start free' })).toHaveAttribute('href', '/sign-up');
    expect(hero.getByRole('link', { name: 'Try the live demo' })).toHaveAttribute(
      'href',
      '/sign-in?demo=true'
    );
  });

  it('renders the header brand link and nav links with correct hrefs', () => {
    render(<LandingPage />);

    // Scope to the <header> (role="banner") — the footer repeats several of
    // these same labels/hrefs (e.g. "Pricing" -> /#pricing), which would
    // otherwise make an unscoped getByRole ambiguous.
    const header = within(screen.getByRole('banner'));

    expect(header.getByRole('link', { name: 'Strummy' })).toHaveAttribute('href', '/');

    const expectedNavLinks: [string, string][] = [
      ['Features', '/#capabilities'],
      ['Pricing', '/#pricing'],
      ['Teachers', '/#reality'],
      ['Resources', '/#faq'],
    ];
    for (const [label, href] of expectedNavLinks) {
      expect(header.getByRole('link', { name: label })).toHaveAttribute('href', href);
    }
  });

  it('renders header auth links for sign-in and sign-up', () => {
    render(<LandingPage />);

    // Scope to the header — "Sign in" and "Start free" also appear in the
    // footer/hero/final-CTA sections with the same hrefs.
    const header = within(screen.getByRole('banner'));

    expect(header.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
    expect(header.getByRole('link', { name: 'Start free' })).toHaveAttribute('href', '/sign-up');

    // "Start free" also appears elsewhere on the page (hero, final CTA) —
    // confirm every instance points to the same destination.
    const startFreeLinks = screen.getAllByRole('link', { name: 'Start free' });
    expect(startFreeLinks.length).toBeGreaterThanOrEqual(2);
    for (const link of startFreeLinks) {
      expect(link).toHaveAttribute('href', '/sign-up');
    }
  });

  it('renders each major section heading', () => {
    render(<LandingPage />);

    expect(screen.getByRole('heading', { name: 'Your studio, simplified' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: "The spreadsheet life isn't sustainable" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Everything you need to run your studio' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Lesson plans that write themselves' })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your week with Strummy' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pricing' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Questions' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Start teaching, not managing' })
    ).toBeInTheDocument();
  });

  it('renders all three pricing tiers with their CTAs', () => {
    render(<LandingPage />);

    expect(screen.getByText('Starter')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Studio')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Start now' })).toHaveAttribute('href', '/sign-up');
    const tryDemoLinks = screen.getAllByRole('link', { name: 'Try the demo' });
    expect(tryDemoLinks).toHaveLength(2);
    for (const link of tryDemoLinks) {
      expect(link).toHaveAttribute('href', '/sign-in?demo=true');
    }
  });

  it('renders all FAQ questions as accordion triggers', () => {
    render(<LandingPage />);

    expect(
      screen.getByRole('button', { name: /Is my student data private\?/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Can I import my existing notes\?/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Do my students need an account\?/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /What if I only teach a few students\?/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /How do I get help or report a bug\?/i })
    ).toBeInTheDocument();
  });

  it('renders the footer with product/get-started link columns and a GitHub social link', () => {
    render(<LandingPage />);

    const footer = screen.getByRole('contentinfo');
    const footerScope = within(footer);

    expect(footerScope.getByText('Product')).toBeInTheDocument();
    expect(footerScope.getByRole('link', { name: 'How it works' })).toHaveAttribute(
      'href',
      '/#workflow'
    );
    expect(footerScope.getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '/#faq');

    expect(footerScope.getByText('Get started')).toBeInTheDocument();
    expect(footerScope.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/sign-up'
    );

    const githubLinks = footerScope.getAllByRole('link', { name: /github/i });
    expect(githubLinks.length).toBeGreaterThanOrEqual(1);
    for (const link of githubLinks) {
      expect(link).toHaveAttribute('href', 'https://github.com/PiotrRomanczuk/strummy');
    }

    expect(footerScope.getByText(/All rights reserved\./i)).toBeInTheDocument();
  });
});
