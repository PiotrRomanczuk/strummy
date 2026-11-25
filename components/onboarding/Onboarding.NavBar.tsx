/**
 * Bottom navigation bar for the onboarding wizard. Presentational —
 * the parent owns the step machinery. Hover styling in `ui-onb-*` classes.
 */
import { useTranslations } from 'next-intl';

type Props = {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  canNext: boolean;
  isSaving?: boolean;
  error?: string;
};

export const OnboardingNavBar = ({
  onBack,
  onNext,
  nextLabel,
  canNext,
  isSaving = false,
  error,
}: Props) => {
  const t = useTranslations('Onboarding');
  return (
    <div style={{ marginTop: 'auto', paddingTop: 24 }}>
      {error && (
        <div
          role="alert"
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 12,
            color: 'var(--danger)',
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={isSaving}
            className="ui-onb-back"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--ink-4)',
              fontSize: 13,
              cursor: isSaving ? 'wait' : 'pointer',
              fontFamily: 'var(--sans)',
            }}
          >
            ← {t('nav.back')}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext || isSaving}
          className="ui-onb-primary"
          style={{
            padding: '12px 22px',
            borderRadius: 8,
            border: 'none',
            background: !canNext || isSaving ? 'var(--ink-4)' : 'var(--ink)',
            color: 'var(--paper)',
            fontSize: 14,
            fontWeight: 500,
            cursor: !canNext || isSaving ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--sans)',
          }}
        >
          {isSaving ? t('nav.saving') : `${nextLabel} →`}
        </button>
      </div>
    </div>
  );
};
