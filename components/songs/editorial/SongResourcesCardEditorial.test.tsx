import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { SongResourcesCardEditorial } from './SongResourcesCardEditorial';
import type { Song } from '@/components/songs/types';

const noLinks = {
  youtube_url: null,
  spotify_link_url: null,
  ultimate_guitar_link: null,
  tiktok_short_url: null,
} as Song;

describe('SongResourcesCardEditorial', () => {
  it('renders nothing when the song has no external links', () => {
    const { container } = render(<SongResourcesCardEditorial song={noLinks} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when links are blank/whitespace', () => {
    const { container } = render(
      <SongResourcesCardEditorial song={{ ...noLinks, youtube_url: '   ' } as Song} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a labelled link for each present resource with the right href', () => {
    render(
      <SongResourcesCardEditorial
        song={
          {
            youtube_url: 'https://youtube.com/watch?v=abc',
            spotify_link_url: 'https://open.spotify.com/track/xyz',
            ultimate_guitar_link: null,
            tiktok_short_url: null,
          } as Song
        }
      />
    );
    const yt = screen.getByRole('link', { name: /YouTube/ });
    expect(yt).toHaveAttribute('href', 'https://youtube.com/watch?v=abc');
    expect(yt).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: /Spotify/ })).toHaveAttribute(
      'href',
      'https://open.spotify.com/track/xyz'
    );
    // absent links are not rendered
    expect(screen.queryByRole('link', { name: /Ultimate Guitar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /TikTok/ })).not.toBeInTheDocument();
  });
});
