/**
 * Bottom navigation bar for the editorial onboarding wizard. Presentational —
 * the parent owns the step machinery. Hover styling in `ed-onb-*` classes.
 */

type Props = {
  onBack?: () => void;
  onNext: () => void;
  backLabel?: string;
  nextLabel: string;
  canNext: boolean;
  isSaving?: boolean;
  error?: string;
};

export const OnboardingNavBar = ({
  onBack,
  onNext,
  backLabel = 'Back',
  nextLabel,
  canNext,
  isSaving = false,
  error,
}: Props) => (
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
          className="ed-onb-back"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--ink-4)',
            fontSize: 13,
            cursor: isSaving ? 'wait' : 'pointer',
            fontFamily: 'var(--sans)',
          }}
        >
          ← {backLabel}
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext || isSaving}
        className="ed-onb-primary"
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
        {isSaving ? 'Saving…' : `${nextLabel} →`}
      </button>
    </div>
  </div>
);
