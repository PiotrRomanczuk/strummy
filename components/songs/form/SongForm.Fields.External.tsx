'use client';

import { useTranslations } from 'next-intl';

import { Field } from './Field';
import { openableHref } from './external-link.helpers';
import { filled, songMonoInput } from './song-form.styles';

type Props = {
  youtubeUrl: string;
  spotifyLinkUrl: string;
  ultimateGuitarLink: string;
  tiktokShortUrl: string;
  onYoutubeUrl: (v: string) => void;
  onSpotifyLinkUrl: (v: string) => void;
  onUltimateGuitarLink: (v: string) => void;
  onTiktokShortUrl: (v: string) => void;
};

type LinkRow = {
  name: string;
  labelKey: string;
  placeholderKey: string;
  dot: string;
  value: string;
  onChange: (v: string) => void;
};

/** Section II · Resources — four links, each with its brand dot inside the input. */
export const SongFormFieldsExternal = (p: Props) => {
  const t = useTranslations('Songs');
  const rows: LinkRow[] = [
    {
      name: 'youtube_url',
      labelKey: 'formLabelYoutubeUrl',
      placeholderKey: 'formYoutubeUrlPlaceholder',
      dot: 'var(--brand-youtube)',
      value: p.youtubeUrl,
      onChange: p.onYoutubeUrl,
    },
    {
      name: 'spotify_link_url',
      labelKey: 'formLabelSpotifyLink',
      placeholderKey: 'formSpotifyLinkPlaceholder',
      dot: 'var(--brand-spotify)',
      value: p.spotifyLinkUrl,
      onChange: p.onSpotifyLinkUrl,
    },
    {
      name: 'ultimate_guitar_link',
      labelKey: 'formLabelUltimateGuitar',
      placeholderKey: 'formUltimateGuitarPlaceholder',
      dot: 'var(--brand-soundcloud)',
      value: p.ultimateGuitarLink,
      onChange: p.onUltimateGuitarLink,
    },
    {
      name: 'tiktok_short_url',
      labelKey: 'formLabelTiktokShort',
      placeholderKey: 'formTiktokShortPlaceholder',
      dot: 'var(--ink)',
      value: p.tiktokShortUrl,
      onChange: p.onTiktokShortUrl,
    },
  ];

  return (
    <div className="ui-form-row-2" style={{ gap: 16 }}>
      {rows.map((r) => (
        <Field key={r.name} label={t(r.labelKey)} openHref={openableHref(r.value)}>
          <div style={{ position: 'relative' }}>
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: r.dot,
                boxShadow: `0 0 0 3px ${r.dot}22`,
              }}
            />
            <input
              name={r.name}
              type="url"
              value={r.value}
              placeholder={t(r.placeholderKey)}
              aria-label={t(r.labelKey)}
              style={{ ...filled(songMonoInput, Boolean(r.value)), paddingLeft: 30, fontSize: 12 }}
              onChange={(e) => r.onChange(e.target.value)}
            />
          </div>
        </Field>
      ))}
    </div>
  );
};
