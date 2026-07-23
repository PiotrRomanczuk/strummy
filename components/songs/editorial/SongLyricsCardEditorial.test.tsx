import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { SongLyricsCardEditorial } from './SongLyricsCardEditorial';

describe('SongLyricsCardEditorial', () => {
  it('renders nothing when there are no lyrics', () => {
    const { container } = render(<SongLyricsCardEditorial lyrics={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for whitespace-only lyrics', () => {
    const { container } = render(<SongLyricsCardEditorial lyrics={'   \n  \n'} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the lyrics text when present', () => {
    render(<SongLyricsCardEditorial lyrics={'C        G\nLyrics line one'} />);
    expect(screen.getByText('Lyrics')).toBeInTheDocument();
    expect(screen.getByText('Lyrics line one')).toBeInTheDocument();
  });

  it('lifts [Section] headers into labels with the brackets stripped', () => {
    render(<SongLyricsCardEditorial lyrics={'[Verse 1]\nC\nsome words'} />);
    // Bracket-stripped, upper-cased via CSS (text content stays "Verse 1").
    expect(screen.getByText('Verse 1')).toBeInTheDocument();
    expect(screen.queryByText('[Verse 1]')).not.toBeInTheDocument();
  });

  it('preserves chord-line whitespace so alignment survives', () => {
    // getByText collapses whitespace, so match on raw textContent to prove the
    // multiple spaces between chords are not lost.
    const chordLine = 'C        G';
    const { container } = render(<SongLyricsCardEditorial lyrics={`${chordLine}\nlyric`} />);
    const el = Array.from(container.querySelectorAll('div')).find(
      (d) => d.textContent === chordLine
    );
    expect(el).toBeDefined();
    expect(el).toHaveStyle({ whiteSpace: 'pre' });
  });
});
