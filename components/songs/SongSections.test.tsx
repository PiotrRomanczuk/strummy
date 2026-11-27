import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderServerTree } from '@/lib/testing/intl-test-utils';
import { getSongMap, type SongMapView } from '@/lib/services/song-segments-queries';
import type { SongSection } from '@/components/songs/types';

import { SongSections } from './SongSections';

jest.mock('@/lib/services/song-segments-queries', () => ({ getSongMap: jest.fn() }));
jest.mock('./EditSongSectionModal', () => ({ EditSongSectionModal: () => null }));

const mockedGet = jest.mocked(getSongMap);
const MAP = { parts: [] } as unknown as SongMapView;
const SECTION = {
  id: 'sec-1',
  section_type: 'verse',
  section_number: 1,
  chords: ['Bm', 'F#'],
  lyrics: null,
} as unknown as SongSection;

describe('SongSections', () => {
  beforeEach(() => mockedGet.mockReset());

  it('says there are no sections when the song has no map either', async () => {
    mockedGet.mockResolvedValue(null);
    await renderServerTree(<SongSections songId="s" sections={[]} canEdit />);
    expect(screen.getByText('No sections found.')).toBeInTheDocument();
  });

  it('keeps only an "Add section" button under the map for an editor', async () => {
    mockedGet.mockResolvedValue(MAP);
    await renderServerTree(<SongSections songId="s" sections={[]} canEdit />);
    expect(screen.queryByText('No sections found.')).not.toBeInTheDocument();
    expect(screen.getByTestId('add-section-button')).toBeInTheDocument();
  });

  it('shows nothing under the map to someone who cannot edit', async () => {
    mockedGet.mockResolvedValue(MAP);
    const { container } = await renderServerTree(
      <SongSections songId="s" sections={[]} canEdit={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows written sections whether or not there is a map', async () => {
    mockedGet.mockResolvedValue(MAP);
    await renderServerTree(<SongSections songId="s" sections={[SECTION]} canEdit />);
    expect(screen.getByTestId('song-section-sec-1')).toHaveTextContent('verse 1');
    expect(screen.getByText('F#')).toBeInTheDocument();
    expect(mockedGet).not.toHaveBeenCalled();
  });
});
