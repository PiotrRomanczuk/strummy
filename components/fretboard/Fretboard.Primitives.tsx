import { sectionLabel } from './fretboard.styles';

/** Pill-shaped segmented control — the design's mode / accidental / style switch. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  testId,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; ariaLabel?: string }[];
  size?: 'sm' | 'md';
  testId: string;
  label?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      style={{
        display: 'inline-flex',
        background: 'var(--rule-2)',
        borderRadius: 999,
        padding: 2,
        gap: 2,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className="ui-fb-seg"
            data-testid={`${testId}-${option.value}`}
            data-active={active}
            aria-pressed={active}
            aria-label={option.ariaLabel}
            onClick={() => onChange(option.value)}
            style={{
              border: 'none',
              background: active ? 'var(--card)' : 'transparent',
              color: active ? 'var(--ink)' : 'var(--ink-3)',
              padding: size === 'sm' ? '3px 9px' : '5px 12px',
              borderRadius: 999,
              fontSize: size === 'sm' ? 11 : 12,
              fontWeight: active ? 500 : 400,
              fontFamily: 'var(--sans)',
              cursor: 'pointer',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export const Group = ({
  label,
  aside,
  children,
}: {
  label: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}
    >
      <div style={sectionLabel}>{label}</div>
      {aside}
    </div>
    {children}
  </div>
);

export const Toggle = ({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) => (
  <button
    type="button"
    data-testid={`fb-toggle-${id}`}
    aria-pressed={value}
    onClick={() => onChange(!value)}
    style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '8px 0',
      borderBottom: '1px solid var(--rule)',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontSize: 13,
      textAlign: 'left',
      color: 'var(--ink-2)',
    }}
  >
    <span>
      {label}
      {hint && (
        <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>
          {hint}
        </span>
      )}
    </span>
    <span
      style={{
        width: 36,
        height: 20,
        borderRadius: 999,
        background: value ? 'var(--gold)' : 'var(--ink-5)',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: value ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#fff',
        }}
      />
    </span>
  </button>
);
