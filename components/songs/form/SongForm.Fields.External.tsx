'use client';

import { useTranslations } from 'next-intl';

import { Field } from './Field';
import { openableHref } from './external-link.helpers';

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--rule)',
  borderRadius: 6,
  background: 'var(--paper)',
  fontFamily: 'var(--sans)',
  fontSize: 14,
  color: 'var(--ink)',
} as const;

const COMMON_CATEGORIES = [
  'Rock',
  'Pop',
  'Folk',
  'Blues',
  'Metal',
  'Jazz',
  'Country',
  'Classical',
  'Singer-Songwriter',
];

const CATEGORY_SUGGESTIONS = (
  <datalist id="song-category-suggestions">
    {COMMON_CATEGORIES.map((c) => (
      <option key={c} value={c} />
    ))}
  </datalist>
);

type Props = {
  category: string;
  youtubeUrl: string;
  spotifyLinkUrl: string;
  ultimateGuitarLink: string;
  tiktokShortUrl: string;
  onCategory: (v: string) => void;
  onYoutubeUrl: (v: string) => void;
  onSpotifyLinkUrl: (v: string) => void;
  onUltimateGuitarLink: (v: string) => void;
  onTiktokShortUrl: (v: string) => void;
};

/** Category + external reference links (all optional). */
export const SongFormFieldsExternal = ({
  category,
  youtubeUrl,
  spotifyLinkUrl,
  ultimateGuitarLink,
  tiktokShortUrl,
  onCategory,
  onYoutubeUrl,
  onSpotifyLinkUrl,
  onUltimateGuitarLink,
  onTiktokShortUrl,
}: Props) => {
  const t = useTranslations('Songs');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {CATEGORY_SUGGESTIONS}
      <Field label={t('formLabelCategory')} optional>
        <input
          name="category"
          list="song-category-suggestions"
          value={category}
          placeholder={t('formCategoryPlaceholder')}
          style={inputStyle}
          onChange={(e) => onCategory(e.target.value)}
        />
      </Field>
      <div className="ui-form-row-2">
        <Field label={t('formLabelYoutubeUrl')} optional openHref={openableHref(youtubeUrl)}>
          <input
            name="youtube_url"
            type="url"
            value={youtubeUrl}
            placeholder={t('formYoutubeUrlPlaceholder')}
            style={inputStyle}
            onChange={(e) => onYoutubeUrl(e.target.value)}
          />
        </Field>
        <Field label={t('formLabelSpotifyLink')} optional openHref={openableHref(spotifyLinkUrl)}>
          <input
            name="spotify_link_url"
            type="url"
            value={spotifyLinkUrl}
            placeholder={t('formSpotifyLinkPlaceholder')}
            style={inputStyle}
            onChange={(e) => onSpotifyLinkUrl(e.target.value)}
          />
        </Field>
      </div>
      <div className="ui-form-row-2">
        <Field
          label={t('formLabelUltimateGuitar')}
          optional
          openHref={openableHref(ultimateGuitarLink)}
        >
          <input
            name="ultimate_guitar_link"
            type="url"
            value={ultimateGuitarLink}
            placeholder={t('formUltimateGuitarPlaceholder')}
            style={inputStyle}
            onChange={(e) => onUltimateGuitarLink(e.target.value)}
          />
        </Field>
        <Field label={t('formLabelTiktokShort')} optional openHref={openableHref(tiktokShortUrl)}>
          <input
            name="tiktok_short_url"
            type="url"
            value={tiktokShortUrl}
            placeholder={t('formTiktokShortPlaceholder')}
            style={inputStyle}
            onChange={(e) => onTiktokShortUrl(e.target.value)}
          />
        </Field>
      </div>
    </div>
  );
};
