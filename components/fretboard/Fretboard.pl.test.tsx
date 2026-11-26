/**
 * The in-app fretboard (/dashboard/fretboard) renders the same tree as the
 * public page, so it speaks Polish whenever the app does — this renders it
 * under `pl` the way the dashboard does (no provider of its own).
 */
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useSearchParams } from 'next/navigation';

import { renderPolish } from '@/lib/testing/intl-test-utils';
import { Fretboard } from './Fretboard';

jest.mock('next/navigation', () => ({ useSearchParams: jest.fn() }));

beforeEach(() => {
  (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
});

describe('Fretboard (pl)', () => {
  it('shows the controls and the scale names in Polish', () => {
    renderPolish(<Fretboard />);
    expect(screen.getByText('Narzędzie')).toBeInTheDocument();
    expect(screen.getByText('Tryb')).toBeInTheDocument();
    expect(screen.getByTestId('fb-mode-scale')).toHaveTextContent('Skala');
    expect(screen.getByText('Akord')).toBeInTheDocument();
    expect(screen.getByText('Molowa naturalna')).toBeInTheDocument();
    expect(screen.queryByText('Natural Minor')).not.toBeInTheDocument();
    expect(screen.queryByText('Studio tool')).not.toBeInTheDocument();
  });

  it('keeps ?lang= across the URL sync so the next render stays Polish', () => {
    window.history.replaceState(null, '', '/dashboard/fretboard?lang=pl');
    renderPolish(<Fretboard />);
    expect(window.location.search).toContain('lang=pl');
    expect(window.location.search).toContain('key=A');
  });
});
