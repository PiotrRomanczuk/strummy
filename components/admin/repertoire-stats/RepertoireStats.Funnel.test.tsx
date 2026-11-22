import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderServerTree } from '@/lib/testing/intl-test-utils';
import { coverageOf } from '@/lib/repertoire-stats/coverage';
import { makeSong, TRACK_STATS } from '@/lib/repertoire-stats/repertoire-song.fixture';

import { RepertoireStatsFunnel } from './RepertoireStats.Funnel';

describe('RepertoireStatsFunnel', () => {
  it('never shows a negative waiting count when a transcription has no analysis', async () => {
    const songs = [
      makeSong('a', { analysis: null, stats: TRACK_STATS }),
      makeSong('b', { analysis: null, stats: TRACK_STATS }),
    ];
    await renderServerTree(<RepertoireStatsFunnel coverage={coverageOf(songs)} />);
    expect(screen.getByText('0 waiting')).toBeInTheDocument();
    expect(screen.queryByText(/-\d+ waiting/)).not.toBeInTheDocument();
  });

  it('counts the analysed songs still waiting for a transcription', async () => {
    const songs = [makeSong('a', { stats: TRACK_STATS }), makeSong('b'), makeSong('c')];
    await renderServerTree(<RepertoireStatsFunnel coverage={coverageOf(songs)} />);
    expect(screen.getByText('2 waiting')).toBeInTheDocument();
  });
});
