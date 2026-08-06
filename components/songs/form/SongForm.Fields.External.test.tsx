import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithIntl } from '@/lib/testing/intl-test-utils';
import { SongFormFieldsExternal } from './SongForm.Fields.External';

const noop = () => {};

const baseProps = {
  category: '',
  youtubeUrl: '',
  spotifyLinkUrl: '',
  ultimateGuitarLink: '',
  tiktokShortUrl: '',
  onCategory: noop,
  onYoutubeUrl: noop,
  onSpotifyLinkUrl: noop,
  onUltimateGuitarLink: noop,
  onTiktokShortUrl: noop,
};

describe('SongFormFieldsExternal open-link affordance', () => {
  it('renders no open links when every URL field is empty', () => {
    renderWithIntl(<SongFormFieldsExternal {...baseProps} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders one open link per populated URL field, pointing at that URL', () => {
    renderWithIntl(
      <SongFormFieldsExternal
        {...baseProps}
        ultimateGuitarLink="https://tabs.ultimate-guitar.com/tab/oasis/wonderwall-27596"
        spotifyLinkUrl="https://open.spotify.com/track/abc"
      />
    );

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      'https://open.spotify.com/track/abc',
      'https://tabs.ultimate-guitar.com/tab/oasis/wonderwall-27596',
    ]);
  });

  it('opens in a new tab without leaking the opener', () => {
    renderWithIntl(<SongFormFieldsExternal {...baseProps} youtubeUrl="https://youtu.be/xyz" />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders no link while the field holds a half-typed URL', () => {
    renderWithIntl(
      <SongFormFieldsExternal {...baseProps} ultimateGuitarLink="tabs.ultimate-gui" />
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders no link for a javascript: payload', () => {
    renderWithIntl(<SongFormFieldsExternal {...baseProps} tiktokShortUrl="javascript:alert(1)" />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
