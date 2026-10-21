import { screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderServerTree } from '@/lib/testing/intl-test-utils';
import { scoreCollection } from '@/lib/data-quality/score';
import { songQualityProfile, type SongQualityRecord } from '@/lib/data-quality/song-profile';

import { DataQualityReport } from './DataQualityReport';

const base: SongQualityRecord = {
  id: 'ok',
  title: 'Wonderwall',
  author: 'Oasis',
  level: 'beginner',
  key: 'F#m',
  chords: 'Em7 G',
  lyrics_with_chords: null,
  spotify_link_url: 'https://open.spotify.com/track/abc',
  youtube_url: null,
  ultimate_guitar_link: 'https://tabs.ultimate-guitar.com/x',
  tempo: 87,
  strumming_pattern: 'D DU',
  category: 'Britpop',
  is_draft: false,
  created_at: '2026-01-01T00:00:00Z',
};

const SONGS: SongQualityRecord[] = [
  base,
  { ...base, id: 'no-key', title: 'Hey Jude', author: 'The Beatles', key: null },
  { ...base, id: 'junk', title: 'RLS fixture song', author: null },
];

const quality = scoreCollection(songQualityProfile, SONGS);
const byId = new Map(SONGS.map((s) => [s.id, s]));
const toRow = (id: string) => {
  const song = byId.get(id);
  return song ? { title: song.title, subtitle: song.author, editHref: `/edit/${id}` } : null;
};

describe('DataQualityReport', () => {
  it('ranks the critical rule first and lists only records with problems', async () => {
    await renderServerTree(
      <DataQualityReport quality={quality} activeRuleId={null} toRow={toRow} />
    );

    const queue = screen.getByRole('list', { name: 'Fix queue' });
    const firstRule = within(queue).getAllByRole('link')[0];
    expect(firstRule).toHaveTextContent('Title missing or placeholder');
    expect(firstRule).toHaveAttribute('href', '/dashboard/admin/data-quality?rule=song.title');

    expect(screen.getByText('RLS fixture song')).toBeInTheDocument();
    expect(screen.getByText('Hey Jude')).toBeInTheDocument();
    expect(screen.queryByText('Wonderwall')).not.toBeInTheDocument();
  });

  it('filters the records by the selected rule and offers a way back', async () => {
    await renderServerTree(
      <DataQualityReport quality={quality} activeRuleId="song.key" toRow={toRow} />
    );

    expect(screen.getByText('Breaking: No key')).toBeInTheDocument();
    expect(screen.getByText('Hey Jude')).toBeInTheDocument();
    expect(screen.queryByText('RLS fixture song')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Show all' })).toHaveAttribute(
      'href',
      '/dashboard/admin/data-quality'
    );
    expect(screen.getAllByRole('link', { name: 'Edit' })[0]).toHaveAttribute(
      'href',
      '/edit/no-key'
    );
  });

  it('ignores an unknown rule id in the URL', async () => {
    await renderServerTree(
      <DataQualityReport quality={quality} activeRuleId="song.nope" toRow={toRow} />
    );
    expect(screen.getByText('Lowest scores first')).toBeInTheDocument();
  });
});
