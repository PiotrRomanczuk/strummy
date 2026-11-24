import { fireEvent, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderWithIntl } from '@/lib/testing/intl-test-utils';
import { songCardFromRows } from '@/lib/services/song-card-queries';
import type { SongCard } from '@/lib/music-theory/song-card';
import { CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW } from '@/lib/music-theory/song-card.fixture';

import { SongCardView } from './SongCardView';

// The YouTube player loads lazily in the browser only; here it is a stand-in.
jest.mock(
  'next/dynamic',
  () => () =>
    function PlayerStub() {
      return <div data-testid="player" />;
    }
);

const START = { part: null, isLooping: false, rate: 1, source: 'recording' as const };
const REVIEW = { approvedGroups: [], strums: {}, chordEdits: {} };

jest.mock('@/app/dashboard/songs/[id]/card/actions', () => ({
  saveSongCardReview: jest.fn((_song: string, _video: string, _patch: unknown) =>
    Promise.resolve({ error: 'failed' })
  ),
}));

const card = songCardFromRows(CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW) as SongCard;
const parts = () => within(screen.getByRole('group', { name: /parts|części/i }));
const chart = () => within(screen.getByRole('region', { name: /intro|verse|chorus|bars/i }));

describe('SongCardView', () => {
  it('opens on the first part with its bars as a chord chart', () => {
    renderWithIntl(
      <SongCardView
        songId="s1"
        review={REVIEW}
        card={card}
        isTeacher
        start={START}
        linkPath="/card"
      />
    );
    expect(parts().getAllByRole('button')).toHaveLength(3);
    expect(parts().getByRole('button', { name: /intro/i })).toHaveAttribute('aria-pressed', 'true');
    const bars = chart().getAllByRole('button', { name: /^Bar \d+/ });
    expect(bars.map((bar) => bar.getAttribute('aria-label'))).toEqual([
      'Bar 1: Am',
      'Bar 2: F',
      'Bar 3: C',
    ]);
    expect(bars[0]).toHaveAttribute('aria-current', 'true');
  });

  it('moves to a part when it is clicked, with its degrees for the teacher', () => {
    renderWithIntl(
      <SongCardView
        songId="s1"
        review={REVIEW}
        card={card}
        isTeacher
        start={START}
        linkPath="/card"
      />
    );
    fireEvent.click(parts().getByRole('button', { name: /verse/i }));
    const bars = chart().getAllByRole('button', { name: /^Bar \d+/ });
    expect(bars).toHaveLength(5);
    expect(bars[0]).toHaveAttribute('aria-current', 'true');
    expect(bars[0]).toHaveTextContent('I');
  });

  it('marks the clicked bar and writes a mid-bar change as two chords', () => {
    renderWithIntl(
      <SongCardView
        songId="s1"
        review={REVIEW}
        card={card}
        isTeacher={false}
        start={START}
        linkPath={null}
      />
    );
    fireEvent.click(parts().getByRole('button', { name: /chorus/i }));
    const [bar] = chart().getAllByRole('button', { name: /^Bar \d+/ });
    expect(bar).toHaveAccessibleName('Bar 9: F G');
    expect(bar).toHaveAttribute('aria-current', 'true');
    expect(bar).not.toHaveTextContent('IV');
  });

  it('steps through the bars from the timeline with the arrow keys', () => {
    renderWithIntl(
      <SongCardView
        songId="s1"
        review={REVIEW}
        card={card}
        isTeacher
        start={START}
        linkPath="/card"
      />
    );
    const timeline = screen.getByRole('slider');
    fireEvent.keyDown(timeline, { key: 'ArrowRight' });
    fireEvent.keyDown(timeline, { key: 'ArrowRight' });
    expect(timeline).toHaveAttribute('aria-valuetext', expect.stringMatching(/bar 3$/));
  });

  it('pages through the bars when the analysis has no parts', () => {
    renderWithIntl(
      <SongCardView
        songId="s1"
        review={REVIEW}
        card={{ ...card, parts: [] }}
        isTeacher
        start={START}
        linkPath="/card"
      />
    );
    expect(screen.queryByRole('group', { name: /parts/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bars 1–9 of 9' })).toBeInTheDocument();
  });

  it('shows the chord now, the next change and the shapes of the part', () => {
    renderWithIntl(
      <SongCardView
        songId="s1"
        review={REVIEW}
        card={card}
        isTeacher
        start={START}
        linkPath="/card"
      />
    );
    const now = within(screen.getByRole('region', { name: 'Playing now' }));
    expect(now.getAllByText('Am')[0]).toHaveAttribute('aria-live', 'polite');
    expect(now.getByText('Then, in one bar')).toBeInTheDocument();
    const shapes = now.getByRole('list', { name: 'Shapes of this part' });
    expect(within(shapes).getAllByRole('listitem')).toHaveLength(3);
    expect(within(shapes).getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'true');
  });

  it('gives the teacher the bass and drums of the bar, the student only chord and strum', () => {
    const { unmount } = renderWithIntl(
      <SongCardView
        songId="s1"
        review={REVIEW}
        card={card}
        isTeacher
        start={START}
        linkPath="/card"
      />
    );
    fireEvent.click(parts().getByRole('button', { name: /verse/i }));
    const grid = () => within(screen.getByRole('region', { name: /^Bar \d+$/ }));
    const rowLabel = (label: string) => (_: string, el: Element | null) =>
      el?.tagName === 'SPAN' && el.firstChild?.textContent === label;
    expect(grid().getByText(rowLabel('Bass'))).toHaveTextContent('Bass: 1: C');
    expect(grid().getByText('Bass and drums · approximate')).toBeInTheDocument();
    unmount();
    renderWithIntl(
      <SongCardView
        songId="s1"
        review={REVIEW}
        card={card}
        isTeacher={false}
        start={START}
        linkPath={null}
      />
    );
    fireEvent.click(parts().getByRole('button', { name: /verse/i }));
    expect(grid().getByText(rowLabel('Strum'))).toHaveTextContent('Strum: 1: ↓, 3: ↓');
    expect(grid().queryByText(rowLabel('Bass'))).not.toBeInTheDocument();
  });
  it('opens on the part, loop and tempo of a practice link and writes them back', () => {
    renderWithIntl(
      <SongCardView
        songId="s1"
        review={REVIEW}
        card={card}
        isTeacher
        start={{ part: 1, isLooping: true, rate: 1, source: 'recording' }}
        linkPath="/card"
      />
    );
    expect(parts().getByRole('button', { name: /verse/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Loop part' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('song-card-loop')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Practice link' })).toBeInTheDocument();
  });

  it('gives a student no practice link', () => {
    renderWithIntl(
      <SongCardView
        songId="s1"
        review={REVIEW}
        card={card}
        isTeacher={false}
        start={START}
        linkPath={null}
      />
    );
    expect(screen.queryByRole('button', { name: 'Practice link' })).not.toBeInTheDocument();
  });
  it('switches to the backing track: tempo becomes a 40–100% slider and play is ready at once', () => {
    renderWithIntl(
      <SongCardView
        songId="s1"
        review={REVIEW}
        card={card}
        isTeacher
        start={START}
        linkPath="/card"
      />
    );
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Backing' }));
    expect(screen.getByRole('button', { name: 'Backing' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('slider', { name: 'Backing tempo in percent' })).toHaveValue('70');
    expect(screen.getByText('70% · 81 BPM')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play' })).toBeEnabled();
  });
  it('lets the teacher approve a group of parts and correct a bar of it', async () => {
    const { saveSongCardReview } = jest.requireMock('@/app/dashboard/songs/[id]/card/actions');
    saveSongCardReview.mockImplementation((_s: string, _v: string, patch: { kind: string }) =>
      Promise.resolve({
        review:
          patch.kind === 'approve'
            ? { ...REVIEW, approvedGroups: ['verse:I'] }
            : { ...REVIEW, approvedGroups: ['verse:I'], chordEdits: { 3: 'G' } },
      })
    );
    renderWithIntl(
      <SongCardView
        songId="s1"
        review={REVIEW}
        card={card}
        isTeacher
        start={START}
        linkPath="/card"
      />
    );
    fireEvent.click(parts().getByRole('button', { name: /verse/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve chords' }));
    expect(await screen.findByText(/Chords approved/)).toBeInTheDocument();
    expect(saveSongCardReview).toHaveBeenCalledWith('s1', 'bO28lB1uwp4', {
      kind: 'approve',
      group: 'verse:I',
      isApproved: true,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Correct' }));
    fireEvent.click(chart().getAllByRole('button', { name: /^Bar \d+/ })[0]);
    expect(saveSongCardReview).toHaveBeenLastCalledWith('s1', 'bO28lB1uwp4', {
      kind: 'chord',
      bar: 3,
      chord: 'G',
    });
    expect(await chart().findByRole('button', { name: 'Bar 4: G' })).toBeInTheDocument();
  });

  it('puts the stored version back and says so when a save fails', async () => {
    const { saveSongCardReview } = jest.requireMock('@/app/dashboard/songs/[id]/card/actions');
    saveSongCardReview.mockResolvedValue({ error: 'failed' });
    renderWithIntl(
      <SongCardView
        songId="s1"
        review={REVIEW}
        card={card}
        isTeacher
        start={START}
        linkPath="/card"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Approve chords' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be saved');
    expect(screen.getByRole('button', { name: 'Approve chords' })).toBeInTheDocument();
  });

  it('lets the teacher correct the strum of the part sixteenth by sixteenth', () => {
    renderWithIntl(
      <SongCardView
        songId="s1"
        review={REVIEW}
        card={card}
        isTeacher
        start={START}
        linkPath="/card"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Correct strum' }));
    expect(screen.getAllByRole('button', { name: /^Sixteenth / })).toHaveLength(16);
    expect(screen.getByRole('button', { name: 'Sixteenth 2 (e): –' })).toBeInTheDocument();
  });
});
