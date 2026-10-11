'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

type Props = {
  numeral: string;
  title: string;
  count?: number;
  populated?: number;
  /** Sections start open; pass false for optional, rarely-used ones. */
  defaultOpen?: boolean;
  children: ReactNode;
};

const headerStyle = (isOpen: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  width: '100%',
  padding: '16px 22px',
  cursor: 'pointer',
  background: 'transparent',
  border: 'none',
  borderBottom: isOpen ? '1px solid var(--rule)' : 'none',
  textAlign: 'left',
  color: 'inherit',
});

const pillStyle = (populated: number): CSSProperties => ({
  fontSize: 11,
  padding: '2px 8px',
  borderRadius: 999,
  background: populated > 0 ? 'var(--gold-tint)' : 'var(--rule-2)',
  color: populated > 0 ? 'var(--gold-2)' : 'var(--ink-4)',
  fontFamily: 'var(--mono)',
  flexShrink: 0,
});

/**
 * Claude Design `SectionF`: a collapsible card whose header row carries the
 * numeral eyebrow, the serif title, an `n/m` fill pill and a chevron.
 */
export const FormSection = ({
  numeral,
  title,
  count,
  populated,
  defaultOpen = true,
  children,
}: Props) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const Chevron = isOpen ? ChevronDown : ChevronRight;

  return (
    <section
      className="ui-form-section"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--rule)',
        borderRadius: 14,
        marginBottom: 16,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        className="ui-form-section-head"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
        style={headerStyle(isOpen)}
      >
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--ink-4)',
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {numeral}
        </span>
        <span
          style={{
            flex: 1,
            fontFamily: 'var(--serif)',
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </span>
        {count !== undefined && (
          <span style={pillStyle(populated ?? 0)}>
            {populated ?? 0}/{count}
          </span>
        )}
        <Chevron size={14} strokeWidth={1.6} style={{ color: 'var(--ink-4)' }} aria-hidden="true" />
      </button>
      {/* Hidden rather than unmounted: collapsing a section must not drop the
          values typed into it, and its inputs still belong to the form. */}
      <div className="ui-form-section-body" hidden={!isOpen} style={{ padding: '18px 22px 22px' }}>
        {children}
      </div>
    </section>
  );
};
