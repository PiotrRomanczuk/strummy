import { screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderServerTree } from '@/lib/testing/intl-test-utils';
import { getSongTechniques } from '@/lib/services/song-techniques-queries';

import { SongTechniquesCard } from './SongTechniquesCard';

jest.mock('@/lib/services/song-techniques-queries', () => ({ getSongTechniques: jest.fn() }));

const mockedGet = jest.mocked(getSongTechniques);

describe('SongTechniquesCard', () => {
  beforeEach(() => mockedGet.mockReset());

  it('shows a chip per technique with its strength, and the one-line explanation', async () => {
    mockedGet.mockResolvedValue([
      { key: 'dead_note', count: 541, share: 0.12, strength: 'lot' },
      { key: 'hammer_pull', count: 32, share: 0.007, strength: 'little' },
    ]);
    await renderServerTree(<SongTechniquesCard songId="song-1" />);

    expect(mockedGet).toHaveBeenCalledWith('song-1');
    expect(screen.getByText('Techniques in the song')).toBeInTheDocument();
    const chips = screen.getAllByRole('listitem');
    expect(chips).toHaveLength(2);
    expect(within(chips[0]).getByText('Muted notes')).toBeInTheDocument();
    expect(within(chips[0]).getByText('a lot')).toBeInTheDocument();
    expect(within(chips[1]).getByText('Hammer-ons and pull-offs')).toBeInTheDocument();
    expect(within(chips[1]).getByText('a little')).toBeInTheDocument();
    expect(screen.getByText(/a hint, not a transcription/)).toBeInTheDocument();
  });

  it('renders nothing when the song has no row', async () => {
    mockedGet.mockResolvedValue(null);
    const { container } = await renderServerTree(<SongTechniquesCard songId="song-2" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when no technique passes the rule', async () => {
    mockedGet.mockResolvedValue([]);
    const { container } = await renderServerTree(<SongTechniquesCard songId="song-3" />);
    expect(container).toBeEmptyDOMElement();
  });
});
