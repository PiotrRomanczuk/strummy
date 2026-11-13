import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import type { SongChordReview } from '@/schemas/SongChordReviewSchema';

import { getSongChordReview } from '@/lib/services/song-chord-review-queries';

import { SongChordSourcesCard } from './SongChordSourcesCard';

jest.mock('@/lib/services/song-chord-review-queries', () => ({ getSongChordReview: jest.fn() }));

jest.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string, values?: Record<string, string | number>) =>
    values ? `${key} ${Object.values(values).join(' ')}` : key,
}));

// Perfect – Nie płacz Ewka, 2026-11-13 run: the known B/Bm dispute.
const review: SongChordReview = {
  version: 1,
  status: 'conflict',
  reference: 'chord-id',
  sources: ['strummy', 'chord-id', 'analyze', 'chordonomicon'],
  sheet_chords: ['E', 'A', 'F#m', 'D', 'B'],
  heard_chords: ['E', 'A', 'F#m', 'Bm', 'D'],
  main_chords: ['E', 'A', 'F#m', 'Bm', 'D'],
  transpose: 0,
  coverage: 0.962,
  capo_hint: null,
  capo_matches: true,
  differences: [
    {
      kind: 'mode',
      audio: 'Bm',
      audio_as_written: null,
      sheet: 'B',
      share: 0.038,
      first_s: 84.2,
      confirmed: true,
      analyze: 'sheet',
      chordonomicon: 'audio',
    },
  ],
  keys: { analyze: 'E', 'chord-id': 'A', sheet: 'A' },
  key_sources_agree: false,
  sounding_key: null,
};

const renderCard = async (value: SongChordReview | null) => {
  jest.mocked(getSongChordReview).mockResolvedValue(value);
  const view = render(await SongChordSourcesCard({ songId: 'song-1' }));
  expect(getSongChordReview).toHaveBeenCalledWith('song-1');
  return view;
};

describe('SongChordSourcesCard', () => {
  it('shows both chord lists and each difference with when it is heard and who agrees', async () => {
    await renderCard(review);

    expect(screen.getByText('chordSourcesStatus.conflict')).toBeInTheDocument();
    expect(screen.getByText('chordSourcesReference.chord-id')).toBeInTheDocument();
    expect(screen.getByText('E, A, F#m, D, B')).toBeInTheDocument();
    expect(screen.getByText('B → Bm')).toBeInTheDocument();
    const details = screen.getByText(/chordSourcesAt 1:24/);
    expect(details).toHaveTextContent('chordSourcesShare 4');
    expect(details).toHaveTextContent('chordSourcesConfirmed');
    expect(details).toHaveTextContent('chordSourcesVote.analyze chordSourcesSide.sheet');
    expect(details).toHaveTextContent('chordSourcesVote.chordonomicon chordSourcesSide.audio');
    expect(screen.getByRole('link', { name: 'chordSourcesEdit' })).toHaveAttribute(
      'href',
      '/dashboard/songs/song-1/edit'
    );
  });

  it('suggests the capo and the sounding key when the sources back them', async () => {
    await renderCard({
      ...review,
      status: 'agree',
      differences: [],
      transpose: 2,
      capo_hint: 2,
      capo_matches: false,
      key_sources_agree: true,
      sounding_key: { tonic: 'Bb', scale: 'minor' },
    });

    expect(screen.getByText('chordSourcesCapo 2')).toBeInTheDocument();
    expect(screen.getByText('chordSourcesKey Bbm')).toBeInTheDocument();
  });

  it.each([null, { ...review, status: 'no_audio' as const, reference: null }])(
    'renders nothing without a comparison (%#)',
    async (value) => {
      const { container } = await renderCard(value);
      expect(container).toBeEmptyDOMElement();
    }
  );
});
