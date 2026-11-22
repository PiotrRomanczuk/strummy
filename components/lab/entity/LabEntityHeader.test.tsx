import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import type { SongEntity } from '@/lib/private-data/private-data.types';
import { renderServerTree } from '@/lib/testing/intl-test-utils';

import { LabEntityHeader } from './LabEntityHeader';

const base = {
  title: 'Whats Up',
  artist: '4 Non Blondes',
  strummy_song_id: null,
  spotify_id: null,
  youtube_id: null,
} as unknown as SongEntity;

describe('LabEntityHeader', () => {
  it('links every Strummy id the hub joined', async () => {
    await renderServerTree(
      LabEntityHeader({
        entity: { ...base, strummy_song_id: 's1', strummy_song_ids: ['s1', 's2'] },
      })
    );
    expect(screen.getByRole('link', { name: /Strummy.* 1$/ })).toHaveAttribute(
      'href',
      '/dashboard/songs/s1'
    );
    expect(screen.getByRole('link', { name: /Strummy.* 2$/ })).toHaveAttribute(
      'href',
      '/dashboard/songs/s2'
    );
  });

  it('falls back to the single id of an older hub', async () => {
    await renderServerTree(
      LabEntityHeader({
        entity: { ...base, strummy_song_id: 's1', spotify_id: 'sp1', youtube_id: 'yt1' },
      })
    );
    expect(screen.getAllByRole('link', { name: /Strummy/ })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Spotify' })).toHaveAttribute(
      'href',
      'https://open.spotify.com/track/sp1'
    );
    expect(screen.getByRole('link', { name: 'YouTube' })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=yt1'
    );
  });

  it('lists every Spotify and YouTube id when the hub has them', async () => {
    await renderServerTree(
      LabEntityHeader({ entity: { ...base, spotify_ids: ['a', 'b'], youtube_ids: ['x', 'y'] } })
    );
    expect(screen.getAllByRole('link', { name: /^Spotify/ })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: /^YouTube/ })).toHaveLength(2);
  });
});
