import { fireEvent, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderServerTree } from '@/lib/testing/intl-test-utils';
import { toRepertoireSong } from '@/lib/repertoire-stats/repertoire-song';

import { RepertoireStats } from './RepertoireStats';
import { parseStatsParams, statsHref, toggleCompare } from './repertoire-stats.helpers';

const stats = {
  Bas: { notes: 400, low: 30, high: 52, median: 40, per_bar: 3.1, active_share: 0.9 },
  Wokal: { notes: 300, low: 52, high: 69, median: 60, per_bar: 2.3, active_share: 0.6 },
};

const SONGS = [
  toRepertoireSong(
    {
      id: 'wonderwall',
      title: 'Wonderwall',
      author: 'Oasis',
      category: 'Rock',
      tempo: 87,
      key: 'Em',
      capo_fret: 2,
      duration_ms: 258_000,
      chords: 'Em, G, D, A',
      youtube_url: 'https://youtu.be/bx1Bh8ZvH84',
    },
    {
      song_id: 'wonderwall',
      bpm: 87.2,
      beats_per_bar: 4,
      key: 'F#m',
      source_duration_ms: 259_000,
      duration_matches: true,
      chords: ['F#m', 'A', 'E', 'B'],
    },
    { song_id: 'wonderwall', note_count: 700, stats }
  ),
  toRepertoireSong(
    {
      id: 'zombie',
      title: 'Zombie',
      author: 'The Cranberries',
      category: 'Rock',
      tempo: 168,
      key: 'Em',
      capo_fret: 0,
      duration_ms: 306_000,
      chords: 'Em, C, G, D',
      youtube_url: null,
    },
    {
      song_id: 'zombie',
      bpm: 84,
      beats_per_bar: 4,
      key: 'Em',
      source_duration_ms: 306_000,
      duration_matches: true,
      chords: ['Em', 'C', 'G', 'D'],
    },
    undefined
  ),
];

const render = (query: Record<string, string>) =>
  renderServerTree(<RepertoireStats songs={SONGS} params={parseStatsParams(query)} />);

describe('repertoire-stats helpers', () => {
  it('reads the URL state and builds links back to it', () => {
    expect(parseStatsParams({ view: 'nope', compare: 'a,b,c,d' })).toEqual({
      view: 'coverage',
      song: null,
      compare: ['a', 'b', 'c'],
    });
    expect(statsHref({ view: 'songs', song: null, compare: ['a', 'b'] })).toBe(
      '/dashboard/admin/repertoire-stats?view=songs&compare=a%2Cb'
    );
    expect(toggleCompare(['a', 'b', 'c'], 'd')).toEqual(['b', 'c', 'd']);
    expect(toggleCompare(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('RepertoireStats', () => {
  it('shows the coverage tiles and what each song lacks', async () => {
    await render({});
    expect(screen.getByRole('link', { name: 'Data coverage' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByText('With a transcription').nextSibling).toHaveTextContent('1');
    const missing = screen.getByText('Songs missing data (1)').nextElementSibling as HTMLElement;
    expect(within(missing).getByText('Zombie')).toBeInTheDocument();
    expect(within(missing).getByText('no recording link')).toBeInTheDocument();
    expect(within(missing).getByText('no transcription')).toBeInTheDocument();
  });

  it('lists the songs, filters them and compares the chosen ones side by side', async () => {
    await render({ view: 'songs', compare: 'wonderwall,zombie' });
    expect(screen.getByText('Side by side')).toBeInTheDocument();
    expect(screen.getAllByText('E3–A4')).toHaveLength(2); // Wonderwall's vocal range: compare panel + table
    fireEvent.change(screen.getByLabelText('Filter by title or artist'), {
      target: { value: 'cranb' },
    });
    expect(screen.getByText('1 of 2 songs')).toBeInTheDocument();
  });

  it('lists only the songs whose entered values disagree with the recording', async () => {
    await render({ view: 'mismatches' });
    expect(
      screen.getByText('1 of 2 measured songs disagree with their recording.')
    ).toBeInTheDocument();
    expect(screen.getByText('168 → 84')).toBeInTheDocument();
    expect(screen.getByText('(half or double)')).toBeInTheDocument();
  });

  it('marks the chosen song in every distribution with its percentile', async () => {
    await render({ view: 'distributions', song: 'wonderwall' });
    expect(
      screen.getByText('Wonderwall: 87 BPM — higher than 100% of the repertoire')
    ).toBeInTheDocument();
    expect(screen.getAllByText('this song').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('img', { name: 'Highest vocal note: distribution over 1 songs' })
    ).toBeInTheDocument();
  });
});
