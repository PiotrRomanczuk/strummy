import { fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { deleteSongExercise } from '@/app/actions/song-exercises';
import { renderWithIntl } from '@/lib/testing/intl-test-utils';
import type { SongExercise } from '@/schemas/SongExerciseSchema';

import { ExerciseList } from './ExerciseList';

const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
jest.mock('@/app/actions/song-exercises', () => ({ deleteSongExercise: jest.fn() }));

const SONG = '62a9c235-aed2-4912-a78b-0f079079ac92';
const exercise = (change: Partial<SongExercise> = {}): SongExercise => ({
  id: 'e1',
  songId: SONG,
  songTitle: 'Come Together',
  songAuthor: 'The Beatles',
  partN: 3,
  name: 'Main riff',
  kind: 'riff',
  tempoPercent: 60,
  source: 'backing',
  note: 'Keep the wrist loose',
  createdAt: '2026-11-26T10:00:00Z',
  ...change,
});

describe('ExerciseList', () => {
  beforeEach(() => {
    refresh.mockReset();
    jest.mocked(deleteSongExercise).mockReset();
  });

  it('explains how to add the first exercise when the library is empty', () => {
    renderWithIntl(<ExerciseList exercises={[]} />);
    expect(screen.getByText('No exercises yet')).toBeInTheDocument();
    expect(screen.getByText(/press “Save as exercise”/)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('lists an exercise with its song, part, tempo, note and a link into the card on that part', () => {
    renderWithIntl(
      <ExerciseList exercises={[exercise(), exercise({ id: 'e2', name: 'Chords' })]} />
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    const first = screen.getAllByRole('listitem')[0];
    expect(first).toHaveTextContent('Main riff');
    expect(first).toHaveTextContent('Riff');
    expect(first).toHaveTextContent('Come Together · The Beatles');
    expect(first).toHaveTextContent('Part 3 · 60% · backing track');
    expect(first).toHaveTextContent('Keep the wrist loose');
    expect(screen.getAllByRole('link', { name: 'Open in the card' })[0]).toHaveAttribute(
      'href',
      `/dashboard/songs/${SONG}/card?part=3&loop=1&tempo=60&source=backing`
    );
    expect(screen.getByText('2 exercises')).toBeInTheDocument();
  });

  it('deletes after a second click and refreshes the list', async () => {
    jest.mocked(deleteSongExercise).mockResolvedValue({ deleted: true });
    renderWithIntl(<ExerciseList exercises={[exercise()]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete exercise Main riff' }));
    expect(deleteSongExercise).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sure?' }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(deleteSongExercise).toHaveBeenCalledWith('e1');
  });

  it('keeps the row and says so when the delete fails', async () => {
    jest.mocked(deleteSongExercise).mockResolvedValue({ error: 'failed' });
    renderWithIntl(<ExerciseList exercises={[exercise()]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete exercise Main riff' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sure?' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not delete.');
    expect(refresh).not.toHaveBeenCalled();
  });
});
