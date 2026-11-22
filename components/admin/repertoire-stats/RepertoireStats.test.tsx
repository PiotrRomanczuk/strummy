import { screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderServerTree } from '@/lib/testing/intl-test-utils';
import type { CollectionQuality } from '@/lib/data-quality/quality.types';
import type { QualityReportInput } from '@/lib/repertoire-stats/quality-list';
import { makeSong, TRACK_STATS } from '@/lib/repertoire-stats/repertoire-song.fixture';
import type { SongDetail } from '@/lib/repertoire-stats/song-progressions';

import { RepertoireStats } from './RepertoireStats';
import { csvHref, parseStatsParams, statsHref, toggleId } from './repertoire-stats.helpers';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));
jest.mock('@/app/actions/song-fill', () => ({ fillSongFromRecording: jest.fn() }));

const SONGS = [
  makeSong('lw', {
    song: {
      title: 'Little Wing',
      author: 'Jimi Hendrix',
      key: 'Em',
      tempo: 70,
      chords: 'Em, G, Am, Bm, Bb, C, D',
    },
    analysis: {
      key: 'F#',
      bpm: 70,
      chords: ['F#', 'Ebm', 'Abm', 'C#', 'Bbm', 'B', 'E'],
      progressions: [
        { roman: ['I', 'I', 'ii', 'ii'], chords: ['F#', 'F#', 'Abm', 'Abm'], bars: 28 },
      ],
    },
    stats: TRACK_STATS,
    students: 6,
  }),
  makeSong('z', {
    song: { title: 'Zombie', author: 'The Cranberries', tempo: 120 },
    analysis: { bpm: 84 },
    students: 2,
  }),
  makeSong('j', {
    song: { title: 'Jolka', author: 'Budka Suflera', youtube_url: null },
    analysis: null,
  }),
];

const QUALITY: QualityReportInput = {
  quality: {
    total: 3,
    averageScore: 81,
    bands: { good: 1, fair: 2, poor: 0 },
    records: [
      {
        id: 'z',
        score: 70,
        band: 'fair',
        failedRuleIds: ['song.tempo-recording'],
        hasCriticalFailure: false,
      },
      { id: 'j', score: 60, band: 'fair', failedRuleIds: ['song.key'], hasCriticalFailure: false },
      { id: 'lw', score: 95, band: 'good', failedRuleIds: [], hasCriticalFailure: false },
    ],
    fixQueue: [
      {
        ruleId: 'song.tempo-recording',
        dimension: 'consistency',
        weight: 2,
        isCritical: false,
        failing: 1,
        applicable: 2,
        impact: 2,
      },
      {
        ruleId: 'song.key',
        dimension: 'completeness',
        weight: 2,
        isCritical: false,
        failing: 1,
        applicable: 3,
        impact: 2,
      },
    ],
  } as CollectionQuality,
  suggestions: new Map([['j', [{ field: 'key' as const, value: 'Am' as const }]]]),
};

const render = (query: Record<string, string>, detail: SongDetail | null = null) =>
  renderServerTree(
    <RepertoireStats
      songs={SONGS}
      params={parseStatsParams(query)}
      detail={detail}
      quality={QUALITY}
    />
  );

describe('repertoire-stats helpers', () => {
  it('reads the URL state, keeps defaults out of links and caps lists', () => {
    const params = parseStatsParams({
      view: 'nope',
      compare: 'a,b,c,d',
      sort: 'title',
      dir: 'asc',
    });
    expect(params).toMatchObject({
      view: 'overview',
      compare: ['a', 'b', 'c'],
      sort: 'title',
      isAscending: true,
    });
    expect(statsHref(parseStatsParams({}))).toBe('/dashboard/admin/repertoire-stats');
    expect(statsHref(params, { view: 'songs', compare: [] })).toBe(
      '/dashboard/admin/repertoire-stats?view=songs&sort=title&dir=asc'
    );
    expect(csvHref(parseStatsParams({ view: 'mismatches', field: 'key' }))).toBe(
      '/api/admin/repertoire-stats/csv?view=mismatches&field=key'
    );
    expect(toggleId(['a', 'b', 'c'], 'd', 3)).toEqual(['b', 'c', 'd']);
    expect(toggleId(['a', 'b'], 'a', 3)).toEqual(['b']);
  });
});

describe('RepertoireStats', () => {
  it('shows coverage as steps and the songs missing data, most students first', async () => {
    await render({});
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('2 of 3 songs miss something.')).toBeInTheDocument();
    expect(screen.getByText('No recording').closest('section')).toHaveTextContent('Jolka');
    const waiting = screen
      .getByText('Waiting for a transcription')
      .closest('section') as HTMLElement;
    expect(within(waiting).getByText('Zombie')).toBeInTheDocument();
  });

  it('scores the data quality with a fix queue, and offers what the recording can fill in', async () => {
    await render({ view: 'quality' });
    const queue = screen.getByRole('list', { name: 'Fix queue' });
    expect(within(queue).getByText('Tempo disagrees with the recording')).toBeInTheDocument();
    expect(screen.getByText('Fill from the recording')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enter key A minor' })).toBeInTheDocument();
    expect(screen.getByText('2 of 2 songs')).toBeInTheDocument();
  });

  it('narrows the songs to one rule', async () => {
    await render({ view: 'quality', rule: 'song.key' });
    expect(screen.getByText('Songs: No key')).toBeInTheDocument();
    expect(screen.getByText('1 of 1 songs')).toBeInTheDocument();
  });

  it('puts errors to fix apart from disagreements a tuned-down guitar explains', async () => {
    await render({ view: 'mismatches' });
    expect(screen.getByText('Different tempo (−30%)')).toBeInTheDocument();
    expect(screen.getAllByText('Tuned down a half step').length).toBeGreaterThan(0);
    expect(screen.getByText('0% → 86% shifted −1 semitones')).toBeInTheDocument();
  });

  it('lists the songs with Strummy beside the recording and compares the chosen ones', async () => {
    await render({ view: 'songs', compare: 'lw,z' });
    expect(
      screen.getByText(
        '3 of 3 songs · Str. = Strummy, Rec. = recording, Sug. = capo suggested by the recording'
      )
    ).toBeInTheDocument();
    const comparison = screen.getByText('Comparison').closest('section') as HTMLElement;
    expect(within(comparison).getByText('E3 – A4')).toBeInTheDocument();
    expect(within(comparison).getAllByText('no transcription').length).toBeGreaterThan(0);
  });

  it('places a song against the repertoire: points and counts for few songs, no percentile for keys', async () => {
    await render({ view: 'context', song: 'lw' });
    expect(screen.getByText('The only song in this key.')).toBeInTheDocument();
    expect(screen.getAllByText('Only 1 song with a transcription').length).toBeGreaterThan(0);
    expect(screen.getByText('The slowest in the repertoire.')).toBeInTheDocument();
  });

  it('ranks progressions and compares a song with the recording through the tuning', async () => {
    await render(
      { view: 'progressions', song: 'lw' },
      { sheet: 'G Am\nwell she is walking', sections: [] }
    );
    expect(screen.getByText('Progression ranking')).toBeInTheDocument();
    expect(screen.getByText('Matches')).toBeInTheDocument();
    expect(screen.getByText('28 bars')).toBeInTheDocument();
  });

  it('profiles the tracks of the transcribed songs', async () => {
    await render({ view: 'arrangement' });
    expect(screen.getByText('Wokal')).toBeInTheDocument();
    expect(screen.getAllByText('does not play').length).toBeGreaterThan(0);
  });
});
