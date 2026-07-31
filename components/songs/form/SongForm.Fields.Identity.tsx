'use client';

import { useTranslations } from 'next-intl';

import { Field } from './Field';

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--rule)',
  borderRadius: 6,
  background: 'var(--paper)',
  fontFamily: 'var(--sans)',
  fontSize: 14,
  color: 'var(--ink)',
};

type Props = {
  title: string;
  author: string;
  titleError?: string;
  authorError?: string;
  onTitle: (v: string) => void;
  onAuthor: (v: string) => void;
};

/** Section I — song title & author. */
export const SongFormFieldsIdentity = ({
  title,
  author,
  titleError,
  authorError,
  onTitle,
  onAuthor,
}: Props) => {
  const t = useTranslations('Songs');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label={t('formLabelTitle')} error={titleError} fieldId="title">
        <input
          name="title"
          required
          maxLength={200}
          placeholder={t('formTitlePlaceholder')}
          style={inputStyle}
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          aria-describedby={titleError ? 'error-title' : undefined}
        />
      </Field>
      <Field label={t('formLabelAuthor')} error={authorError} fieldId="author">
        <input
          name="author"
          required
          maxLength={100}
          placeholder={t('formAuthorPlaceholder')}
          style={inputStyle}
          value={author}
          onChange={(e) => onAuthor(e.target.value)}
          aria-describedby={authorError ? 'error-author' : undefined}
        />
      </Field>
    </div>
  );
};
