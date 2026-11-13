import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderServerTree } from '@/lib/testing/intl-test-utils';

import { LabCard } from './SongSidebar.LabCard';

describe('LabCard', () => {
  it('says how many sources and tabs the hub has and links to the song in the Lab', async () => {
    await renderServerTree(
      LabCard({
        entity: {
          id: 'e0123456789ab',
          artist: 'Oasis',
          title: 'Wonderwall',
          search: 'oasis wonderwall',
          strummy_song_id: 's1',
          spotify_id: null,
          youtube_id: null,
          sources: { 'strummy-songs': 1, 'gp-songs': 1, 'billboard-hot100': 1 },
          tabs: 9,
        },
      })
    );
    expect(screen.getByText('In 3 sources')).toBeInTheDocument();
    expect(screen.getByText('9 Guitar Pro tabs')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open in the Lab' })).toHaveAttribute(
      'href',
      '/dashboard/admin/lab/songs/e0123456789ab'
    );
  });
});
