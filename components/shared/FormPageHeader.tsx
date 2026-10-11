import Link from 'next/link';
import type { ReactNode } from 'react';
import { Check, ChevronRight } from 'lucide-react';

type Props = {
  crumbLabel: string;
  crumbHref: string;
  current: string;
  /** Title node — pass `<>Schedule a <FormTitleAccent>lesson</FormTitleAccent>.</>`. */
  title: ReactNode;
  sub?: string;
  cancelHref: string;
  cancelLabel: string;
  submitLabel: string;
  /** `id` of the `<form>` the header's submit button belongs to. */
  formId: string;
  isSaving?: boolean;
  /** Extra secondary actions rendered between Cancel and the primary button. */
  extraActions?: ReactNode;
  /** Runs before the primary submit fires (e.g. clear a "save as draft" flag). */
  onSubmitClick?: () => void;
  /** data-testid for the primary submit button. */
  submitTestId?: string;
};

/** The one gold-italic word in a form title ("Schedule a *lesson*."). */
export const FormTitleAccent = ({ children }: { children: ReactNode }) => (
  <em style={{ fontStyle: 'italic', color: 'var(--gold-2)' }}>{children}</em>
);

export const formSecondaryButton = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid var(--rule)',
  background: 'var(--card)',
  color: 'var(--ink-2)',
  fontSize: 13,
  cursor: 'pointer',
  textDecoration: 'none',
  fontFamily: 'var(--sans)',
  display: 'inline-flex',
  alignItems: 'center',
} as const;

/**
 * Claude Design `FormHeader`: mono breadcrumb, 40px serif title with subtitle,
 * and Cancel + primary submit top-right. The submit is tied to the form by
 * `form={formId}` so it can sit outside the `<form>` element.
 */
export const FormPageHeader = ({
  crumbLabel,
  crumbHref,
  current,
  title,
  sub,
  cancelHref,
  cancelLabel,
  submitLabel,
  formId,
  isSaving = false,
  extraActions,
  onSubmitClick,
  submitTestId,
}: Props) => (
  <>
    <nav
      aria-label="Breadcrumb"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: 'var(--ink-4)',
        fontSize: 12,
        fontFamily: 'var(--mono)',
        marginBottom: 14,
      }}
    >
      <Link href={crumbHref} style={{ color: 'inherit', textDecoration: 'none' }}>
        {crumbLabel}
      </Link>
      <ChevronRight size={11} strokeWidth={1.6} aria-hidden="true" />
      <span style={{ color: 'var(--ink-2)' }}>{current}</span>
    </nav>
    <div className="ui-form-header">
      <div>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--serif)',
            fontWeight: 400,
            fontSize: 40,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {title}
        </h1>
        {sub && (
          <div style={{ color: 'var(--ink-3)', fontSize: 14, marginTop: 8, maxWidth: 520 }}>
            {sub}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Link href={cancelHref} style={formSecondaryButton}>
          {cancelLabel}
        </Link>
        {extraActions}
        <button
          type="submit"
          form={formId}
          disabled={isSaving}
          onClick={onSubmitClick}
          data-testid={submitTestId}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--ink)',
            color: 'var(--paper)',
            fontSize: 13,
            cursor: isSaving ? 'wait' : 'pointer',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--sans)',
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          <Check size={13} strokeWidth={2} aria-hidden="true" />
          {submitLabel}
        </button>
      </div>
    </div>
  </>
);
