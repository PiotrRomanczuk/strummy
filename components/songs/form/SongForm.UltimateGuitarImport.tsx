'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { SongFormUltimateGuitarImportSummary } from './SongForm.UltimateGuitarImport.Summary';
import { isEmptyDraft, parseUltimateGuitarPaste } from './ultimate-guitar.helpers';
import type { UltimateGuitarDraft } from './ultimate-guitar.types';

const boxStyle: React.CSSProperties = {
  background: 'var(--gold-tint)',
  border: '1px solid var(--gold-dim)',
  borderRadius: 10,
  padding: 14,
  marginBottom: 20,
};
const headingStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 11,
  color: 'var(--gold-2)',
  textTransform: 'uppercase',
  letterSpacing: '.12em',
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  textAlign: 'left',
};
const textareaStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 10,
  padding: '9px 12px',
  minHeight: 120,
  resize: 'vertical',
  border: '1px solid var(--gold-dim)',
  borderRadius: 6,
  background: 'var(--card)',
  fontFamily: 'var(--mono)',
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--ink)',
};
const buttonStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 6,
  border: '1px solid var(--rule)',
  background: 'var(--card)',
  fontSize: 12,
  fontFamily: 'var(--mono)',
  cursor: 'pointer',
};
const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  border: '1px solid var(--gold-2)',
  color: 'var(--gold-2)',
};

type Props = { onApply: (draft: UltimateGuitarDraft) => void };

/** Paste an Ultimate Guitar page, see what was recognised, then fill the form.
 * Parsing is local — UG blocks scraping, so the page text is the input. */
export const SongFormUltimateGuitarImport = ({ onApply }: Props) => {
  const t = useTranslations('Songs');
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<UltimateGuitarDraft | null>(null);

  const reset = () => {
    setText('');
    setDraft(null);
  };

  const apply = () => {
    if (draft) onApply(draft);
    reset();
    setIsOpen(false);
  };

  const nothingFound = draft !== null && isEmptyDraft(draft);

  return (
    <div style={boxStyle}>
      <button
        type="button"
        style={headingStyle}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        {t('ugImportHeading')} {isOpen ? '−' : '+'}
      </button>

      {isOpen && (
        <>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setDraft(null);
            }}
            placeholder={t('ugImportPlaceholder')}
            style={textareaStyle}
            aria-label={t('ugImportHeading')}
          />

          {nothingFound && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-3)' }}>
              {t('ugImportNothingFound')}
            </div>
          )}

          {draft && !nothingFound && <SongFormUltimateGuitarImportSummary draft={draft} />}

          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            {!draft && (
              <button
                type="button"
                style={primaryButtonStyle}
                disabled={text.trim().length === 0}
                onClick={() => setDraft(parseUltimateGuitarPaste(text))}
              >
                {t('ugImportParseButton')}
              </button>
            )}
            {draft && !nothingFound && (
              <button type="button" style={primaryButtonStyle} onClick={apply}>
                {t('ugImportApplyButton')}
              </button>
            )}
            {text.length > 0 && (
              <button type="button" style={buttonStyle} onClick={reset}>
                {t('ugImportDiscardButton')}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
