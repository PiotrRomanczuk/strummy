import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderServerTree } from '@/lib/testing/intl-test-utils';

import { SongLyricsCard } from './SongLyricsCard';

describe('SongLyricsCard', () => {
  it('renders nothing when there are no lyrics', async () => {
    const { container } = await renderServerTree(<SongLyricsCard lyrics={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for whitespace-only lyrics', async () => {
    const { container } = await renderServerTree(<SongLyricsCard lyrics={'   \n  \n'} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the lyrics text when present', async () => {
    await renderServerTree(<SongLyricsCard lyrics={'C        G\nLyrics line one'} />);
    expect(screen.getByText('Lyrics')).toBeInTheDocument();
    expect(screen.getByText('Lyrics line one')).toBeInTheDocument();
  });

  it('lifts [Section] headers into labels with the brackets stripped', async () => {
    await renderServerTree(<SongLyricsCard lyrics={'[Verse 1]\nC\nsome words'} />);
    // Bracket-stripped, upper-cased via CSS (text content stays "Verse 1").
    expect(screen.getByText('Verse 1')).toBeInTheDocument();
    expect(screen.queryByText('[Verse 1]')).not.toBeInTheDocument();
  });

  it('preserves chord-line whitespace so alignment survives', async () => {
    // getByText collapses whitespace, so match on raw textContent to prove the
    // multiple spaces between chords are not lost.
    const chordLine = 'C        G';
    const { container } = await renderServerTree(<SongLyricsCard lyrics={`${chordLine}\nlyric`} />);
    const el = Array.from(container.querySelectorAll('div')).find(
      (d) => d.textContent === chordLine
    );
    expect(el).toBeDefined();
    expect(el).toHaveStyle({ whiteSpace: 'pre' });
  });
});
