import { fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderWithIntl } from '@/lib/testing/intl-test-utils';
import type { SongsListFilters } from '@/lib/services/songs-list-queries';

import { SongsListFiltersForm } from './SongsList.FiltersForm';
import { buildHref } from './songs-list.helpers';

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: jest.fn() }),
}));

const FILTERS: SongsListFilters = { sort: 'newest', page: 1 };

describe('technique filter', () => {
  beforeEach(() => push.mockReset());

  it('offers "any technique" and the ten main techniques', () => {
    renderWithIntl(<SongsListFiltersForm filters={FILTERS} />);
    const select = screen.getByLabelText('Filter by technique') as HTMLSelectElement;
    expect(select.options).toHaveLength(11);
    expect(select.options[0]).toHaveTextContent('Any technique');
    expect(screen.getByRole('option', { name: 'Palm mute' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /stroke/i })).not.toBeInTheDocument();
  });

  it('pushes the picked technique and keeps the other filters', () => {
    renderWithIntl(<SongsListFiltersForm filters={{ ...FILTERS, key: 'Am', page: 3 }} />);
    fireEvent.change(screen.getByLabelText('Filter by technique'), {
      target: { value: 'slide' },
    });
    expect(push).toHaveBeenCalledWith('/dashboard/songs?key=Am&technique=slide', {
      scroll: false,
    });
  });

  it('drops the technique when "any technique" is picked', () => {
    renderWithIntl(<SongsListFiltersForm filters={{ ...FILTERS, technique: 'slide' }} />);
    fireEvent.change(screen.getByLabelText('Filter by technique'), { target: { value: '' } });
    expect(push).toHaveBeenCalledWith('/dashboard/songs', { scroll: false });
  });
});

describe('buildHref', () => {
  it('carries the technique and resets the page', () => {
    expect(buildHref({ level: 'beginner' }, { ...FILTERS, technique: 'bend', page: 4 })).toBe(
      '/dashboard/songs?level=beginner&technique=bend'
    );
  });
});
