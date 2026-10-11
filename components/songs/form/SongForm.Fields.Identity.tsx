'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import {
  SONG_LEVELS,
  LEVEL_LABEL_KEYS,
  type SongLevel,
} from '@/components/shared/level-label.helpers';
import { Field } from './Field';
import { SongFormKeySelect } from './SongForm.KeySelect';
import { filled, songInput, songSegmentBtn } from './song-form.styles';

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

type Props = {
  title: string;
  author: string;
  level: SongLevel;
  keyName: string;
  category: string;
  titleError?: string;
  authorError?: string;
  levelError?: string;
  keyError?: string;
  /** The duplicate-song warning, rendered at the foot of the section. */
  warning?: ReactNode;
  onTitle: (v: string) => void;
  onAuthor: (v: string) => void;
  onLevel: (v: SongLevel) => void;
  onKey: (v: string) => void;
  onCategory: (v: string) => void;
};

/** Section I · Essentials — Title | Artist, then Difficulty | Key | Category. */
export const SongFormFieldsIdentity = (p: Props) => {
  const t = useTranslations('Songs');

  return (
    <>
      <div className="ui-form-row-2" style={{ gap: 16, marginBottom: 16 }}>
        <Field label={t('formLabelTitle')} required error={p.titleError} fieldId="title">
          <input
            className="ui-song-title-input"
            name="title"
            required
            maxLength={200}
            placeholder={t('formTitlePlaceholder')}
            style={filled(songInput, Boolean(p.title))}
            value={p.title}
            onChange={(e) => p.onTitle(e.target.value)}
            aria-describedby={p.titleError ? 'error-title' : undefined}
          />
        </Field>
        <Field label={t('formLabelArtistAuthor')} required error={p.authorError} fieldId="author">
          <input
            className="ui-song-author-input"
            name="author"
            required
            maxLength={100}
            placeholder={t('formAuthorPlaceholder')}
            style={filled(songInput, Boolean(p.author))}
            value={p.author}
            onChange={(e) => p.onAuthor(e.target.value)}
            aria-describedby={p.authorError ? 'error-author' : undefined}
          />
        </Field>
      </div>

      <div className="ui-form-row-3" style={{ gap: 16 }}>
        <Field label={t('formLabelDifficulty')} required error={p.levelError} fieldId="level">
          <input type="hidden" name="level" value={p.level} />
          {/* Four levels (the app adds "Starter" to the mockup's three) — a 2×2
              grid keeps every label whole instead of ellipsising them in a row. */}
          <div
            className="ui-song-level-grid"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}
          >
            {SONG_LEVELS.map((l) => (
              <button
                type="button"
                className="ui-song-level-btn"
                key={l}
                onClick={() => p.onLevel(l)}
                aria-pressed={p.level === l}
                title={t(LEVEL_LABEL_KEYS[l])}
                style={songSegmentBtn(p.level === l)}
              >
                {t(LEVEL_LABEL_KEYS[l])}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t('formLabelMusicalKey')} required error={p.keyError} fieldId="key">
          <SongFormKeySelect value={p.keyName} onChange={p.onKey} hasError={Boolean(p.keyError)} />
        </Field>
        <Field label={t('formLabelCategory')} hint={t('formCategoryHint')}>
          <datalist id="song-category-suggestions">
            {COMMON_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <input
            name="category"
            list="song-category-suggestions"
            value={p.category}
            placeholder={t('formCategoryPlaceholder')}
            style={songInput}
            onChange={(e) => p.onCategory(e.target.value)}
          />
        </Field>
      </div>
      {p.warning}
    </>
  );
};
