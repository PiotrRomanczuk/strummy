import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

import { AlbumThumb } from './AlbumThumb';

const COVER = 'https://i.scdn.co/image/ab67616d0000b273abcdef';

describe('AlbumThumb', () => {
  it('lazy-loads the cover by default', () => {
    const { container } = render(<AlbumThumb songId="song-1" coverImageUrl={COVER} />);

    const img = container.querySelector('img');
    // Not cosmetic: 50 eager row thumbs against a remote CDN hold the window
    // `load` event open for tens of seconds (6 connections per host → 9 waves),
    // which is what timed the songs list out in the nightly E2E run.
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
  });

  it('loads eagerly when the caller asks for it', () => {
    const { container } = render(<AlbumThumb songId="song-1" coverImageUrl={COVER} eager />);

    expect(container.querySelector('img')).toHaveAttribute('loading', 'eager');
  });

  it('renders a gradient placeholder — and no request — when there is no cover', () => {
    const { container } = render(<AlbumThumb songId="song-1" coverImageUrl={null} />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});
