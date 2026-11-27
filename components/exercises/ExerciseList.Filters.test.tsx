import { screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderWithIntl } from '@/lib/testing/intl-test-utils';
import type { SongExercise } from '@/schemas/SongExerciseSchema';

import { ExerciseList } from './ExerciseList';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock('@/app/actions/song-exercises', () => ({ deleteSongExercise: jest.fn() }));

const SONG = '62a9c235-aed2-4912-a78b-0f079079ac92';
const exercise: SongExercise = {
  id: 'e1',
  songId: SONG,
  songTitle: 'Come Together',
  songAuthor: 'The Beatles',
  partN: 3,
  name: 'Main riff',
  kind: 'riff',
  tempoPercent: 60,
  source: 'recording',
  note: null,
  createdAt: '2026-11-26T10:00:00Z',
};
const songs = [
  { id: SONG, title: 'Come Together' },
  { id: '11111111-1111-4111-8111-111111111111', title: null },
];

describe('ExerciseList filters and pages', () => {
  it('shows the filter as a GET form with the current values', () => {
    renderWithIntl(
      <ExerciseList
        exercises={[exercise]}
        total={1}
        params={{ kind: 'riff', song: SONG, q: 'intro', page: 1 }}
        songs={songs}
      />
    );
    const form = screen.getByRole('search', { name: 'Filter exercises' });
    expect(form).toHaveAttribute('method', 'get');
    expect(form).toHaveAttribute('action', '/dashboard/exercises');
    expect(within(form).getByLabelText('Name')).toHaveValue('intro');
    expect(within(form).getByLabelText('Kind')).toHaveValue('riff');
    expect(within(form).getByLabelText('Song')).toHaveValue(SONG);
    expect(within(form).getByRole('option', { name: 'Untitled song' })).toBeInTheDocument();
    expect(within(form).getByRole('link', { name: 'Clear filters' })).toHaveAttribute(
      'href',
      '/dashboard/exercises'
    );
  });

  it('says nothing matches, rather than how to add the first exercise, when a filter empties the list', () => {
    renderWithIntl(
      <ExerciseList exercises={[]} total={0} params={{ kind: 'strum', page: 1 }} songs={songs} />
    );
    expect(screen.getByText('No exercise matches this filter')).toBeInTheDocument();
    expect(screen.queryByText('No exercises yet')).not.toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
  });

  it('counts every match, not just this page, and pages with the filter kept', () => {
    renderWithIntl(
      <ExerciseList
        exercises={[exercise]}
        total={261}
        params={{ kind: 'riff', page: 2 }}
        songs={songs}
      />
    );
    expect(screen.getByText('261 exercises')).toBeInTheDocument();
    const pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(pages).toHaveTextContent('Page 2 of 11');
    expect(within(pages).getByRole('link', { name: 'Previous' })).toHaveAttribute(
      'href',
      '/dashboard/exercises?kind=riff'
    );
    expect(within(pages).getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/dashboard/exercises?kind=riff&page=3'
    );
  });

  it('has no pager when everything fits on one page', () => {
    renderWithIntl(
      <ExerciseList exercises={[exercise]} total={25} params={{ page: 1 }} songs={songs} />
    );
    expect(screen.queryByRole('navigation', { name: 'Pages' })).not.toBeInTheDocument();
  });
});
