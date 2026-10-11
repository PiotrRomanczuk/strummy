'use client';

import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

export const WIZARD_STEPS = 4;
const NUMERALS = ['I', 'II', 'III', 'IV'];

type HeaderProps = {
  step: number;
  onStep: (step: number) => void;
  formId: string;
  isPending: boolean;
  onDraft: () => void;
};

/**
 * Song Form mobile (Claude Design, Direction B): "Canto I · Essentials" with a
 * four-segment stepper. Phones only — the desktop page keeps its own header.
 */
export const SongWizardHeader = ({ step, onStep, formId, isPending, onDraft }: HeaderProps) => {
  const t = useTranslations('Songs');
  return (
    <div className="ui-song-wizard-head md:hidden">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <Link
          href="/dashboard/songs"
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 14,
            color: 'var(--ink-3)',
            textDecoration: 'none',
          }}
        >
          {t('formCancelButton')}
        </Link>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--ink-4)',
            letterSpacing: '.14em',
            textTransform: 'uppercase',
          }}
        >
          {t('wizardNewSong')}
        </span>
        <button
          type="submit"
          form={formId}
          disabled={isPending}
          onClick={onDraft}
          style={{
            border: 'none',
            background: 'transparent',
            fontSize: 12,
            color: 'var(--gold-2)',
            fontWeight: 500,
            padding: 0,
            cursor: 'pointer',
          }}
        >
          {t('wizardDraft')}
        </button>
      </div>
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--serif)',
          fontWeight: 400,
          fontSize: 26,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        <em style={{ color: 'var(--gold-2)' }}>
          {t('wizardCanto', { numeral: NUMERALS[step - 1] })}
        </em>{' '}
        · {t(`wizardStep${step}`)}
      </h1>
      <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
        {NUMERALS.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={t('wizardGoToStep', { n: i + 1 })}
            aria-current={i + 1 === step ? 'step' : undefined}
            onClick={() => onStep(i + 1)}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              background:
                i + 1 === step ? 'var(--gold-2)' : i + 1 < step ? 'var(--ink-2)' : 'var(--rule-2)',
            }}
          />
        ))}
      </div>
    </div>
  );
};

type FooterProps = {
  step: number;
  onStep: (step: number) => void;
  formId: string;
  isPending: boolean;
  onCreate: () => void;
};

/** Fixed Back / Next bar; the last step's primary button submits the form. */
export const SongWizardFooter = ({ step, onStep, formId, isPending, onCreate }: FooterProps) => {
  const t = useTranslations('Songs');
  const isLast = step === WIZARD_STEPS;
  const primary = {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    background: 'var(--ink)',
    color: 'var(--paper)',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
  } as const;
  return (
    <div className="ui-song-wizard-foot md:hidden">
      <button
        type="button"
        disabled={step === 1}
        onClick={() => onStep(Math.max(1, step - 1))}
        style={{
          padding: '12px 18px',
          border: '1px solid var(--rule)',
          background: 'var(--card)',
          borderRadius: 10,
          fontSize: 13,
          color: 'var(--ink-2)',
          opacity: step === 1 ? 0.5 : 1,
        }}
      >
        {t('wizardBack')}
      </button>
      {isLast ? (
        // Distinct keys: reusing one <button> node let the Next click land on a
        // node that had just become type="submit", which submitted the form.
        <button
          key="create"
          type="submit"
          form={formId}
          disabled={isPending}
          onClick={onCreate}
          style={primary}
          data-testid="song-save-mobile"
        >
          <Check size={13} /> {isPending ? t('formSavingButton') : t('wizardCreate')}
        </button>
      ) : (
        <button key="next" type="button" onClick={() => onStep(step + 1)} style={primary}>
          {t('wizardNext')} <ArrowRight size={13} />
        </button>
      )}
    </div>
  );
};
