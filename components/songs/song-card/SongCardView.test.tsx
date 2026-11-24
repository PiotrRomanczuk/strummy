import { fireEvent, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderWithIntl } from '@/lib/testing/intl-test-utils';
import { songCardFromRows } from '@/lib/services/song-card-queries';
import type { SongCard } from '@/lib/music-theory/song-card';
import { CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW } from '@/lib/music-theory/song-card.fixture';

import { SongCardView } from './SongCardView';

const card = songCardFromRows(CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW) as SongCard;
const parts = () => within(screen.getByRole('group', { name: /parts|części/i }));
const chart = () => within(screen.getByRole('region', { name: /intro|verse|chorus|bars/i }));

describe('SongCardView', () => {
  it('opens on the first part with its bars as a chord chart', () => {
    renderWithIntl(<SongCardView card={card} isTeacher />);
    expect(parts().getAllByRole('button')).toHaveLength(3);
    expect(parts().getByRole('button', { name: /intro/i })).toHaveAttribute('aria-pressed', 'true');
    const bars = chart().getAllByRole('button');
    expect(bars.map((bar) => bar.getAttribute('aria-label'))).toEqual([
      'Bar 1: Am',
      'Bar 2: F',
      'Bar 3: C',
    ]);
    expect(bars[0]).toHaveAttribute('aria-current', 'true');
  });

  it('moves to a part when it is clicked, with its degrees for the teacher', () => {
    renderWithIntl(<SongCardView card={card} isTeacher />);
    fireEvent.click(parts().getByRole('button', { name: /verse/i }));
    const bars = chart().getAllByRole('button');
    expect(bars).toHaveLength(5);
    expect(bars[0]).toHaveAttribute('aria-current', 'true');
    expect(bars[0]).toHaveTextContent('I');
  });

  it('marks the clicked bar and writes a mid-bar change as two chords', () => {
    renderWithIntl(<SongCardView card={card} isTeacher={false} />);
    fireEvent.click(parts().getByRole('button', { name: /chorus/i }));
    const [bar] = chart().getAllByRole('button');
    expect(bar).toHaveAccessibleName('Bar 9: F G');
    expect(bar).toHaveAttribute('aria-current', 'true');
    expect(bar).not.toHaveTextContent('IV');
  });

  it('steps through the bars from the timeline with the arrow keys', () => {
    renderWithIntl(<SongCardView card={card} isTeacher />);
    const timeline = screen.getByRole('slider');
    fireEvent.keyDown(timeline, { key: 'ArrowRight' });
    fireEvent.keyDown(timeline, { key: 'ArrowRight' });
    expect(timeline).toHaveAttribute('aria-valuetext', expect.stringMatching(/bar 3$/));
  });

  it('pages through the bars when the analysis has no parts', () => {
    renderWithIntl(<SongCardView card={{ ...card, parts: [] }} isTeacher />);
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bars 1–9 of 9' })).toBeInTheDocument();
  });

  it('shows the chord now, the next change and the shapes of the part', () => {
    renderWithIntl(<SongCardView card={card} isTeacher />);
    const now = within(screen.getByRole('region', { name: 'Playing now' }));
    expect(now.getAllByText('Am')[0]).toHaveAttribute('aria-live', 'polite');
    expect(now.getByText('Then, in one bar')).toBeInTheDocument();
    const shapes = now.getByRole('list', { name: 'Shapes of this part' });
    expect(within(shapes).getAllByRole('listitem')).toHaveLength(3);
    expect(within(shapes).getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'true');
  });

  it('gives the teacher the bass and drums of the bar, the student only chord and strum', () => {
    const { unmount } = renderWithIntl(<SongCardView card={card} isTeacher />);
    fireEvent.click(parts().getByRole('button', { name: /verse/i }));
    const grid = () => within(screen.getByRole('region', { name: /^Bar \d+$/ }));
    const rowLabel = (label: string) => (_: string, el: Element | null) =>
      el?.tagName === 'SPAN' && el.firstChild?.textContent === label;
    expect(grid().getByText(rowLabel('Bass'))).toHaveTextContent('Bass: 1: C');
    expect(grid().getByText('Bass and drums · approximate')).toBeInTheDocument();
    unmount();
    renderWithIntl(<SongCardView card={card} isTeacher={false} />);
    fireEvent.click(parts().getByRole('button', { name: /verse/i }));
    expect(grid().getByText(rowLabel('Strum'))).toHaveTextContent('Strum: 1: ↓, 3: ↓');
    expect(grid().queryByText(rowLabel('Bass'))).not.toBeInTheDocument();
  });
});
