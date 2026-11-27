import { fireEvent, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderServerTree } from '@/lib/testing/intl-test-utils';
import { getSongMap, type SongMapView } from '@/lib/services/song-segments-queries';
import type { SongPart } from '@/schemas/SongSegmentsSchema';

import { SongMapCard } from './SongMapCard';

jest.mock('@/lib/services/song-segments-queries', () => ({ getSongMap: jest.fn() }));

const mockedGet = jest.mocked(getSongMap);

const part = (n: number, overrides: Partial<SongPart> = {}): SongPart => ({
  n,
  label: 'A',
  name: 'verse',
  repeat_of: null,
  first_bar: 1,
  bars: 8,
  start_s: 0,
  end_s: 16,
  bpm: 88.2,
  vocals: true,
  chords: ['Em', 'G', 'D', 'A', 'Em', 'G', 'D', 'A'],
  roman: ['i', 'bIII', 'bVII', 'IV', 'i', 'bIII', 'bVII', 'IV'],
  loop: ['i', 'bIII', 'bVII', 'IV'],
  bass: {
    pattern: 'X.......X.......',
    notes_per_bar: 2,
    lowest: 'E2',
    highest: 'B2',
    riff: [
      { slot: 0, sixteenths: 8, note: 'E2', degree: '1' },
      { slot: 8, sixteenths: 8, note: 'B2', degree: '5' },
    ],
    riff_share: 0.82,
  },
  drums: {
    patterns: {
      Stopa: 'X.......X.......',
      Werbel: '....X.......X...',
      'Hi-hat': 'X.X.X.X.X.X.X.X.',
    },
    kick: 'one_and_three',
    snare: 'backbeat',
    cymbal: 'Hi-hat eighths',
    fills: [],
  },
  levels: {},
  ...overrides,
});

const VIEW: SongMapView = {
  recordingUrl: 'https://www.youtube.com/watch?v=Y7C21yNsw2g',
  analysedOn: '2026-11-17',
  songKey: 'E minor',
  bpm: 88.2,
  feltBpm: null,
  beatsPerBar: 4,
  parts: [
    part(1, {
      name: 'intro',
      bars: 4,
      vocals: false,
      bass: null,
      drums: null,
      loop: ['i', 'bIII', 'bVII', 'IV'],
      chords: ['Em', 'G', 'D', 'A'],
      roman: ['i', 'bIII', 'bVII', 'IV'],
    }),
    part(2),
    part(3, { name: 'chorus', label: 'B', bass: { ...part(3).bass!, riff_share: 0.4 } }),
    part(4, { repeat_of: 2 }),
  ],
};

describe('SongMapCard', () => {
  beforeEach(() => mockedGet.mockReset());

  it('shows the form as a strip and the first part without drums or bass', async () => {
    mockedGet.mockResolvedValue(VIEW);
    await renderServerTree(<SongMapCard songId="song-1" />);

    expect(mockedGet).toHaveBeenCalledWith('song-1');
    expect(screen.getByText('Parts, chords and groove')).toBeInTheDocument();
    expect(screen.getByText('88 BPM · E minor · 4/4 · 4 parts')).toBeInTheDocument();
    const strip = screen.getByRole('group', { name: 'Parts of the song' });
    expect(within(strip).getAllByRole('button')).toHaveLength(4);
    expect(within(strip).getByRole('button', { name: '1. Intro, 4 bars' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByText('4 bars · 88 BPM · no vocals')).toBeInTheDocument(); // played once: no loop
    expect(screen.getByText('No drums in this part.')).toBeInTheDocument();
    expect(screen.getByText('No bass in this part.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Analysed recording (2026-11-17)' })).toHaveAttribute(
      'href',
      VIEW.recordingUrl
    );
  });

  it('shows the loop, the groove and the named bass riff of a picked part', async () => {
    mockedGet.mockResolvedValue(VIEW);
    await renderServerTree(<SongMapCard songId="song-1" />);
    fireEvent.click(screen.getByRole('button', { name: '2. Verse, 8 bars' }));

    expect(screen.getByText('8 bars · 88 BPM · loop of 4 bars × 2 · sung')).toBeInTheDocument();
    const chords = within(screen.getByRole('region', { name: 'Chords' })).getAllByRole('listitem');
    expect(chords.map((item) => item.textContent)).toEqual(['Emi', 'GbIII', 'DbVII', 'AIV']);
    expect(screen.getByRole('img', { name: /^Kick: / })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /^Snare: / })).toBeInTheDocument();
    expect(
      screen.getByText('kick on 1 and 3 · snare on 2 and 4 · Hi-hat in eighths')
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Bass: E2 B2' })).toBeInTheDocument();
    expect(
      screen.getByText('An average bar of this part plays 82% of this riff.')
    ).toBeInTheDocument();
  });

  it('keeps only the rhythm of a weak riff and says which part a repeat repeats', async () => {
    mockedGet.mockResolvedValue(VIEW);
    await renderServerTree(<SongMapCard songId="song-1" />);

    fireEvent.click(screen.getByRole('button', { name: '3. Chorus, 8 bars' }));
    expect(screen.getByRole('img', { name: 'Bass: x x' })).toBeInTheDocument();
    expect(screen.getByText(/^Only the rhythm: an average bar plays 40%/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '4. Verse, 8 bars' }));
    expect(screen.getByText(/repeats part 2$/)).toBeInTheDocument();
  });

  it('says the felt tempo of a half-time song and names lettered parts by their letter', async () => {
    mockedGet.mockResolvedValue({
      ...VIEW,
      feltBpm: 55.6,
      bpm: 111.1,
      parts: [part(1, { name: null, label: 'C' })],
    });
    await renderServerTree(<SongMapCard songId="song-1" />);
    expect(screen.getByText('111 BPM (felt at 56) · E minor · 4/4 · 1 part')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1. C, 8 bars' })).toBeInTheDocument();
  });

  it('shows back-to-back repeats as one chip and steps through each repeat', async () => {
    mockedGet.mockResolvedValue({
      ...VIEW,
      parts: [
        part(1, { name: 'intro', bars: 4 }),
        part(2, { name: 'intro', bars: 4, chords: ['Am', 'G', 'D', 'A'] }),
        part(3, { name: 'intro', bars: 2 }),
        part(4),
      ],
    });
    await renderServerTree(<SongMapCard songId="song-1" />);

    const strip = screen.getByRole('group', { name: 'Parts of the song' });
    expect(within(strip).getAllByRole('button')).toHaveLength(2);
    const intro = within(strip).getByRole('button', { name: 'Intro ×3, parts 1–3, 10 bars' });
    expect(intro).toHaveTextContent('Intro×3');
    expect(intro).toHaveAttribute('aria-pressed', 'true');

    const repeats = screen.getByRole('group', { name: 'Repeats of Intro' });
    expect(within(repeats).getAllByRole('button')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Intro 2 of 3 (part 2, 4 bars)' }));
    expect(screen.getByText('2. Intro')).toBeInTheDocument();
    const chords = within(screen.getByRole('region', { name: 'Chords' })).getAllByRole('listitem');
    expect(chords[0]).toHaveTextContent('Am');
    expect(intro).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(strip).getByRole('button', { name: '4. Verse, 8 bars' }));
    expect(screen.queryByRole('group', { name: /^Repeats of/ })).not.toBeInTheDocument();
    expect(screen.getByText('4. Verse')).toBeInTheDocument();
  });

  it('renders nothing without segments', async () => {
    mockedGet.mockResolvedValue(null);
    const { container } = await renderServerTree(<SongMapCard songId="song-1" />);
    expect(container).toBeEmptyDOMElement();
  });
});
