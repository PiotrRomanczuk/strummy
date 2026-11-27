import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { listExercisesOfSong } from '@/lib/services/song-exercises';
import { renderServerTree } from '@/lib/testing/intl-test-utils';

import { SongExercisesCard } from './SongExercisesCard';

jest.mock('@/lib/services/song-exercises', () => ({ listExercisesOfSong: jest.fn() }));

const SONG = '62a9c235-aed2-4912-a78b-0f079079ac92';
const mockedList = jest.mocked(listExercisesOfSong);

describe('SongExercisesCard', () => {
  beforeEach(() => mockedList.mockReset());

  it('lists the song’s exercises, each opening the card on its part, and links to the filtered library', async () => {
    mockedList.mockResolvedValue([
      {
        id: 'e1',
        songId: SONG,
        songTitle: 'Come Together',
        songAuthor: 'The Beatles',
        partN: 4,
        name: 'Bass riff',
        kind: 'riff',
        tempoPercent: 70,
        source: 'backing',
        note: null,
        createdAt: '2026-11-26T10:00:00Z',
      },
    ]);
    await renderServerTree(<SongExercisesCard songId={SONG} />);

    expect(mockedList).toHaveBeenCalledWith(SONG);
    expect(screen.getByText('Exercises from this song')).toBeInTheDocument();
    expect(screen.getByText('Bass riff')).toBeInTheDocument();
    expect(screen.getByText(/Riff · Part 4 · 70% · backing track/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Open exercise Bass riff in the card' })
    ).toHaveAttribute(
      'href',
      `/dashboard/songs/${SONG}/card?part=4&loop=1&tempo=70&source=backing`
    );
    expect(screen.getByRole('link', { name: 'In the library' })).toHaveAttribute(
      'href',
      `/dashboard/exercises?song=${SONG}`
    );
  });

  it('renders nothing when the song has no exercises', async () => {
    mockedList.mockResolvedValue([]);
    const { container } = await renderServerTree(<SongExercisesCard songId={SONG} />);
    expect(container).toBeEmptyDOMElement();
  });
});
