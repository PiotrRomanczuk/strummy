'use client';

import { useTranslations } from 'next-intl';
import { LYRICS_MAX_LENGTH } from '@/schemas/CommonSchema';

import { Field } from './Field';

type Props = { value: string; onChange: (v: string) => void; error?: string };

/** Controlled monospace tablature editor (`songs.tab_notation`), shared by the
 * create and edit forms. Filled by the Ultimate Guitar import from "tabs" pages. */
export const SongFormFieldsTabs = ({ value, onChange, error }: Props) => {
  const t = useTranslations('Songs');

  return (
    <Field label={t('formTabsLabel')} hint={t('formTabsHint')} error={error} fieldId="tabs">
      <textarea
        name="tab_notation"
        maxLength={LYRICS_MAX_LENGTH}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('formTabsPlaceholder')}
        className="block min-h-[140px] w-full resize-y rounded-lg border border-[var(--rule)] bg-[var(--card)] px-3 py-2 font-mono text-xs leading-[1.7] text-[var(--ink)] outline-none"
        aria-describedby={error ? 'error-tabs' : undefined}
      />
    </Field>
  );
};
